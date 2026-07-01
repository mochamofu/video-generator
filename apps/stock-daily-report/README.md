# StockProAI — 株式デイリー分析レポート (stock-daily-report)

ウォッチリストの銘柄を**毎朝自動で分析**し、テクニカル指標つきの日本語レポートを生成するツールです。Driveに残っていた「StockProAI」スプレッドシートの構想を、GitHub Actionsで完結する形で実装しました。

## 何をしてくれる？

平日の朝7:30 (JST) に自動実行され、`reports/YYYY-MM-DD.md` にレポートが積み上がっていきます。

レポートの内容（銘柄ごと）:

- 終値・前日比
- RSI(14) — 買われすぎ/売られすぎの判定
- 25日・75日移動平均線とトレンド判定
- ゴールデンクロス/デッドクロスの検出
- 52週高値・安値圏への接近アラート

データはYahoo Finance（yfinanceライブラリ）から取得。日本株・米国株・指数に対応しています。

## 銘柄の変更

`watchlist.json` を編集するだけです。

```json
{ "symbol": "7203.T", "name": "トヨタ自動車" }   ← 日本株は「証券コード.T」
{ "symbol": "AAPL",   "name": "Apple" }          ← 米国株はティッカー
{ "symbol": "^N225",  "name": "日経平均株価" }    ← 指数は ^ 付き
```

## 自動実行について

- ワークフロー: `.github/workflows/stock-daily-report.yml`
- スケジュール: 平日 07:30 JST（cronは `30 22 * * 0-4` = UTC）
- 手動実行: GitHubの Actions タブ → 「StockProAI デイリーレポート」→ Run workflow
- 生成されたレポートは自動でリポジトリにコミットされます

## ローカルでの実行

```bash
cd apps/stock-daily-report
pip install -r requirements.txt
python report.py            # reports/YYYY-MM-DD.md に出力
python test_report.py       # オフラインテスト（通信不要）
```

## 注意

> ⚠️ 本ツールの出力は自動生成された参考情報であり、投資助言ではありません。投資判断はご自身の責任で行ってください。
