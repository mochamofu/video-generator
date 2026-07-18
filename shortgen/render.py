"""ffmpegで縦型ショート動画(1080x1920)を合成する。

構成: アニメーショングラデーション背景 + タイトル + シーンごとのテロップ
      (フェードイン/アウト) + 上部プログレスバー + ナレーション音声 + BGM(任意)
副産物として .srt 字幕と投稿用キャプション .txt も出力する。
"""

from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unicodedata
from dataclasses import dataclass

from .themes import get_theme
from .tts import SilentTTS, estimate_duration, pick_engine

W, H = 1080, 1920
FPS = 30
FADE = 0.3          # テロップのフェード秒数
TAIL = 0.55         # ナレーション後の余韻
MIN_SCENE = 2.2     # シーン最短表示秒数

FONT_CANDIDATES = [
    # Linux
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
    # macOS
    "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
    "/System/Library/Fonts/Hiragino Sans GB.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    # Windows
    "C:/Windows/Fonts/meiryob.ttc",
    "C:/Windows/Fonts/meiryo.ttc",
    "C:/Windows/Fonts/msgothic.ttc",
]


def find_font(explicit: str | None = None) -> str:
    for p in [explicit, os.environ.get("SHORTGEN_FONT"), *FONT_CANDIDATES]:
        if p and os.path.exists(p):
            return p
    raise RuntimeError(
        "日本語フォントが見つかりません。--font か環境変数 SHORTGEN_FONT で指定してください")


def _char_width(ch: str) -> int:
    return 2 if unicodedata.east_asian_width(ch) in ("W", "F", "A") else 1


def wrap_text(text: str, max_full_chars: int) -> str:
    """全角換算 max_full_chars 文字で折り返す(手動改行 \\n は尊重)"""
    lines = []
    for para in text.split("\n"):
        cur, cur_w = "", 0
        for ch in para:
            w = _char_width(ch)
            if cur and cur_w + w > max_full_chars * 2:
                lines.append(cur)
                cur, cur_w = "", 0
            cur += ch
            cur_w += w
        lines.append(cur)
    return "\n".join(lines)


@dataclass
class Timing:
    start: float
    end: float


def _drawtext(font: str, textfile: str, *, size: int, color: str, box: str,
              x: str, y: str, timing: Timing | None = None,
              spacing: int = 16, borderw: int = 26) -> str:
    opts = [
        f"fontfile='{font}'",
        f"textfile='{textfile}'",
        "expansion=none",
        f"fontsize={size}",
        f"fontcolor={color}",
        f"line_spacing={spacing}",
        f"box=1", f"boxcolor={box}", f"boxborderw={borderw}",
        f"x={x}", f"y={y}",
    ]
    if timing:
        s, e = timing.start, timing.end
        opts.append(f"enable='between(t,{s:.3f},{e:.3f})'")
        opts.append(
            f"alpha='if(lt(t,{s:.3f}+{FADE}),(t-{s:.3f})/{FADE},"
            f"if(gt(t,{e:.3f}-{FADE}),({e:.3f}-t)/{FADE},1))'")
    return "drawtext=" + ":".join(opts)


def _write_srt(path: str, scenes: list[dict], timings: list[Timing]) -> None:
    def ts(sec: float) -> str:
        ms = int(round(sec * 1000))
        return f"{ms//3600000:02d}:{ms//60000%60:02d}:{ms//1000%60:02d},{ms%1000:03d}"

    with open(path, "w", encoding="utf-8") as f:
        for i, (sc, t) in enumerate(zip(scenes, timings), 1):
            f.write(f"{i}\n{ts(t.start)} --> {ts(t.end)}\n")
            f.write(sc.get("narration") or sc["text"].replace("\n", " "))
            f.write("\n\n")


def render(script_path: str, out_path: str, *, tts_name: str = "auto",
           font: str | None = None, voice: str | None = None) -> str:
    with open(script_path, encoding="utf-8") as f:
        script = json.load(f)

    scenes = script["scenes"]
    if not scenes:
        raise ValueError("scenes が空です")
    theme = get_theme(script.get("theme"))
    fontfile = find_font(font)
    engine = pick_engine(tts_name, voice or script.get("voice"))
    print(f"TTS: {engine.name} / theme: {script.get('theme', 'midnight')} / scenes: {len(scenes)}")

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    base = os.path.splitext(out_path)[0]

    with tempfile.TemporaryDirectory(prefix="shortgen_") as tmp:
        # 1) シーンごとに音声合成し、長さを決める
        timings: list[Timing] = []
        seg_files: list[str] = []
        t = 0.0
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
                                "-t", f"{dur:.3f}", seg],
                               check=True, capture_output=True)
            else:
                subprocess.run(["ffmpeg", "-y", "-f", "lavfi",
                                "-i", "anullsrc=r=24000:cl=mono",
                                "-t", f"{dur:.3f}", seg],
                               check=True, capture_output=True)
            seg_files.append(seg)
            timings.append(Timing(t, t + dur))
            t += dur

        total = t
        if total > 60:
            print(f"⚠ 合計 {total:.1f}s — YouTube Shorts/TikTokの60秒を超えています")

        # 2) 音声を連結
        concat_list = os.path.join(tmp, "concat.txt")
        with open(concat_list, "w") as f:
            for seg in seg_files:
                f.write(f"file '{seg}'\n")
        audio = os.path.join(tmp, "audio.wav")
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                        "-i", concat_list, "-c", "copy", audio],
                       check=True, capture_output=True)

        # 3) テキストをファイルに書き出し(drawtextのエスケープ問題を回避)
        title_file = os.path.join(tmp, "title.txt")
        with open(title_file, "w", encoding="utf-8") as f:
            f.write(wrap_text(script.get("title", ""), 14))
        scene_files = []
        for i, sc in enumerate(scenes):
            p = os.path.join(tmp, f"scene_{i}.txt")
            with open(p, "w", encoding="utf-8") as f:
                f.write(wrap_text(sc["text"], 12))
            scene_files.append(p)

        # 4) 映像フィルタを組み立てる
        chain = [
            _drawtext(fontfile, title_file, size=58, color=theme["text"],
                      box=theme["box"], x="(w-text_w)/2", y="170",
                      spacing=14, borderw=22),
        ]
        for p, tm in zip(scene_files, timings):
            chain.append(_drawtext(
                fontfile, p, size=74, color=theme["text"], box=theme["box"],
                x="(w-text_w)/2", y="(h-text_h)/2", timing=tm))

        fc = (
            f"[0:v]{','.join(chain)}[bg];"
            f"[bg][1:v]overlay=x='-W+W*t/{total:.3f}':y=0[v]"
        )

        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"gradients=s={W}x{H}:c0={theme['bg0']}:c1={theme['bg1']}"
                  f":speed=0.012:d={total:.3f}:r={FPS}",
            "-f", "lavfi",
            "-i", f"color=c={theme['accent']}@0.9:s={W}x14:d={total:.3f}:r={FPS}",
            "-i", audio,
        ]

        bgm = script.get("bgm")
        if bgm:
            cmd += ["-stream_loop", "-1", "-i", bgm]
            fc += (";[2:a]volume=1.0[na];[3:a]volume=0.22[ba];"
                   "[na][ba]amix=inputs=2:duration=first:normalize=0[a]")
            amap = "[a]"
        else:
            amap = "2:a"

        cmd += [
            "-filter_complex", fc,
            "-map", "[v]", "-map", amap,
            "-t", f"{total:.3f}",
            "-c:v", "libx264", "-preset", "medium", "-crf", "21",
            "-pix_fmt", "yuv420p", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "160k",
            "-movflags", "+faststart",
            out_path,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"ffmpegが失敗しました:\n{result.stderr[-2500:]}")

    # 5) 副産物: 字幕 + 投稿用キャプション
    _write_srt(base + ".srt", scenes, timings)
    with open(base + ".caption.txt", "w", encoding="utf-8") as f:
        f.write(script.get("title", "") + "\n\n")
        f.write(" ".join(script.get("hashtags", [])))

    print(f"✅ {out_path} ({total:.1f}s) / 字幕: {base}.srt / キャプション: {base}.caption.txt")
    return out_path
