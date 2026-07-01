/**
 * X (Twitter) への投稿 — API v2 + OAuth 1.0a ユーザーコンテキスト
 *
 * 必要なスクリプトプロパティ:
 *   X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET
 *
 * X Developer Portalでアプリを作成し、App permissionsを「Read and write」に
 * してからアクセストークンを再生成してください。
 */

function postToX(text) {
  var url = 'https://api.x.com/2/tweets';
  var payload = JSON.stringify({ text: text });

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: payload,
    headers: { Authorization: buildOAuth1Header_('POST', url) },
    muteHttpExceptions: true
  });

  var code = res.getResponseCode();
  var json = safeParse_(res.getContentText());
  if (code >= 200 && code < 300 && json.data && json.data.id) {
    return 'https://x.com/i/status/' + json.data.id;
  }
  throw new Error('X APIエラー(' + code + '): ' + res.getContentText().slice(0, 200));
}

/**
 * OAuth 1.0a Authorizationヘッダーを作る。
 * JSONボディのリクエストでは署名対象パラメータはoauth_*のみ。
 */
function buildOAuth1Header_(method, url) {
  var consumerKey = getProp_('X_API_KEY');
  var consumerSecret = getProp_('X_API_SECRET');
  var token = getProp_('X_ACCESS_TOKEN');
  var tokenSecret = getProp_('X_ACCESS_TOKEN_SECRET');

  var params = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: Utilities.getUuid().replace(/-/g, ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: token,
    oauth_version: '1.0'
  };

  var baseParams = Object.keys(params).sort().map(function (k) {
    return rfc3986_(k) + '=' + rfc3986_(params[k]);
  }).join('&');

  var baseString = [method.toUpperCase(), rfc3986_(url), rfc3986_(baseParams)].join('&');
  var signingKey = rfc3986_(consumerSecret) + '&' + rfc3986_(tokenSecret);
  var signature = Utilities.base64Encode(
    Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_1, baseString, signingKey)
  );
  params.oauth_signature = signature;

  return 'OAuth ' + Object.keys(params).sort().map(function (k) {
    return rfc3986_(k) + '="' + rfc3986_(params[k]) + '"';
  }).join(', ');
}

function rfc3986_(str) {
  return encodeURIComponent(str)
    .replace(/!/g, '%21').replace(/\*/g, '%2A')
    .replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29');
}

function safeParse_(text) {
  try { return JSON.parse(text); } catch (e) { return {}; }
}
