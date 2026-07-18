"""音声合成エンジン。

対応エンジン(上から優先):
  - voicevox : ローカルのVOICEVOXエンジン (http://127.0.0.1:50021) — 高品質・無料
  - edge     : Microsoft Edge TTS (edge-tts パッケージ、オンライン) — 高品質・無料
  - openjtalk: Open JTalk (完全オフライン) — 品質は簡素だが確実に動く
  - none     : 無音 (文字数から表示時間を推定)

`auto` は上から順に使えるものを選ぶ。
"""

from __future__ import annotations

import glob
import os
import shutil
import subprocess
import urllib.request
import json as _json

VOICEVOX_URL = os.environ.get("VOICEVOX_URL", "http://127.0.0.1:50021")


def _run(cmd: list[str]) -> None:
    subprocess.run(cmd, check=True, capture_output=True)


def _to_wav(src: str, dst: str) -> None:
    """フォーマットを統一 (24kHz mono s16) して後段のconcatを安全にする"""
    _run(["ffmpeg", "-y", "-i", src, "-ar", "24000", "-ac", "1",
          "-c:a", "pcm_s16le", dst])


def estimate_duration(text: str) -> float:
    """無音モード用: 日本語の読み上げ速度(約7モーラ/秒)から表示時間を推定"""
    return 0.8 + 0.135 * len(text)


class SilentTTS:
    name = "none"

    def synth(self, text: str, out_wav: str) -> bool:
        return False  # 音声なし


class VoicevoxTTS:
    name = "voicevox"

    def __init__(self, speaker: int = 3):  # 3 = ずんだもん(ノーマル)
        self.speaker = speaker

    @staticmethod
    def available() -> bool:
        try:
            with urllib.request.urlopen(f"{VOICEVOX_URL}/version", timeout=1.5):
                return True
        except Exception:
            return False

    def synth(self, text: str, out_wav: str) -> bool:
        import urllib.parse
        q = urllib.parse.urlencode({"text": text, "speaker": self.speaker})
        req = urllib.request.Request(f"{VOICEVOX_URL}/audio_query?{q}", method="POST")
        with urllib.request.urlopen(req, timeout=30) as r:
            query = r.read()
        req = urllib.request.Request(
            f"{VOICEVOX_URL}/synthesis?speaker={self.speaker}",
            data=query, headers={"Content-Type": "application/json"}, method="POST")
        tmp = out_wav + ".vv.wav"
        with urllib.request.urlopen(req, timeout=120) as r:
            with open(tmp, "wb") as f:
                f.write(r.read())
        _to_wav(tmp, out_wav)
        os.unlink(tmp)
        return True


class EdgeTTS:
    name = "edge"

    def __init__(self, voice: str = "ja-JP-NanamiNeural"):
        self.voice = voice

    @staticmethod
    def available() -> bool:
        try:
            import edge_tts  # noqa: F401
            return True
        except ImportError:
            return False

    def synth(self, text: str, out_wav: str) -> bool:
        import asyncio
        import edge_tts

        tmp = out_wav + ".edge.mp3"

        async def _go():
            await edge_tts.Communicate(text, self.voice).save(tmp)

        asyncio.run(_go())
        _to_wav(tmp, out_wav)
        os.unlink(tmp)
        return True


class OpenJTalkTTS:
    name = "openjtalk"

    DIC_CANDIDATES = [
        "/var/lib/mecab/dic/open-jtalk/naist-jdic",
        "/usr/local/lib/mecab/dic/open-jtalk/naist-jdic",
        "/opt/homebrew/opt/open-jtalk/dic",
        "/usr/local/opt/open-jtalk/dic",
    ]
    VOICE_GLOBS = [
        "/usr/share/hts-voice/*/*.htsvoice",
        "/usr/local/share/hts-voice/*/*.htsvoice",
        "/opt/homebrew/opt/open-jtalk/voice/*/*.htsvoice",
    ]

    @staticmethod
    def available() -> bool:
        return shutil.which("open_jtalk") is not None

    def _paths(self) -> tuple[str, str]:
        dic = os.environ.get("OPENJTALK_DIC") or next(
            (p for p in self.DIC_CANDIDATES if os.path.isdir(p)), None)
        voice = os.environ.get("OPENJTALK_VOICE") or next(
            (m for g in self.VOICE_GLOBS for m in sorted(glob.glob(g))), None)
        if not dic or not voice:
            raise RuntimeError("Open JTalkの辞書または音声モデルが見つかりません")
        return dic, voice

    def synth(self, text: str, out_wav: str) -> bool:
        dic, voice = self._paths()
        tmp = out_wav + ".oj.wav"
        subprocess.run(
            ["open_jtalk", "-x", dic, "-m", voice, "-r", "1.05", "-ow", tmp],
            input=text.encode("utf-8"), check=True, capture_output=True)
        _to_wav(tmp, out_wav)
        os.unlink(tmp)
        return True


def pick_engine(name: str = "auto", voice: str | None = None):
    """エンジンを選択。auto は voicevox → edge → openjtalk → none の順に試す。"""
    if name == "voicevox":
        return VoicevoxTTS(int(voice) if voice else 3)
    if name == "edge":
        return EdgeTTS(voice or "ja-JP-NanamiNeural")
    if name == "openjtalk":
        return OpenJTalkTTS()
    if name == "none":
        return SilentTTS()
    if name != "auto":
        raise ValueError(f"不明なTTSエンジン: {name}")

    if VoicevoxTTS.available():
        return VoicevoxTTS(int(voice) if voice else 3)
    if EdgeTTS.available():
        return EdgeTTS(voice or "ja-JP-NanamiNeural")
    if OpenJTalkTTS.available():
        return OpenJTalkTTS()
    print("⚠ 利用可能なTTSが見つからないため無音で生成します (README参照)")
    return SilentTTS()
