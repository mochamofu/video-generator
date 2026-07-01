# COCORO Lab Apps

これまで中途半端に残っていたプロジェクトの「残骸」を集めて、**完成した形**に仕上げたモノレポです。各アプリの詳細なセットアップ手順はそれぞれのREADMEにあります。

## 収録アプリ

| アプリ | 内容 | 状態 |
|---|---|---|
| [apps/sns-auto-poster](apps/sns-auto-poster/) | スプレッドシート駆動のSNS自動投稿（X / Threads / Instagram） | ✅ 完成（APIキー設定のみ必要） |
| [apps/aroma-diagnosis](apps/aroma-diagnosis/) | 香り診断Webアプリ（7問→5タイプのアロマブレンド提案、Supabase保存つき） | ✅ 完成（公開するだけ） |
| [apps/stock-daily-report](apps/stock-daily-report/) | StockProAI — 株式デイリー分析レポート（毎朝自動生成） | ✅ 完成（自動実行 稼働中） |
| [apps/student-tracker](apps/student-tracker/) | 生徒個別管理表 刷新版（全生徒ダッシュボード＋遅れアラート） | ✅ 完成（GAS貼り付けのみ必要） |

## 既存の資産との対応

- **SNS自動投稿**: Driveの「[SNS自動投稿](https://docs.google.com/spreadsheets/d/1M-6uAAjcSQOCTiM5I5IUjb3urgqL4xOTqA_5tbmGUDk/edit)」シートの列構成にそのまま対応
- **アロマ診断**: Supabaseプロジェクト `aroma-shindan` を復旧し、テーブル作成・適用済み
- **StockProAI**: Driveの空シートの構想をGitHub Actions完結型で実装
- **生徒個別管理表**: 「【SnsClub】初投稿までのタスク管理表」のカリキュラムを引き継ぎ、Driveに「[生徒個別管理表（刷新版）](https://docs.google.com/spreadsheets/d/10q8GUQa0BgjKjOnwwqLy0Yb2dCES2DrmmAaULLe2oXc/edit)」を作成済み

## 自動実行

- `.github/workflows/stock-daily-report.yml` — 平日 07:30 JST に株式レポートを自動生成し `apps/stock-daily-report/reports/` にコミットします
