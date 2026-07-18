"""キャラクター素材の準備ヘルパー。

AI画像生成(Pixia/nano-banana、GPT Image等)で作ったイラストは
「単色グリーン背景(#00FF00)で生成」→ このヘルパーで透過PNG化 して使う。

必要なファイル(assets/character/):
  closed.png … 口閉じ(基本)
  open.png   … 口開き(発話中)
  blink.png  … 目閉じ(まばたき、任意)

口開き/目閉じの差分は、画像生成モデルに元画像を渡して
「口を開けて/目を閉じて、それ以外は完全に同じに」と編集させると作れる。
"""

from __future__ import annotations

import os
import subprocess


def chromakey_to_alpha(src: str, dst: str, color: str = "0x00FF00",
                       similarity: float = 0.24, blend: float = 0.08) -> str:
    """グリーンバック画像を透過PNGに変換(緑かぶりはdespillで除去)"""
    os.makedirs(os.path.dirname(os.path.abspath(dst)) or ".", exist_ok=True)
    subprocess.run(
        ["ffmpeg", "-y", "-i", src,
         "-vf", f"chromakey={color}:{similarity}:{blend},despill=type=green",
         "-frames:v", "1", "-c:v", "png", dst],
        check=True, capture_output=True)
    return dst


def prepare_character_dir(char_dir: str = "assets/character") -> dict[str, str]:
    """assets/character を検証し、無ければプレースホルダーを生成して返す"""
    closed = os.path.join(char_dir, "closed.png")
    opened = os.path.join(char_dir, "open.png")
    blink = os.path.join(char_dir, "blink.png")
    if not (os.path.exists(closed) and os.path.exists(opened)):
        from .placeholder_character import generate
        generate(char_dir)
    assets = {"closed": closed, "open": opened}
    if os.path.exists(blink):
        assets["blink"] = blink
    return assets


if __name__ == "__main__":
    import sys
    # 使い方: python -m shortgen.character green_raw.png assets/character/closed.png
    chromakey_to_alpha(sys.argv[1], sys.argv[2])
    print(f"✅ {sys.argv[2]}")
