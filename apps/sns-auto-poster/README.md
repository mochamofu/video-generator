# SNS自動投稿 (sns-auto-poster)

Googleスプレッドシートに書いた投稿予定を、**X (Twitter) / Threads / Instagram** へ自動投稿するGoogle Apps Script (GAS) です。

既存のスプレッドシート「[SNS自動投稿](https://docs.google.com/spreadsheets/d/1M-6uAAjcSQOCTiM5I5IUjb3urgqL4xOTqA_5tbmGUDk/edit)」の列構成にそのまま対応しています。

## シートの書き方

| 日付 | 本文 | 画像URL | 投稿先 | 結果 |
|------|------|---------|--------|------|
| 2026-06-15 | 投稿する本文 | (任意) 公開画像URL | x | *(自動で書き込まれる)* |
| 2026-06-16 | 画像付き投稿 | https://.../image.jpg | x,threads,instagram | |

- **日付**: この日以降の実行時に投稿されます（未来の日付は待機）
- **投稿先**: カンマ区切りで `x` / `threads` / `instagram` を指定
- **画像URL**: Instagramは必須。**公開Webからアクセスできる画像URL**（Googleドライブの共有リンクは不可）
- **結果**: 空欄の行だけが投稿対象。成功/失敗が自動で書き込まれます。再投稿したい場合は結果欄を消してください

## セットアップ手順

### 1. スクリプトを貼り付ける

1. スプレッドシートを開き、**拡張機能 > Apps Script**
2. `src/` 内の5ファイル（`config.gs` `main.gs` `x.gs` `threads.gs` `instagram.gs`）の内容をそれぞれファイルとして追加
   - （clasp を使う場合は `src/` ディレクトリをそのまま `clasp push` でもOK）

### 2. APIキーをスクリプトプロパティに設定

Apps Scriptエディタの **プロジェクトの設定 > スクリプト プロパティ** に以下を追加します。
使わないSNSの分は設定不要です。

| プロパティ名 | 内容 |
|---|---|
| `X_API_KEY` | X Developer PortalのAPIキー |
| `X_API_SECRET` | APIシークレット |
| `X_ACCESS_TOKEN` | アクセストークン（Read and write権限で生成） |
| `X_ACCESS_TOKEN_SECRET` | アクセストークンシークレット |
| `THREADS_USER_ID` | ThreadsのユーザーID（数字） |
| `THREADS_ACCESS_TOKEN` | Threads APIの長期アクセストークン |
| `IG_USER_ID` | InstagramビジネスアカウントID（数字） |
| `IG_ACCESS_TOKEN` | Instagram Graph APIの長期アクセストークン |

#### APIキーの取り方（概要）

- **X**: [developer.x.com](https://developer.x.com) でアプリ作成 → 「User authentication settings」でRead and writeに設定 → Keys and tokensでアクセストークンを（再）生成。無料プランで月500件まで投稿可能
- **Threads**: [developers.facebook.com](https://developers.facebook.com) でアプリ作成 → ユースケース「Threads API」を追加 → `threads_basic`, `threads_content_publish` 権限でトークン取得 → [長期トークンに交換](https://developers.facebook.com/docs/threads/get-started/long-lived-tokens)
- **Instagram**: Instagramをプロアカウントにし、Facebookページと連携 → Metaアプリに `instagram_content_publish` 権限 → Graph APIエクスプローラー等で長期トークン取得

### 3. 動作確認と自動実行の開始

1. エディタで `runNow` 関数を選んで実行（初回は権限承認ダイアログが出ます）→ シートの「結果」列に書き込まれることを確認
2. `setupTrigger` 関数を一度実行 → 以後**毎時自動で**未投稿分をチェックして投稿します

## 運用のヒント

- 失敗した行は「結果」列にエラー内容が残ります。原因を直して結果欄を空にすれば次回再試行されます
- トークン（特にThreads/IGの長期トークン）は約60日で失効します。失効するとエラーが結果列に出るので、その際はトークンを再取得してスクリプトプロパティを更新してください
- 投稿時間を細かく制御したい場合は `setupTrigger` の `everyHours(1)` を `everyMinutes(15)` 等に変更
