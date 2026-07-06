"""カラーテーマ定義。背景はアニメーションするグラデーション。"""

THEMES = {
    "midnight": {
        "bg0": "0x0f2027", "bg1": "0x2c5364",
        "text": "white", "accent": "0x4dd0e1",
        "box": "black@0.35",
    },
    "sunset": {
        "bg0": "0x35193e", "bg1": "0xf27059",
        "text": "white", "accent": "0xffd166",
        "box": "black@0.35",
    },
    "forest": {
        "bg0": "0x0b3d2e", "bg1": "0x14532d",
        "text": "white", "accent": "0x86efac",
        "box": "black@0.35",
    },
    "paper": {
        "bg0": "0xf5f0e8", "bg1": "0xe8d8c3",
        "text": "0x1f2937", "accent": "0xb45309",
        "box": "white@0.45",
    },
    "crimson": {
        "bg0": "0x1a0000", "bg1": "0x7f1d1d",
        "text": "white", "accent": "0xfca5a5",
        "box": "black@0.4",
    },
}

DEFAULT_THEME = "midnight"


def get_theme(name: str | None) -> dict:
    return THEMES.get(name or DEFAULT_THEME, THEMES[DEFAULT_THEME])
