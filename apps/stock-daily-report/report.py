#!/usr/bin/env python3
"""StockProAI — 株式デイリー分析レポート生成

watchlist.json の銘柄について株価データを取得し、テクニカル指標つきの
日本語マークダウンレポートを reports/YYYY-MM-DD.md に出力します。

使い方:
    pip install -r requirements.txt
    python report.py                # 今日のレポートを生成
    python report.py --out custom.md
"""

import argparse
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import pandas as pd
import yfinance as yf

APP_DIR = Path(__file__).parent
JST = timezone(timedelta(hours=9))


def compute_indicators(close: pd.Series) -> dict:
    """終値の時系列からテクニカル指標を計算する（データ取得と分離してテスト可能に）"""
    latest = float(close.iloc[-1])
    prev = float(close.iloc[-2]) if len(close) >= 2 else latest
    change_pct = (latest - prev) / prev * 100 if prev else 0.0

    sma5 = float(close.rolling(5).mean().iloc[-1]) if len(close) >= 5 else None
    sma25 = float(close.rolling(25).mean().iloc[-1]) if len(close) >= 25 else None
    sma75 = float(close.rolling(75).mean().iloc[-1]) if len(close) >= 75 else None

    # RSI(14) — Wilder方式
    rsi = None
    if len(close) >= 15:
        delta = close.diff()
        avg_gain = float(delta.clip(lower=0).ewm(alpha=1 / 14, adjust=False).mean().iloc[-1])
        avg_loss = float((-delta.clip(upper=0)).ewm(alpha=1 / 14, adjust=False).mean().iloc[-1])
        if avg_loss == 0:
            rsi = 100.0 if avg_gain > 0 else 50.0
        else:
            rsi = 100 - 100 / (1 + avg_gain / avg_loss)

    # ゴールデン/デッドクロス（直近5営業日以内にSMA5がSMA25を交差）
    cross = None
    if len(close) >= 30:
        s5 = close.rolling(5).mean()
        s25 = close.rolling(25).mean()
        above = (s5 > s25).astype(int)
        recent = above.diff().iloc[-5:]
        if (recent == 1).any():
            cross = "golden"
        elif (recent == -1).any():
            cross = "dead"

    year = close.iloc[-252:] if len(close) >= 252 else close
    high52 = float(year.max())
    low52 = float(year.min())

    return {
        "close": latest,
        "change_pct": change_pct,
        "sma5": sma5,
        "sma25": sma25,
        "sma75": sma75,
        "rsi": rsi,
        "cross": cross,
        "high52": high52,
        "low52": low52,
    }


def make_signals(ind: dict) -> list[str]:
    """指標から注目ポイント（シグナル）を日本語で生成"""
    sig = []
    rsi = ind["rsi"]
    if rsi is not None:
        if rsi >= 70:
            sig.append(f"RSI {rsi:.0f} → 買われすぎ圏。高値づかみに注意")
        elif rsi <= 30:
            sig.append(f"RSI {rsi:.0f} → 売られすぎ圏。反発に注目")

    if ind["cross"] == "golden":
        sig.append("直近でゴールデンクロス発生（短期上昇トレンド入りの可能性）")
    elif ind["cross"] == "dead":
        sig.append("直近でデッドクロス発生（短期下落トレンド入りの可能性）")

    close, sma25, sma75 = ind["close"], ind["sma25"], ind["sma75"]
    if sma25 and sma75:
        if close > sma25 > sma75:
            sig.append("上昇トレンド継続中（終値 > 25日線 > 75日線）")
        elif close < sma25 < sma75:
            sig.append("下落トレンド継続中（終値 < 25日線 < 75日線）")

    if ind["high52"] and close >= ind["high52"] * 0.98:
        sig.append("52週高値圏に接近中")
    if ind["low52"] and close <= ind["low52"] * 1.02:
        sig.append("52週安値圏に接近中")

    if abs(ind["change_pct"]) >= 3:
        direction = "急騰" if ind["change_pct"] > 0 else "急落"
        sig.append(f"前日比 {ind['change_pct']:+.1f}% の{direction}")

    return sig


def fmt(v, digits=1):
    return f"{v:,.{digits}f}" if v is not None else "—"


def build_report(rows: list[dict], date_str: str) -> str:
    lines = [
        f"# 📈 StockProAI デイリーレポート {date_str}",
        "",
        f"生成日時: {datetime.now(JST).strftime('%Y-%m-%d %H:%M')} JST",
        "",
        "| 銘柄 | 終値 | 前日比 | RSI(14) | 25日線 | 75日線 | 52週高値 | 52週安値 |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for r in rows:
        if r.get("error"):
            lines.append(f"| {r['name']} ({r['symbol']}) | 取得失敗 | — | — | — | — | — | — |")
            continue
        i = r["ind"]
        arrow = "🔺" if i["change_pct"] > 0 else ("🔻" if i["change_pct"] < 0 else "→")
        lines.append(
            f"| {r['name']} ({r['symbol']}) | {fmt(i['close'])} | {arrow} {i['change_pct']:+.2f}% "
            f"| {fmt(i['rsi'], 0)} | {fmt(i['sma25'])} | {fmt(i['sma75'])} "
            f"| {fmt(i['high52'])} | {fmt(i['low52'])} |"
        )

    lines += ["", "## 🔍 本日の注目ポイント", ""]
    any_signal = False
    for r in rows:
        if r.get("error"):
            lines.append(f"### {r['name']} ({r['symbol']})")
            lines.append(f"- ⚠️ データ取得エラー: {r['error']}")
            lines.append("")
            continue
        signals = make_signals(r["ind"])
        if signals:
            any_signal = True
            lines.append(f"### {r['name']} ({r['symbol']})")
            lines += [f"- {s}" for s in signals]
            lines.append("")
    if not any_signal:
        lines.append("本日は特筆すべきシグナルはありません。")
        lines.append("")

    lines += [
        "---",
        "",
        "> ⚠️ 本レポートは自動生成された参考情報であり、投資助言ではありません。",
        "> 投資判断はご自身の責任で行ってください。",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", help="出力ファイルパス（省略時は reports/YYYY-MM-DD.md）")
    args = parser.parse_args()

    watchlist = json.loads((APP_DIR / "watchlist.json").read_text(encoding="utf-8"))
    date_str = datetime.now(JST).strftime("%Y-%m-%d")

    rows = []
    for t in watchlist["tickers"]:
        symbol, name = t["symbol"], t["name"]
        try:
            df = yf.Ticker(symbol).history(period="1y", interval="1d")
            if df.empty:
                raise ValueError("価格データが空でした")
            rows.append({"symbol": symbol, "name": name, "ind": compute_indicators(df["Close"])})
        except Exception as e:  # 1銘柄の失敗でレポート全体を止めない
            rows.append({"symbol": symbol, "name": name, "error": str(e)[:100]})
        print(f"  {name} ({symbol}) ... {'NG' if rows[-1].get('error') else 'OK'}", file=sys.stderr)

    report = build_report(rows, date_str)

    out = Path(args.out) if args.out else APP_DIR / "reports" / f"{date_str}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")
    print(f"レポートを出力しました: {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
