/**
 * Instagram への投稿 — Instagram Graph API
 *
 * 必要なスクリプトプロパティ:
 *   IG_USER_ID / IG_ACCESS_TOKEN
 *
 * 前提:
 *   - Instagramがプロアカウント（ビジネス/クリエイター）であること
 *   - Facebookページと連携済みであること
 *   - instagram_content_publish 権限付きの長期トークンを取得済みであること
 *   - 画像URLは公開アクセス可能なURL（Googleドライブの共有リンクは不可。
 *     公開Webサーバー上のJPEG/PNGを指定）
 */

var IG_API = 'https://graph.facebook.com/v21.0';

function postToInstagram(caption, imageUrl) {
  var userId = getProp_('IG_USER_ID');
  var token = getProp_('IG_ACCESS_TOKEN');

  // 1. メディアコンテナ作成
  var container = fetchJson_(IG_API + '/' + userId + '/media', {
    access_token: token,
    image_url: imageUrl,
    caption: caption
  });
  if (!container.id) throw new Error('IGコンテナ作成失敗: ' + JSON.stringify(container).slice(0, 200));

  // 2. コンテナの処理完了を待つ（最大約60秒）
  for (var i = 0; i < 12; i++) {
    var status = fetchJsonGet_(IG_API + '/' + container.id, {
      access_token: token,
      fields: 'status_code'
    });
    if (status.status_code === 'FINISHED') break;
    if (status.status_code === 'ERROR') throw new Error('IGメディア処理エラー');
    Utilities.sleep(5000);
  }

  // 3. 公開
  var published = fetchJson_(IG_API + '/' + userId + '/media_publish', {
    access_token: token,
    creation_id: container.id
  });
  if (!published.id) throw new Error('IG公開失敗: ' + JSON.stringify(published).slice(0, 200));
  return 'instagram.com (ID: ' + published.id + ')';
}

function fetchJsonGet_(url, params) {
  var qs = Object.keys(params).map(function (k) {
    return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }).join('&');
  var res = UrlFetchApp.fetch(url + '?' + qs, { muteHttpExceptions: true });
  return safeParse_(res.getContentText());
}
