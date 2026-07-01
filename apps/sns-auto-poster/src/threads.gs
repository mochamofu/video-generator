/**
 * Threads への投稿 — Threads API (Graph API)
 *
 * 必要なスクリプトプロパティ:
 *   THREADS_USER_ID / THREADS_ACCESS_TOKEN
 *
 * Meta for Developersでアプリを作成し、Threads APIのユースケースを追加、
 * threads_basic / threads_content_publish 権限で長期トークンを取得してください。
 */

var THREADS_API = 'https://graph.threads.net/v1.0';

function postToThreads(text, imageUrl) {
  var userId = getProp_('THREADS_USER_ID');
  var token = getProp_('THREADS_ACCESS_TOKEN');

  // 1. メディアコンテナを作成
  var params = { access_token: token, text: text };
  if (imageUrl) {
    params.media_type = 'IMAGE';
    params.image_url = imageUrl;
  } else {
    params.media_type = 'TEXT';
  }
  var container = fetchJson_(THREADS_API + '/' + userId + '/threads', params);
  if (!container.id) throw new Error('Threadsコンテナ作成失敗: ' + JSON.stringify(container).slice(0, 200));

  // 画像処理の完了を少し待つ（画像付きの場合）
  if (imageUrl) Utilities.sleep(15000);

  // 2. 公開
  var published = fetchJson_(THREADS_API + '/' + userId + '/threads_publish', {
    access_token: token,
    creation_id: container.id
  });
  if (!published.id) throw new Error('Threads公開失敗: ' + JSON.stringify(published).slice(0, 200));
  return 'threads.net (ID: ' + published.id + ')';
}

function fetchJson_(url, params) {
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    payload: params,
    muteHttpExceptions: true
  });
  return safeParse_(res.getContentText());
}
