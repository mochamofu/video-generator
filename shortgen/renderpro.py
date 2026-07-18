"""Remotionベースの高品質レンダラー。

ffmpeg版(render.py)との違い:
  - 口パクするプレゼンターキャラが画面下部で語りかける(音声振幅駆動)
  - テロップはスプリングアニメーションのキネティックタイポグラフィ
  - 背景は動くグラデーション+光のブロブ
必要環境: Node.js 18+ (初回は remotion/ で npm install)
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import tempfile

from .render import _write_srt
from .themes import get_theme
from .tts import pick_engine

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REMOTION_DIR = os.path.join(REPO_ROOT, "remotion")

HEADLESS_SHELL_CANDIDATES = [
    "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
]


def _css(color: str) -> str:
    if color == "white":
        return "#ffffff"
    return re.sub(r"^0x", "#", color)


def _ensure_node_modules() -> None:
    if not os.path.isdir(os.path.join(REMOTION_DIR, "node_modules")):
        print("📦 初回セットアップ: remotion/ で npm install を実行します…")
        subprocess.run(["npm", "install", "--no-audit", "--no-fund"],
                       cwd=REMOTION_DIR, check=True)


def render_pro(script_path: str, out_path: str, *, tts_name: str = "auto",
               voice: str | None = None) -> str:
    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)
    scenes = script["scenes"]
    if not scenes:
        raise ValueError("scenes が空です")
    theme = get_theme(script.get("theme"))
    engine = pick_engine(tts_name, voice or script.get("voice"))
    slug = os.path.splitext(os.path.basename(script_path))[0]
    print(f"TTS: {engine.name} / theme: {script.get('theme', 'midnight')} / scenes: {len(scenes)} / renderer: remotion")

    _ensure_node_modules()

    # キャラ素材を public/ へ配置(無ければプレースホルダー生成)。width=0なら非表示
    char_width = int(script.get("character_width", 780))
    char_props = {"closed": "", "open": ""}
    if char_width > 0:
        from .character import prepare_character_dir
        char_src = prepare_character_dir(os.path.join(REPO_ROOT, "assets", "character"))
        pub_char = os.path.join(REMOTION_DIR, "public", "character")
        os.makedirs(pub_char, exist_ok=True)
        char_props = {}
        for key, path in char_src.items():
            shutil.copy(path, os.path.join(pub_char, f"{key}.png"))
            char_props[key] = f"character/{key}.png"

    job_dir = os.path.join(REMOTION_DIR, "public", "job", slug)
    os.makedirs(job_dir, exist_ok=True)

    # 音声合成 + タイミング決定
    from .audio import concat_wavs, synth_scenes
    with tempfile.TemporaryDirectory(prefix="shortgen_") as tmp:
        timings, seg_files = synth_scenes(scenes, engine, tmp)
        concat_wavs(seg_files, os.path.join(job_dir, "audio.wav"), tmp)

    total = timings[-1].end
    if total > 60:
        print(f"⚠ 合計 {total:.1f}s — ショート動画の60秒を超えています")

    # 実写素材(scenes[].media)を public/ へコピー
    VIDEO_EXT = {".mp4", ".mov", ".webm", ".m4v"}
    scene_props = []
    for i, (sc, tm) in enumerate(zip(scenes, timings)):
        p = {"text": sc["text"], "start": tm.start, "end": tm.end}
        if sc.get("emoji"):
            p["emoji"] = sc["emoji"]
        if sc.get("media"):
            src = sc["media"] if os.path.isabs(sc["media"]) else os.path.join(REPO_ROOT, sc["media"])
            if not os.path.exists(src):
                raise FileNotFoundError(f"シーン{i+1}のmediaが見つかりません: {sc['media']}")
            ext = os.path.splitext(src)[1].lower()
            dst_name = f"media_{i}{ext}"
            shutil.copy(src, os.path.join(job_dir, dst_name))
            p["media"] = f"job/{slug}/{dst_name}"
            p["mediaType"] = "video" if ext in VIDEO_EXT else "image"
        scene_props.append(p)

    props = {
        "title": script.get("title", ""),
        "scenes": scene_props,
        "audioSrc": f"job/{slug}/audio.wav",
        "character": char_props,
        "characterWidth": char_width,
        "total": total,
        "bg0": _css(theme["bg0"]),
        "bg1": _css(theme["bg1"]),
        "accent": _css(theme["accent"]),
        "textColor": _css(theme["text"]),
    }
    props_path = os.path.join(job_dir, "props.json")
    with open(props_path, "w", encoding="utf-8") as f:
        json.dump(props, f, ensure_ascii=False)

    # Remotionでレンダリング
    out_abs = os.path.abspath(out_path)
    os.makedirs(os.path.dirname(out_abs), exist_ok=True)
    env = dict(os.environ)
    if not env.get("REMOTION_BROWSER"):
        for cand in HEADLESS_SHELL_CANDIDATES:
            if os.path.exists(cand):
                env["REMOTION_BROWSER"] = cand
                break
    result = subprocess.run(
        ["npx", "remotion", "render", "src/index.ts", "ShortVideo", out_abs,
         f"--props={props_path}"],
        cwd=REMOTION_DIR, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"Remotionレンダリング失敗:\n{result.stderr[-3000:]}")

    base = os.path.splitext(out_abs)[0]
    _write_srt(base + ".srt", scenes, timings)
    with open(base + ".caption.txt", "w", encoding="utf-8") as f:
        f.write(script.get("title", "").replace("\n", "") + "\n\n")
        f.write(" ".join(script.get("hashtags", [])))

    print(f"✅ {out_path} ({total:.1f}s) / 字幕: {base}.srt / キャプション: {base}.caption.txt")
    return out_path
