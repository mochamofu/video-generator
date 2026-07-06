"""shortgen CLI

使い方:
  python -m shortgen render scripts/foo.json            # 台本→動画
  python -m shortgen new "トピック" --render            # Claude APIで台本生成→動画
  python -m shortgen batch topics.txt --render          # 1行1トピックで量産
"""

from __future__ import annotations

import argparse
import os
import sys


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="shortgen", description="ショート動画自動生成")
    sub = p.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("render", help="台本JSONから動画をレンダリング")
    pr.add_argument("script", help="台本JSONのパス")
    pr.add_argument("-o", "--out", default=None, help="出力mp4 (省略時 output/<台本名>.mp4)")
    pr.add_argument("--tts", default="auto",
                    choices=["auto", "voicevox", "edge", "openjtalk", "none"])
    pr.add_argument("--voice", default=None,
                    help="edge: 音声名 / voicevox: 話者ID (例: 3=ずんだもん)")
    pr.add_argument("--font", default=None, help="日本語フォントファイルのパス")

    pn = sub.add_parser("new", help="Claude APIで台本を生成 (要 ANTHROPIC_API_KEY 等)")
    pn.add_argument("topic", help="動画のトピック")
    pn.add_argument("--style", default=None, help="トーンや切り口の指定")
    pn.add_argument("-o", "--out", default=None, help="台本JSONの出力先")
    pn.add_argument("--render", action="store_true", help="続けて動画もレンダリング")
    pn.add_argument("--tts", default="auto",
                    choices=["auto", "voicevox", "edge", "openjtalk", "none"])
    pn.add_argument("--voice", default=None)
    pn.add_argument("--font", default=None)

    pb = sub.add_parser("batch", help="トピック一覧(1行1件)から一括生成")
    pb.add_argument("topics_file")
    pb.add_argument("--render", action="store_true")
    pb.add_argument("--tts", default="auto",
                    choices=["auto", "voicevox", "edge", "openjtalk", "none"])
    pb.add_argument("--voice", default=None)
    pb.add_argument("--font", default=None)

    args = p.parse_args(argv)

    if args.cmd == "render":
        from .render import render
        out = args.out or os.path.join(
            "output", os.path.splitext(os.path.basename(args.script))[0] + ".mp4")
        render(args.script, out, tts_name=args.tts, font=args.font, voice=args.voice)
        return 0

    if args.cmd == "new":
        from .script_gen import generate_script, slugify
        out = args.out or os.path.join("scripts", slugify(args.topic) + ".json")
        generate_script(args.topic, out, style=args.style)
        if args.render:
            from .render import render
            mp4 = os.path.join("output", os.path.splitext(os.path.basename(out))[0] + ".mp4")
            render(out, mp4, tts_name=args.tts, font=args.font, voice=args.voice)
        return 0

    if args.cmd == "batch":
        from .script_gen import generate_script, slugify
        with open(args.topics_file, encoding="utf-8") as f:
            topics = [ln.strip() for ln in f if ln.strip() and not ln.startswith("#")]
        print(f"{len(topics)}件のトピックを処理します")
        failed = []
        for topic in topics:
            try:
                out = os.path.join("scripts", slugify(topic) + ".json")
                generate_script(topic, out)
                if args.render:
                    from .render import render
                    mp4 = os.path.join(
                        "output", os.path.splitext(os.path.basename(out))[0] + ".mp4")
                    render(out, mp4, tts_name=args.tts, font=args.font, voice=args.voice)
            except Exception as e:
                print(f"✗ {topic}: {e}", file=sys.stderr)
                failed.append(topic)
        if failed:
            print(f"\n失敗 {len(failed)}件: {failed}", file=sys.stderr)
            return 1
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
