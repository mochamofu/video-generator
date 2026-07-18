"""CapCut等の編集アプリに持ち込むための素材書き出し。

「動画の組み立ては自分でやる。素材の準備が面倒」という人向け。
台本JSONから以下を一括生成する:

  export/<slug>/
    voice/scene_01.wav …  シーン別ナレーション(シーン長にパディング済み)
    audio_full.wav        全シーン連結ナレーション
    subtitles.srt         字幕(タイミング入り)
    caption.txt           投稿用キャプション(タイトル+ハッシュタグ)
    overlays/scene_01.png … テロップの透過PNG(1080x1920、そのまま重ねるだけ)
    timings.csv           シーンごとの開始/終了秒とテキスト一覧
"""

from __future__ import annotations

import csv
import html
import json
import os
import shutil
import subprocess
import tempfile

from .audio import concat_wavs, synth_scenes
from .placeholder_character import _find_browser
from .render import _write_srt
from .themes import get_theme
from .tts import pick_engine

OVERLAY_HTML = """<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  body {{ margin: 0; width: 1080px; height: 1920px; background: transparent;
         font-family: "Noto Sans JP", "Hiragino Sans", "Yu Gothic", "IPAPGothic", sans-serif; }}
  .wrap {{ position: absolute; top: 330px; left: 70px; right: 70px; }}
  .emoji {{ font-size: 150px; line-height: 1; margin-bottom: 26px; }}
  .line {{ margin-bottom: 14px; }}
  .line span {{ display: inline; font-size: 92px; font-weight: 900; line-height: 1.32;
    color: {text}; background: rgba(0,0,0,0.45);
    box-shadow: -14px 0 0 rgba(0,0,0,0.45), 14px 0 0 rgba(0,0,0,0.45), inset 0 -14px 0 {accent}55;
    box-decoration-break: clone; -webkit-box-decoration-break: clone; }}
</style></head><body><div class="wrap">{emoji}{lines}</div></body></html>
"""


def _css(color: str) -> str:
    return "#ffffff" if color == "white" else color.replace("0x", "#")


def _overlay_png(browser: str, sc: dict, theme: dict, out_png: str, tmp: str) -> None:
    emoji = f'<div class="emoji">{sc["emoji"]}</div>' if sc.get("emoji") else ""
    lines = "".join(
        f'<div class="line"><span>{html.escape(line)}</span></div>'
        for line in sc["text"].split("\n"))
    page = OVERLAY_HTML.format(text=_css(theme["text"]), accent=_css(theme["accent"]),
                               emoji=emoji, lines=lines)
    html_path = os.path.join(tmp, "overlay.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(page)
    subprocess.run(
        [browser, "--headless", "--no-sandbox", "--disable-gpu",
         f"--screenshot={os.path.abspath(out_png)}", "--window-size=1080,1920",
         "--default-background-color=00000000", "--hide-scrollbars",
         f"file://{html_path}"],
        check=True, capture_output=True)


def export_assets(script_path: str, out_dir: str, *, tts_name: str = "auto",
                  voice: str | None = None) -> str:
    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)
    scenes = script["scenes"]
    theme = get_theme(script.get("theme"))
    engine = pick_engine(tts_name, voice or script.get("voice"))
    browser = _find_browser()

    os.makedirs(os.path.join(out_dir, "voice"), exist_ok=True)
    os.makedirs(os.path.join(out_dir, "overlays"), exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="shortgen_") as tmp:
        timings, seg_files = synth_scenes(scenes, engine, tmp)
        for i, seg in enumerate(seg_files):
            shutil.copy(seg, os.path.join(out_dir, "voice", f"scene_{i+1:02d}.wav"))
        concat_wavs(seg_files, os.path.join(out_dir, "audio_full.wav"), tmp)
        for i, sc in enumerate(scenes):
            _overlay_png(browser, sc, theme,
                         os.path.join(out_dir, "overlays", f"scene_{i+1:02d}.png"), tmp)

    _write_srt(os.path.join(out_dir, "subtitles.srt"), scenes, timings)
    with open(os.path.join(out_dir, "caption.txt"), "w", encoding="utf-8") as f:
        f.write(script.get("title", "").replace("\n", "") + "\n\n")
        f.write(" ".join(script.get("hashtags", [])))
    with open(os.path.join(out_dir, "timings.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["scene", "start", "end", "duration", "text", "narration"])
        for i, (sc, tm) in enumerate(zip(scenes, timings), 1):
            w.writerow([i, f"{tm.start:.2f}", f"{tm.end:.2f}",
                        f"{tm.end - tm.start:.2f}",
                        sc["text"].replace("\n", "/"), sc.get("narration", "")])
    with open(os.path.join(out_dir, "README.txt"), "w", encoding="utf-8") as f:
        f.write(
            "CapCut等での使い方:\n"
            "1. 背景素材(実写や画像)をタイムラインに敷く\n"
            "2. voice/scene_XX.wav を順に音声トラックへ(既にシーン長で切ってあります)\n"
            "   または audio_full.wav を1本置いて timings.csv を目安にカット\n"
            "3. overlays/scene_XX.png を対応シーンに重ねる(テロップ焼き込み済み透過PNG)\n"
            "4. caption.txt をコピーして投稿文に\n")

    total = timings[-1].end if timings else 0
    print(f"📦 書き出し完了: {out_dir}/ ({len(scenes)}シーン, {total:.1f}s)")
    return out_dir
