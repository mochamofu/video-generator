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

from .render import MIN_SCENE, TAIL, Timing, _write_srt
from .themes import get_theme
from .tts import SilentTTS, estimate_duration, pick_engine

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

    # キャラ素材を public/ へ配置(無ければプレースホルダー生成)
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

    # 音声合成 + タイミング決定 (render.py と同じロジック)
    timings: list[Timing] = []
    t = 0.0
    with tempfile.TemporaryDirectory(prefix="shortgen_") as tmp:
        seg_files = []
        for i, sc in enumerate(scenes):
            narration = sc.get("narration") or sc["text"].replace("\n", "")
            wav = os.path.join(tmp, f"voice_{i}.wav")
            has_voice = not isinstance(engine, SilentTTS) and engine.synth(narration, wav)
            if has_voice:
                probe = subprocess.run(
                    ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                     "-of", "csv=p=0", wav], capture_output=True, text=True, check=True)
                dur = max(float(probe.stdout.strip()) + TAIL,
                          float(sc.get("min_duration", MIN_SCENE)))
            else:
                dur = max(estimate_duration(narration),
                          float(sc.get("min_duration", MIN_SCENE)))
            seg = os.path.join(tmp, f"seg_{i}.wav")
            if has_voice:
                subprocess.run(["ffmpeg", "-y", "-i", wav, "-af", "apad",
                                "-t", f"{dur:.3f}", seg], check=True, capture_output=True)
            else:
                subprocess.run(["ffmpeg", "-y", "-f", "lavfi",
                                "-i", "anullsrc=r=24000:cl=mono",
                                "-t", f"{dur:.3f}", seg], check=True, capture_output=True)
            seg_files.append(seg)
            timings.append(Timing(t, t + dur))
            t += dur

        concat_list = os.path.join(tmp, "concat.txt")
        with open(concat_list, "w") as f:
            for seg in seg_files:
                f.write(f"file '{seg}'\n")
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                        "-i", concat_list, "-c", "copy",
                        os.path.join(job_dir, "audio.wav")],
                       check=True, capture_output=True)

    total = t
    if total > 60:
        print(f"⚠ 合計 {total:.1f}s — ショート動画の60秒を超えています")

    props = {
        "title": script.get("title", ""),
        "scenes": [
            {"text": sc["text"],
             **({"emoji": sc["emoji"]} if sc.get("emoji") else {}),
             "start": tm.start, "end": tm.end}
            for sc, tm in zip(scenes, timings)
        ],
        "audioSrc": f"job/{slug}/audio.wav",
        "character": char_props,
        "characterWidth": int(script.get("character_width", 780)),
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
