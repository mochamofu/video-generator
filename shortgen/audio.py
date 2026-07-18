"""シーンごとのTTS合成とタイミング計算(renderpro / export 共通)。"""

from __future__ import annotations

import os
import subprocess

from .render import MIN_SCENE, TAIL, Timing
from .tts import SilentTTS, estimate_duration


def synth_scenes(scenes: list[dict], engine, workdir: str) -> tuple[list[Timing], list[str]]:
    """各シーンの音声を合成し、シーン長にパディングしたwavとタイミングを返す"""
    timings: list[Timing] = []
    seg_files: list[str] = []
    t = 0.0
    for i, sc in enumerate(scenes):
        narration = sc.get("narration") or sc["text"].replace("\n", "")
        wav = os.path.join(workdir, f"voice_{i}.wav")
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
        seg = os.path.join(workdir, f"seg_{i:02d}.wav")
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
    return timings, seg_files


def concat_wavs(seg_files: list[str], out_wav: str, workdir: str) -> None:
    concat_list = os.path.join(workdir, "concat.txt")
    with open(concat_list, "w") as f:
        for seg in seg_files:
            f.write(f"file '{seg}'\n")
    subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0",
                    "-i", concat_list, "-c", "copy", out_wav],
                   check=True, capture_output=True)
