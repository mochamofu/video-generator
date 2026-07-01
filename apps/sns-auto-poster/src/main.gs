/**
 * SNS自動投稿 — メイン処理
 *
 * シート構成: | 日付 | 本文 | 画像URL | 投稿先 | 結果 |
 *
 * 動作:
 *   - 「日付」が今日以前で「結果」が空の行を投稿対象にする
 *   - 「投稿先」はカンマ区切りで x / threads / instagram を指定
 *   - 投稿に成功すると「結果」列に "✅ x:成功 (2026-06-15 09:00)" のように書き込む
 *   - 失敗した場合はエラー内容を書き込む（次回の実行では再試行されないので、
 *     再試行したい場合は結果列を空にしてください）
 *
 * セットアップ:
 *   1. このプロジェクトをスプレッドシートのコンテナバインドスクリプトとして貼り付ける
 *      （拡張機能 > Apps Script）
 *   2. スクリプトプロパティにAPIキーを設定（config.gs のコメント参照）
 *   3. setupTrigger() を一度実行して時間主導トリガーを作成
 */

/** 時間主導トリガーを作成する（毎時実行）。一度だけ手動で実行してください。 */
function setupTrigger() {
  // 既存の同名トリガーを削除して二重登録を防ぐ
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'postScheduled') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('postScheduled').timeBased().everyHours(1).create();
}

/** トリガーから呼ばれるエントリポイント */
function postScheduled() {
  var sheet = getTargetSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow <= CONFIG.HEADER_ROWS) return;

  var numRows = lastRow - CONFIG.HEADER_ROWS;
  var range = sheet.getRange(CONFIG.HEADER_ROWS + 1, 1, numRows, 5);
  var values = range.getValues();
  var today = startOfDay_(new Date());

  values.forEach(function (row, i) {
    var date = row[CONFIG.COL.DATE - 1];
    var body = String(row[CONFIG.COL.BODY - 1] || '').trim();
    var imageUrl = String(row[CONFIG.COL.IMAGE - 1] || '').trim();
    var targets = String(row[CONFIG.COL.TARGETS - 1] || '').trim();
    var result = String(row[CONFIG.COL.RESULT - 1] || '').trim();

    if (result || !body || !targets) return;            // 投稿済み・不備はスキップ
    if (date instanceof Date && startOfDay_(date) > today) return; // 未来日はスキップ

    var outcome = postToTargets_(body, imageUrl, targets);
    sheet.getRange(CONFIG.HEADER_ROWS + 1 + i, CONFIG.COL.RESULT).setValue(outcome);
  });
}

/** 手動テスト用: 対象行を投稿する（トリガーを待たずに動作確認できます） */
function runNow() {
  postScheduled();
}

function postToTargets_(body, imageUrl, targets) {
  var results = [];
  targets.split(',').map(function (t) { return t.trim().toLowerCase(); })
    .filter(String)
    .forEach(function (target) {
      try {
        var url = '';
        if (target === 'x' || target === 'twitter') {
          url = postToX(body);
        } else if (target === 'threads') {
          url = postToThreads(body, imageUrl);
        } else if (target === 'instagram' || target === 'ig') {
          if (!imageUrl) throw new Error('Instagramには画像URLが必須です');
          url = postToInstagram(body, imageUrl);
        } else {
          throw new Error('不明な投稿先: ' + target);
        }
        results.push('✅ ' + target + ':成功' + (url ? ' ' + url : ''));
      } catch (e) {
        results.push('❌ ' + target + ':' + e.message);
      }
    });
  var stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  return results.join(' / ') + ' (' + stamp + ')';
}

function getTargetSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  return CONFIG.SHEET_NAME ? ss.getSheetByName(CONFIG.SHEET_NAME) : ss.getSheets()[0];
}

function startOfDay_(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
