/**
 * 生徒個別管理表（刷新版） — メイン処理
 *
 * 機能:
 *   📊 ダッシュボード ... 全生徒の進捗率・遅れ状況を一覧表示
 *   👤 生徒別シート   ... ロードマップ全ステップ＋チェックボックス＋自動期日
 *   🔔 遅れアラート   ... 期日超過タスクを自動判定（ダッシュボードに⚠️表示）
 *
 * 使い方:
 *   1. 新しいスプレッドシートの Apps Script にこのプロジェクトを貼り付ける
 *   2. リロードするとメニュー「📋 生徒管理」が出ます
 *   3. 「生徒を追加」で名前と開始日を入れると個別シートが自動生成されます
 */

var DASHBOARD_NAME = '📊 ダッシュボード';
var STUDENT_PREFIX = '👤 ';

var STUDENT_HEADER = ['プログラム', 'STEP', '大タスク', '小タスク（課題）', '教材リンク', '目標期日', '完了', '完了日', 'メモ'];
var COL = { PROGRAM: 1, STEP: 2, TASK: 3, DETAIL: 4, LINK: 5, DUE: 6, DONE: 7, DONE_DATE: 8, MEMO: 9 };

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📋 生徒管理')
    .addItem('👤 生徒を追加', 'addStudent')
    .addItem('🔄 ダッシュボードを更新', 'refreshDashboard')
    .addSeparator()
    .addItem('⚙️ 初期セットアップ', 'initialSetup')
    .addToUi();
}

/** 初回に一度実行: ダッシュボードシートを作る */
function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName(DASHBOARD_NAME) || ss.insertSheet(DASHBOARD_NAME, 0);
  dash.clear();
  var header = ['生徒名', '開始日', '進捗率', '完了タスク', '現在のプログラム', '次のタスク', '⚠️ 遅れ', '最終完了日'];
  dash.getRange(1, 1, 1, header.length).setValues([header])
    .setBackground('#4a4038').setFontColor('#ffffff').setFontWeight('bold');
  dash.setFrozenRows(1);
  dash.autoResizeColumns(1, header.length);
  refreshDashboard();
  SpreadsheetApp.getUi().alert('セットアップ完了！「👤 生徒を追加」から生徒を登録してください。');
}

/** 生徒を追加: 名前と開始日を聞いて個別シートを生成 */
function addStudent() {
  var ui = SpreadsheetApp.getUi();
  var nameRes = ui.prompt('生徒を追加', '生徒の名前を入力してください', ui.ButtonSet.OK_CANCEL);
  if (nameRes.getSelectedButton() !== ui.Button.OK || !nameRes.getResponseText().trim()) return;
  var name = nameRes.getResponseText().trim();

  var dateRes = ui.prompt('開始日', 'ロードマップ開始日を入力（例: 2026/07/01）。空欄なら今日', ui.ButtonSet.OK_CANCEL);
  if (dateRes.getSelectedButton() !== ui.Button.OK) return;
  var startDate = dateRes.getResponseText().trim() ? new Date(dateRes.getResponseText().trim()) : new Date();
  if (isNaN(startDate)) { ui.alert('日付の形式が読み取れませんでした（例: 2026/07/01）'); return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheetName = STUDENT_PREFIX + name;
  if (ss.getSheetByName(sheetName)) { ui.alert('「' + name + '」のシートは既に存在します'); return; }

  var sheet = ss.insertSheet(sheetName);
  buildStudentSheet_(sheet, name, startDate);
  refreshDashboard();
  ui.alert('「' + name + '」の管理シートを作成しました！');
}

/** 個別シートの中身を作る */
function buildStudentSheet_(sheet, name, startDate) {
  sheet.clear();

  // 見出し部
  sheet.getRange(1, 1).setValue('👤 ' + name + ' さんの個別管理表').setFontSize(14).setFontWeight('bold');
  sheet.getRange(2, 1).setValue('開始日:');
  sheet.getRange(2, 2).setValue(startDate).setNumberFormat('yyyy/mm/dd');

  // テーブルヘッダー
  var headerRow = 4;
  sheet.getRange(headerRow, 1, 1, STUDENT_HEADER.length).setValues([STUDENT_HEADER])
    .setBackground('#8a9a5b').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(headerRow);

  // ロードマップを展開（目標期日は開始日＋累積日数）
  var rows = [];
  var cumulative = 0;
  ROADMAP.forEach(function (program) {
    program.steps.forEach(function (s) {
      cumulative += s.days;
      var due = new Date(startDate.getTime());
      due.setDate(due.getDate() + cumulative - 1);
      rows.push([program.program, s.step, s.task, s.detail, s.link, due, false, '', '']);
    });
  });
  var range = sheet.getRange(headerRow + 1, 1, rows.length, STUDENT_HEADER.length);
  range.setValues(rows);

  // 書式
  sheet.getRange(headerRow + 1, COL.DUE, rows.length).setNumberFormat('yyyy/mm/dd');
  sheet.getRange(headerRow + 1, COL.DONE, rows.length).insertCheckboxes();
  sheet.getRange(headerRow + 1, COL.DONE_DATE, rows.length).setNumberFormat('yyyy/mm/dd');
  sheet.getRange(headerRow + 1, COL.DETAIL, rows.length).setWrap(true);
  sheet.setColumnWidth(COL.DETAIL, 320);
  sheet.setColumnWidth(COL.TASK, 200);
  sheet.setColumnWidth(COL.LINK, 220);

  // プログラムごとに色分け
  var rowIndex = headerRow + 1;
  var colors = ['#f6f2ea', '#eef1e2', '#fdf3e3'];
  ROADMAP.forEach(function (program, pi) {
    sheet.getRange(rowIndex, 1, program.steps.length, STUDENT_HEADER.length).setBackground(colors[pi % colors.length]);
    rowIndex += program.steps.length;
  });

  // 期日超過かつ未完了の行を赤字にする条件付き書式
  var dataRange = sheet.getRange(headerRow + 1, 1, rows.length, STUDENT_HEADER.length);
  var rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($G' + (headerRow + 1) + '=FALSE, $F' + (headerRow + 1) + '<TODAY())')
    .setFontColor('#cc0000')
    .setRanges([dataRange])
    .build();
  sheet.setConditionalFormatRules([rule]);
}

/** チェックを付けたら完了日を自動記録 */
function onEdit(e) {
  var sheet = e.range.getSheet();
  if (sheet.getName().indexOf(STUDENT_PREFIX) !== 0) return;
  if (e.range.getColumn() !== COL.DONE || e.range.getNumRows() !== 1) return;
  var dateCell = sheet.getRange(e.range.getRow(), COL.DONE_DATE);
  if (e.range.getValue() === true) {
    dateCell.setValue(new Date());
  } else {
    dateCell.clearContent();
  }
}

/** ダッシュボードを全生徒分再集計する */
function refreshDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dash = ss.getSheetByName(DASHBOARD_NAME);
  if (!dash) return;

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var rows = [];

  ss.getSheets().forEach(function (sheet) {
    var sheetName = sheet.getName();
    if (sheetName.indexOf(STUDENT_PREFIX) !== 0) return;
    var name = sheetName.substring(STUDENT_PREFIX.length);

    var startDate = sheet.getRange(2, 2).getValue();
    var headerRow = 4;
    var numRows = sheet.getLastRow() - headerRow;
    if (numRows <= 0) return;
    var data = sheet.getRange(headerRow + 1, 1, numRows, STUDENT_HEADER.length).getValues();

    var total = data.length;
    var done = 0, overdue = 0;
    var currentProgram = '', nextTask = '';
    var lastDoneDate = null;

    data.forEach(function (row) {
      var isDone = row[COL.DONE - 1] === true;
      var due = row[COL.DUE - 1];
      if (isDone) {
        done++;
        var doneDate = row[COL.DONE_DATE - 1];
        if (doneDate instanceof Date && (!lastDoneDate || doneDate > lastDoneDate)) lastDoneDate = doneDate;
      } else {
        if (!nextTask) {
          currentProgram = row[COL.PROGRAM - 1];
          nextTask = 'STEP' + row[COL.STEP - 1] + ' ' + row[COL.TASK - 1];
        }
        if (due instanceof Date && due < today) overdue++;
      }
    });

    var pct = total ? Math.round(done / total * 100) : 0;
    rows.push([
      name,
      startDate instanceof Date ? startDate : '',
      pct + '%（' + done + '/' + total + '）',
      done,
      done === total ? '🎉 全課程修了' : currentProgram,
      done === total ? '—' : nextTask,
      overdue > 0 ? '⚠️ ' + overdue + '件 期日超過' : 'OK',
      lastDoneDate || ''
    ]);
  });

  // 遅れの多い順 → 進捗の遅い順に並べる
  rows.sort(function (a, b) {
    var ao = String(a[6]).indexOf('⚠️') === 0 ? 1 : 0;
    var bo = String(b[6]).indexOf('⚠️') === 0 ? 1 : 0;
    if (ao !== bo) return bo - ao;
    return a[3] - b[3];
  });

  var existing = dash.getLastRow();
  if (existing > 1) dash.getRange(2, 1, existing - 1, 8).clearContent();
  if (rows.length) {
    dash.getRange(2, 1, rows.length, 8).setValues(rows);
    dash.getRange(2, 2, rows.length, 1).setNumberFormat('yyyy/mm/dd');
    dash.getRange(2, 8, rows.length, 1).setNumberFormat('yyyy/mm/dd');
  }
}

/**
 * （任意）毎朝の自動更新＋遅れサマリーメール
 * 使う場合: setupDailyTrigger() を一度実行し、
 * ALERT_EMAIL スクリプトプロパティに通知先メールアドレスを設定してください。
 */
function setupDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyUpdate') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyUpdate').timeBased().atHour(7).everyDays(1).create();
}

function dailyUpdate() {
  refreshDashboard();
  var email = PropertiesService.getScriptProperties().getProperty('ALERT_EMAIL');
  if (!email) return;

  var dash = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(DASHBOARD_NAME);
  var last = dash.getLastRow();
  if (last <= 1) return;
  var data = dash.getRange(2, 1, last - 1, 7).getValues();
  var delayed = data.filter(function (r) { return String(r[6]).indexOf('⚠️') === 0; });
  if (!delayed.length) return;

  var body = '期日超過タスクのある生徒さん一覧:\n\n' + delayed.map(function (r) {
    return '・' + r[0] + ' — ' + r[6] + '（次: ' + r[5] + '）';
  }).join('\n') + '\n\nシート: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl();
  MailApp.sendEmail(email, '【生徒管理】遅れアラート ' + delayed.length + '名', body);
}
