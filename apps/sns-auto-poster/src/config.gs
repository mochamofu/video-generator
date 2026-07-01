/**
 * SNS自動投稿 — 設定
 *
 * すべての認証情報はスクリプトプロパティ（プロジェクトの設定 > スクリプト プロパティ）
 * に保存します。コードに直接書かないでください。
 *
 * 必要なプロパティ一覧:
 *   [X (Twitter)]
 *     X_API_KEY             ... APIキー (Consumer Key)
 *     X_API_SECRET          ... APIシークレット (Consumer Secret)
 *     X_ACCESS_TOKEN        ... アクセストークン
 *     X_ACCESS_TOKEN_SECRET ... アクセストークンシークレット
 *   [Threads]
 *     THREADS_USER_ID       ... ThreadsユーザーID（数字）
 *     THREADS_ACCESS_TOKEN  ... 長期アクセストークン
 *   [Instagram]
 *     IG_USER_ID            ... InstagramビジネスアカウントのID（数字）
 *     IG_ACCESS_TOKEN       ... 長期アクセストークン
 */

var CONFIG = {
  // 投稿データが入っているシート名（先頭シートを使う場合はnullのまま）
  SHEET_NAME: null,

  // 列の並び（1始まり）。既存の「SNS自動投稿」シートの構成に合わせています。
  COL: {
    DATE: 1,    // 日付
    BODY: 2,    // 本文
    IMAGE: 3,   // 画像URL
    TARGETS: 4, // 投稿先 (例: "x" / "x,threads" / "instagram")
    RESULT: 5   // 結果（スクリプトが書き込む）
  },

  // ヘッダー行の数
  HEADER_ROWS: 1
};

function getProp_(key) {
  var v = PropertiesService.getScriptProperties().getProperty(key);
  if (!v) throw new Error('スクリプトプロパティ「' + key + '」が設定されていません');
  return v;
}
