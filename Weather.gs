/**
 * 中央氣象局 F-C0032-001（未來 36 小時，3 段 12 小時預報）。
 * https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001
 */

var WEATHER_CACHE_KEY = 'weather:v1';
var WEATHER_CACHE_TTL = 600; // 10 分鐘

function fetchWeather_() {
  var cache = CacheService.getScriptCache();
  var location = getProp_(PROP_KEYS.WEATHER_LOCATION);
  var cacheKey = WEATHER_CACHE_KEY + ':' + location;
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) { /* fallthrough */ }
  }

  var apiKey = getProp_(PROP_KEYS.CWA_API_KEY);
  if (!apiKey) throw new Error('CWA_API_KEY not set in PropertiesService');

  var url = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/F-C0032-001'
    + '?Authorization=' + encodeURIComponent(apiKey)
    + '&format=JSON'
    + '&locationName=' + encodeURIComponent(location);

  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var code = resp.getResponseCode();
  var body = resp.getContentText();
  if (code !== 200) {
    throw new Error('CWA API ' + code + ': ' + body.substring(0, 200));
  }

  var json = JSON.parse(body);
  var loc = json && json.records && json.records.location && json.records.location[0];
  if (!loc) throw new Error('CWA API: location not found in response');

  var elements = {};
  loc.weatherElement.forEach(function (el) { elements[el.elementName] = el.time; });

  var blocks = [];
  var slots = (elements.Wx || elements.MinT || []).length;
  for (var i = 0; i < slots; i++) {
    var wx   = elements.Wx   ? elements.Wx[i]   : null;
    var pop  = elements.PoP  ? elements.PoP[i]  : null;
    var minT = elements.MinT ? elements.MinT[i] : null;
    var maxT = elements.MaxT ? elements.MaxT[i] : null;
    var ci   = elements.CI   ? elements.CI[i]   : null;

    var startISO = wx ? wx.startTime : (minT && minT.startTime);
    var endISO   = wx ? wx.endTime   : (minT && minT.endTime);

    blocks.push({
      start:  startISO,
      end:    endISO,
      label:  labelForBlock_(startISO),
      wx:     wx ? readParam_(wx.parameter, 'parameterName') : '',
      wxCode: wx ? toInt_(readParam_(wx.parameter, 'parameterValue')) : null,
      icon:   wxIcon_(wx ? toInt_(readParam_(wx.parameter, 'parameterValue')) : null),
      pop:    pop  ? toInt_(readParam_(pop.parameter,  'parameterName'))  : null,
      minT:   minT ? toInt_(readParam_(minT.parameter, 'parameterName')) : null,
      maxT:   maxT ? toInt_(readParam_(maxT.parameter, 'parameterName')) : null,
      ci:     ci   ? readParam_(ci.parameter, 'parameterName') : ''
    });
  }

  var result = {
    location: loc.locationName,
    issued:   new Date().toISOString(),
    blocks:   blocks
  };

  try { cache.put(cacheKey, JSON.stringify(result), WEATHER_CACHE_TTL); } catch (_) {}
  return result;
}

function readParam_(parameter, key) {
  if (!parameter) return '';
  // CWA 有時候 parameterName 放數值、parameterValue 放數值代碼，反之亦然。
  // 這個 helper 取指定 key，沒有就 fallback 到另一個。
  if (parameter[key] !== undefined && parameter[key] !== '') return parameter[key];
  if (key === 'parameterName' && parameter.parameterValue) return parameter.parameterValue;
  if (key === 'parameterValue' && parameter.parameterName) return parameter.parameterName;
  return '';
}

function toInt_(v) {
  if (v === '' || v === null || v === undefined) return null;
  var n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

/**
 * 把 CWA Wx 編號（1~42）粗略歸到 4 種圖示：sun / partly / cloud / rain。
 * 編號參考：https://opendata.cwa.gov.tw/opendatadoc/Opendata_City.pdf
 */
function wxIcon_(code) {
  if (code === null) return 'cloud';
  if (code === 1) return 'sun';
  if (code >= 2 && code <= 3) return 'partly';
  if (code >= 4 && code <= 7) return 'cloud';
  // 8 之後幾乎都是雨/雷/雪/霧；統一畫雨
  return 'rain';
}

/**
 * 預報區段起始時間 → 中文標籤。
 * 06–18 為白天、其餘為夜間；用今天 / 明天判定。
 */
function labelForBlock_(startISO) {
  if (!startISO) return '';
  var start = new Date(startISO.replace(' ', 'T'));
  var tz = Session.getScriptTimeZone() || 'Asia/Taipei';
  var startDay = Utilities.formatDate(start, tz, 'yyyyMMdd');
  var todayDay = Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
  var isToday = (startDay === todayDay);
  var hour = parseInt(Utilities.formatDate(start, tz, 'H'), 10);
  var daytime = (hour >= 6 && hour < 18);
  if (isToday) return daytime ? '今日白天' : '今晚';
  return daytime ? '明日白天' : '明晚';
}
