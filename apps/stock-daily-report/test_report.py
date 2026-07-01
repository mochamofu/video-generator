"""compute_indicators / make_signals / build_report のオフラインテスト

実行: python test_report.py （外部通信なしで動作確認できます）
"""

import math

import pandas as pd

from report import build_report, compute_indicators, make_signals


def make_series(values):
    return pd.Series([float(v) for v in values])


def test_uptrend():
    # 300日かけて100→400へ上昇するデータ
    close = make_series([100 + i for i in range(300)])
    ind = compute_indicators(close)
    assert ind["close"] == 399.0
    assert ind["change_pct"] > 0
    assert ind["sma25"] < ind["close"]
    assert ind["rsi"] > 70  # 一方的な上昇はRSI高値
    assert ind["high52"] == 399.0
    signals = make_signals(ind)
    assert any("上昇トレンド" in s for s in signals)
    assert any("52週高値圏" in s for s in signals)


def test_downtrend():
    close = make_series([400 - i for i in range(300)])
    ind = compute_indicators(close)
    assert ind["change_pct"] < 0
    assert ind["rsi"] < 30
    signals = make_signals(ind)
    assert any("下落トレンド" in s for s in signals)


def test_short_series():
    # データが少なくてもクラッシュしない
    ind = compute_indicators(make_series([100, 103]))
    assert ind["sma25"] is None and ind["rsi"] is None
    assert math.isclose(ind["change_pct"], 3.0)


def test_build_report_with_error_row():
    rows = [
        {"symbol": "TEST.T", "name": "テスト銘柄",
         "ind": compute_indicators(make_series([100 + i for i in range(300)]))},
        {"symbol": "BAD.T", "name": "取得失敗銘柄", "error": "no data"},
    ]
    md = build_report(rows, "2026-07-01")
    assert "StockProAI デイリーレポート 2026-07-01" in md
    assert "テスト銘柄" in md
    assert "取得失敗" in md
    assert "投資助言ではありません" in md


if __name__ == "__main__":
    for fn in [test_uptrend, test_downtrend, test_short_series, test_build_report_with_error_row]:
        fn()
        print(f"ok: {fn.__name__}")
    print("all tests passed")
