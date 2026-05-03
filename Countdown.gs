/**
 * 倒數日：從 Google Sheet 讀取，欄位 title / date / repeat。
 * repeat = "yes" 視為年循環倒數，會額外算「已過 X 年 Y 月」（無條件捨去）。
 */

var COUNTDOWN_CACHE_KEY = 'countdown:v1';
var COUNTDOWN_CACHE_TTL = 300; // 5 分鐘

function fetchCountdowns_() {
  var cache = CacheService.getScriptCache();
  var sheetId = getProp_(PROP_KEYS.COUNTDOWN_SHEET_ID);
  var gid     = getProp_(PROP_KEYS.COUNTDOWN_SHEET_GID, '0');
  if (!sheetId) throw new Error('COUNTDOWN_SHEET_ID not set in PropertiesService');

  var cacheKey = COUNTDOWN_CACHE_KEY + ':' + sheetId + ':' + gid;
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) { /* fallthrough */ }
  }

  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = pickSheetByGid_(ss, gid);
  if (!sheet) throw new Error('Sheet GID ' + gid + ' not found in ' + sheetId);

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { events: [] };

  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var iTitle  = findCol_(headers, ['title', 'name', '名稱', '標題']);
  var iDate   = findCol_(headers, ['date', '日期']);
  var iRepeat = findCol_(headers, ['repeat', 'yearly', '循環', '年循環']);
  if (iTitle < 0 || iDate < 0) {
    throw new Error('Sheet missing required columns. Need: title, date, repeat. Got: ' + headers.join(', '));
  }

  var today = stripTime_(new Date());
  var events = [];

  for (var r = 1; r < values.length; r++) {
    var row = values[r];
    var title = String(row[iTitle] || '').trim();
    var rawDate = row[iDate];
    if (!title || !rawDate) continue;

    var date = parseDateCell_(rawDate);
    if (!date) continue;

    var repeat = (iRepeat >= 0)
      ? (String(row[iRepeat]).trim().toLowerCase() === 'yes')
      : false;

    var ev = {
      title: title,
      date:  Utilities.formatDate(date, Session.getScriptTimeZone() || 'Asia/Taipei', 'yyyy-MM-dd'),
      repeat: repeat
    };

    if (!repeat) {
      var diff = daysBetween_(today, date);
      ev.daysDiff = diff;
      ev.status = (diff > 0) ? 'future' : (diff === 0 ? 'today' : 'past');
    } else {
      var nextAnniv = nextAnniversary_(date, today);
      ev.daysUntilNext = daysBetween_(today, nextAnniv);
      ev.status = (ev.daysUntilNext === 0) ? 'today' : 'future';

      // 已過 X 年 Y 月（floor），由原始日期到今天
      var ym = yearsMonthsFloor_(date, today);
      ev.yearsPassed = ym.years;
      ev.monthsPassed = ym.months;
    }

    events.push(ev);
  }

  // 排序：今日 → 即將到期 → 已過去（負最大）
  events.sort(function (a, b) {
    var aKey = sortKey_(a);
    var bKey = sortKey_(b);
    return aKey - bKey;
  });

  var result = { events: events };
  try { cache.put(cacheKey, JSON.stringify(result), COUNTDOWN_CACHE_TTL); } catch (_) {}
  return result;
}

function sortKey_(e) {
  // 越小越前面：今日(0) → 未來天數正向 → 已過(用大數字推到後面，但 past 越近越前)
  if (e.repeat) return Math.max(0, e.daysUntilNext || 0);
  if (e.daysDiff === 0) return 0;
  if (e.daysDiff > 0) return e.daysDiff;
  // past: -1 → 100000, -1000 → 101000，越久越後面
  return 100000 + (-e.daysDiff);
}

function pickSheetByGid_(ss, gid) {
  var target = parseInt(gid, 10);
  if (isNaN(target)) return ss.getSheets()[0];
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === target) return sheets[i];
  }
  return null;
}

function findCol_(headers, candidates) {
  for (var i = 0; i < candidates.length; i++) {
    var idx = headers.indexOf(candidates[i].toLowerCase());
    if (idx >= 0) return idx;
  }
  return -1;
}

function parseDateCell_(v) {
  if (v instanceof Date) return stripTime_(v);
  var s = String(v).trim();
  if (!s) return null;
  // 接受 yyyy-MM-dd, yyyy/MM/dd, yyyy.MM.dd
  var m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : stripTime_(d);
}

function stripTime_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween_(from, to) {
  var ms = stripTime_(to) - stripTime_(from);
  return Math.round(ms / 86400000);
}

function nextAnniversary_(origin, today) {
  var anniv = new Date(today.getFullYear(), origin.getMonth(), origin.getDate());
  if (anniv < stripTime_(today)) {
    anniv = new Date(today.getFullYear() + 1, origin.getMonth(), origin.getDate());
  }
  return anniv;
}

/**
 * 從 origin 到 today 已經過了多少年多少月（無條件捨去；天數不滿一個月不計）。
 */
function yearsMonthsFloor_(origin, today) {
  var years = today.getFullYear() - origin.getFullYear();
  var months = today.getMonth() - origin.getMonth();
  if (today.getDate() < origin.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years < 0) { years = 0; months = 0; }
  return { years: years, months: months };
}
