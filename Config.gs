/**
 * PropertiesService 設定中心。
 * 所有 secret / 可變設定（API key、Sheet ID、Token...）都從這裡讀，
 * 程式碼裡不寫死任何敏感值。
 */

var PROP_KEYS = {
  ACCESS_TOKEN: 'ACCESS_TOKEN',          // 儀表板存取 Token（必填）
  CWA_API_KEY: 'CWA_API_KEY',            // 中央氣象局 Open Data Authorization（必填）
  WEATHER_LOCATION: 'WEATHER_LOCATION',  // F-C0032-001 的 locationName，預設 臺北市
  CALENDAR_ID: 'CALENDAR_ID',            // 預設 primary
  COUNTDOWN_SHEET_ID: 'COUNTDOWN_SHEET_ID',   // 倒數日 Sheet ID（必填）
  COUNTDOWN_SHEET_GID: 'COUNTDOWN_SHEET_GID'  // 工作表 GID，預設 0
};

var PROP_DEFAULTS = {
  WEATHER_LOCATION: '臺北市',
  CALENDAR_ID: 'primary',
  COUNTDOWN_SHEET_GID: '0'
};

var REQUIRED_KEYS = [
  PROP_KEYS.ACCESS_TOKEN,
  PROP_KEYS.CWA_API_KEY,
  PROP_KEYS.COUNTDOWN_SHEET_ID
];

function getProp_(key, fallback) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (v === null || v === undefined || v === '') {
    return (fallback !== undefined) ? fallback : (PROP_DEFAULTS[key] || '');
  }
  return v;
}

function setProp_(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, String(value));
}

function deleteProp_(key) {
  PropertiesService.getScriptProperties().deleteProperty(key);
}

/**
 * 在 Apps Script 編輯器手動執行一次：
 *   - 補上預設值（locationName=臺北市、calendar=primary、gid=0）
 *   - 報告還缺哪些必填 key
 *   - 第一次執行時也會觸發 OAuth 授權同意
 */
function setupConfig() {
  var props = PropertiesService.getScriptProperties();
  var seeded = [];
  Object.keys(PROP_DEFAULTS).forEach(function (k) {
    if (!props.getProperty(k)) {
      props.setProperty(k, PROP_DEFAULTS[k]);
      seeded.push(k + '=' + PROP_DEFAULTS[k]);
    }
  });

  var missing = REQUIRED_KEYS.filter(function (k) {
    return !props.getProperty(k);
  });

  Logger.log('seeded defaults: ' + (seeded.length ? seeded.join(', ') : '(none)'));
  Logger.log('missing required: ' + (missing.length ? missing.join(', ') : '(none — ready)'));
  Logger.log('current keys: ' + Object.keys(props.getProperties()).sort().join(', '));

  return { seeded: seeded, missing: missing };
}
