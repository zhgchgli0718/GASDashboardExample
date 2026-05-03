/**
 * Web App 入口。
 *   ?api=1&token=...   外部 JSON API（給機器讀的；瀏覽器走 google.script.run）
 *   其他                HTML 儀表板
 */

function doGet(e) {
  e = e || { parameter: {} };
  var p = e.parameter || {};
  if (p.api === '1') return apiRouter_(e);
  return serveDashboard_(e);
}

function apiRouter_(e) {
  var p = e.parameter || {};
  var action = p.action || 'data';
  if (action === 'data') return jsonOut_(apiGetData(p.token));
  return jsonOut_({ ok: false, error: 'unknown_action: ' + action });
}

/**
 * 同樣這份資料，給前端 google.script.run 用（回 Object，不是 JSON 字串）。
 * Apps Script Web App 跑在 googleusercontent iframe，前端不能直接 fetch 自家 /exec，
 * 必須走 google.script.run 跨 iframe RPC。
 */
function apiGetData(token) {
  try {
    if (!checkToken_(token)) return { ok: false, error: 'unauthorized' };
    return {
      ok: true,
      now: new Date().toISOString(),
      weather:   safeCall_(fetchWeather_),
      calendar:  safeCall_(fetchTodayEvents_),
      countdown: safeCall_(fetchCountdowns_)
    };
  } catch (err) {
    return { ok: false, error: String(err && err.message || err) };
  }
}

/**
 * 把單一 fetcher 的錯誤包成 { error } 而不是讓整包 API 倒掉，
 * 這樣 Sheet 還沒設定時，天氣與行事曆仍然能顯示。
 */
function safeCall_(fn) {
  try {
    return fn();
  } catch (err) {
    return { error: String(err && err.message || err) };
  }
}

function serveDashboard_(e) {
  var t = HtmlService.createTemplateFromFile('Index');
  // 把 ?token= 從 URL 帶進前端，前端會存到 localStorage 後再 history.replaceState 拿掉
  t.tokenFromUrl = (e.parameter && e.parameter.token) ? String(e.parameter.token) : '';
  return t.evaluate()
    .setTitle('紙感儀表 · Paper Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
