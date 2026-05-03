/**
 * Token 驗證。
 * Web App 部署成 ANYONE_ANONYMOUS，靠 ACCESS_TOKEN 把關。
 */

function checkToken_(token) {
  var expected = getProp_(PROP_KEYS.ACCESS_TOKEN, '');
  if (!expected || !token) return false;
  return constantTimeEquals_(String(token), expected);
}

function constantTimeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
