"""Claude APIで台本JSONを生成する(任意機能)。

Claude Code上でこのリポジトリを開いて使う場合はAPIキー不要
(Claude Code自身が台本を書けばよい — CLAUDE.md 参照)。
このモジュールは cron などでの完全自動運転向け。
"""

from __future__ import annotations

import json
import os
import re

SCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string", "description": "動画タイトル(15文字以内、フック重視)"},
        "theme": {"type": "string", "enum": ["midnight", "sunset", "forest", "paper", "crimson"]},
        "hashtags": {"type": "array", "items": {"type": "string"}},
        "scenes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "画面テロップ(1シーン25文字以内、\\nで改行可)"},
                    "narration": {"type": "string", "description": "読み上げ原稿(話し言葉)"},
                },
                "required": ["text", "narration"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["title", "theme", "hashtags", "scenes"],
    "additionalProperties": False,
}

SYSTEM = """あなたはショート動画(YouTube Shorts / TikTok / Reels)の放送作家です。
与えられたトピックから、テロップ主体の縦型ショート動画の台本を作ります。

ルール:
- 1シーン目は視聴者の手を止める「フック」(疑問形・意外な事実・数字)
- シーンは5〜8個、合計45秒以内に収まる分量(ナレーション合計250文字程度)
- テロップ(text)は短く強く。ナレーション(narration)は自然な話し言葉
- 最後のシーンは行動喚起(保存・フォロー・コメント誘導)か強い締めの一言
- 誇張や虚偽は禁止。事実に基づく内容にする
- hashtagsはトピックに合う日本語ハッシュタグを4〜6個"""


def generate_script(topic: str, out_path: str, style: str | None = None) -> str:
    import anthropic  # 遅延import (この機能を使う人だけ必要)

    client = anthropic.Anthropic()
    user = f"トピック: {topic}"
    if style:
        user += f"\nスタイル指定: {style}"

    response = client.messages.create(
        model="claude-opus-4-8",
        max_tokens=16000,
        system=SYSTEM,
        messages=[{"role": "user", "content": user}],
        output_config={"format": {"type": "json_schema", "schema": SCRIPT_SCHEMA}},
    )
    text = next(b.text for b in response.content if b.type == "text")
    script = json.loads(text)

    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(script, f, ensure_ascii=False, indent=2)
    print(f"📝 台本を生成しました: {out_path} ({script['title']})")
    return out_path


def slugify(topic: str) -> str:
    s = re.sub(r"[^\w\-]", "_", topic)[:40].strip("_")
    return s or "script"
