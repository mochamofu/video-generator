"""プレースホルダーキャラクター生成。

AI生成イラストを用意していなくても動くように、フラットデザインの
プレゼンターキャラ(口閉じ/口開き/まばたき)をSVGから透過PNGで生成する。
高品質なキャラに差し替える場合は assets/character/*.png を上書きすればよい
(shortgen/character.py の chromakey ヘルパー参照)。

レンダリングにはChromium系ブラウザのヘッドレススクリーンショットを使う。
"""

from __future__ import annotations

import os
import shutil
import subprocess
import tempfile

SVG_TEMPLATE = """<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <!-- 後ろ髪 -->
  <path d="M450 180 C250 180 165 340 165 520 C165 700 190 840 230 950 L670 950 C710 840 735 700 735 520 C735 340 650 180 450 180 Z" fill="#43302b"/>
  <!-- 体: ブレザー -->
  <path d="M450 800 C330 800 240 850 195 930 C160 995 140 1090 132 1200 L768 1200 C760 1090 740 995 705 930 C660 850 570 800 450 800 Z" fill="#2b3a67"/>
  <!-- ブラウス -->
  <path d="M360 810 L450 960 L540 810 C510 790 490 785 450 785 C410 785 390 790 360 810 Z" fill="#ffffff"/>
  <!-- 襟 -->
  <path d="M360 808 L450 965 L392 1010 L318 850 Z" fill="#223055"/>
  <path d="M540 808 L450 965 L508 1010 L582 850 Z" fill="#223055"/>
  <!-- 首 -->
  <path d="M405 700 L405 815 C405 845 495 845 495 815 L495 700 Z" fill="#f6c9ae"/>
  <!-- 顔 -->
  <path d="M450 260 C310 260 225 380 225 530 C225 660 320 760 450 760 C580 760 675 660 675 530 C675 380 590 260 450 260 Z" fill="#ffe3d0"/>
  <!-- 耳 -->
  <ellipse cx="232" cy="560" rx="26" ry="40" fill="#ffe3d0"/>
  <ellipse cx="668" cy="560" rx="26" ry="40" fill="#ffe3d0"/>
  <!-- 前髪 -->
  <path d="M450 210 C290 210 220 330 228 470 C232 540 240 560 248 585 C260 520 268 480 300 440 C330 480 360 500 400 505 C380 460 375 430 380 395 C430 440 520 460 600 450 C640 445 655 470 660 585 C670 555 672 540 675 470 C683 330 610 210 450 210 Z" fill="#4a3228"/>
  <path d="M300 440 C330 480 360 500 400 505 C390 480 383 455 381 430 C350 442 322 442 300 440 Z" fill="#5f4434"/>
  <!-- サイドの髪 -->
  <path d="M238 470 C220 560 218 660 232 760 C258 730 270 660 268 560 Z" fill="#43302b"/>
  <path d="M662 470 C680 560 682 660 668 760 C642 730 630 660 632 560 Z" fill="#43302b"/>
  <!-- 眉 -->
  <path d="M300 528 C325 512 365 510 392 522" stroke="#4a3228" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M508 522 C535 510 575 512 600 528" stroke="#4a3228" stroke-width="10" fill="none" stroke-linecap="round"/>
  <!-- 目 -->
  {EYES}
  <!-- チーク -->
  <ellipse cx="308" cy="650" rx="38" ry="20" fill="#ffb3a0" opacity="0.55"/>
  <ellipse cx="592" cy="650" rx="38" ry="20" fill="#ffb3a0" opacity="0.55"/>
  <!-- 鼻 -->
  <path d="M448 638 C452 646 452 652 447 658" stroke="#e8b294" stroke-width="7" fill="none" stroke-linecap="round"/>
  <!-- 口 -->
  {MOUTH}
</svg>
"""

EYES_OPEN = """
  <g>
    <ellipse cx="346" cy="578" rx="42" ry="50" fill="#ffffff"/>
    <ellipse cx="554" cy="578" rx="42" ry="50" fill="#ffffff"/>
    <ellipse cx="346" cy="582" rx="30" ry="40" fill="#5b3a2a"/>
    <ellipse cx="554" cy="582" rx="30" ry="40" fill="#5b3a2a"/>
    <ellipse cx="346" cy="590" rx="16" ry="20" fill="#2f1d14"/>
    <ellipse cx="554" cy="590" rx="16" ry="20" fill="#2f1d14"/>
    <circle cx="336" cy="566" r="10" fill="#ffffff"/>
    <circle cx="544" cy="566" r="10" fill="#ffffff"/>
    <path d="M300 545 C320 528 372 528 390 548" stroke="#3a2a22" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M510 548 C528 528 580 528 600 545" stroke="#3a2a22" stroke-width="12" fill="none" stroke-linecap="round"/>
  </g>
"""

EYES_CLOSED = """
  <g>
    <path d="M304 585 C324 602 372 602 392 585" stroke="#3a2a22" stroke-width="13" fill="none" stroke-linecap="round"/>
    <path d="M508 585 C528 602 576 602 596 585" stroke="#3a2a22" stroke-width="13" fill="none" stroke-linecap="round"/>
  </g>
"""

MOUTH_CLOSED = """
  <path d="M414 700 C436 718 464 718 486 700" stroke="#b8574d" stroke-width="11" fill="none" stroke-linecap="round"/>
"""

MOUTH_OPEN = """
  <g>
    <path d="M406 690 C436 686 464 686 494 690 C492 738 470 762 450 762 C430 762 408 738 406 690 Z" fill="#8e2f28"/>
    <path d="M424 742 C440 730 460 730 476 742 C468 756 458 762 450 762 C442 762 432 756 424 742 Z" fill="#e0705f"/>
  </g>
"""

BROWSER_CANDIDATES = [
    os.environ.get("REMOTION_BROWSER"),
    "/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell",
    shutil.which("chromium"),
    shutil.which("chromium-browser"),
    shutil.which("google-chrome"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]


def _find_browser() -> str:
    for p in BROWSER_CANDIDATES:
        if p and os.path.exists(p):
            return p
    raise RuntimeError("Chromium系ブラウザが見つかりません (REMOTION_BROWSERで指定可)")


def generate(out_dir: str = "assets/character") -> dict[str, str]:
    browser = _find_browser()
    os.makedirs(out_dir, exist_ok=True)
    variants = {
        "closed": (EYES_OPEN, MOUTH_CLOSED),
        "open": (EYES_OPEN, MOUTH_OPEN),
        "blink": (EYES_CLOSED, MOUTH_CLOSED),
    }
    out: dict[str, str] = {}
    with tempfile.TemporaryDirectory() as tmp:
        for name, (eyes, mouth) in variants.items():
            svg_path = os.path.join(tmp, f"{name}.svg")
            with open(svg_path, "w", encoding="utf-8") as f:
                f.write(SVG_TEMPLATE.replace("{EYES}", eyes).replace("{MOUTH}", mouth))
            png_path = os.path.abspath(os.path.join(out_dir, f"{name}.png"))
            subprocess.run(
                [browser, "--headless", "--no-sandbox", "--disable-gpu",
                 f"--screenshot={png_path}", "--window-size=900,1200",
                 "--default-background-color=00000000",
                 "--hide-scrollbars", f"file://{svg_path}"],
                check=True, capture_output=True)
            out[name] = png_path
    print(f"🧑‍🎨 プレースホルダーキャラを生成: {out_dir}/(closed|open|blink).png")
    return out


if __name__ == "__main__":
    generate()
