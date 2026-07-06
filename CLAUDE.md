# video-generator (shortgen)

台本JSONからffmpegで縦型ショート動画(1080x1920)を自動生成するツール。

## Claude Codeへの指示: ショート動画の作り方

ユーザーに「〇〇についてショート動画を作って」「〇〇ネタで3本量産して」等と
依頼されたら、**Claude APIを呼ばずに自分で台本を書いて**レンダリングする:

1. `prompts/scriptwriter.md` のルールに従い、台本JSONを `scripts/<スラッグ>.json` に書く
   (フォーマットは `examples/sample.json` 参照。scenes 5〜8個、合計45秒以内)
2. レンダリング:
   ```bash
   python3 -m shortgen render scripts/<スラッグ>.json
   ```
   出力は `output/<スラッグ>.mp4`(+ `.srt` 字幕 + `.caption.txt` 投稿用キャプション)
3. 複数本頼まれたら 1〜2 をトピックごとに繰り返す
4. 生成したmp4はユーザーに提示する

### 注意
- TTSは `--tts auto` で自動選択 (VOICEVOX → edge-tts → Open JTalk → 無音)
- 事実に基づく内容のみ。誇張・虚偽・医療/投資の断定的助言は書かない
- テーマは内容に合わせて選ぶ: midnight(汎用) / sunset(エモ系) / forest(健康・自然) /
  paper(教養・解説) / crimson(注意喚起・衝撃系)

## セットアップ(初回のみ)

```bash
# ffmpeg + 日本語フォントが必要 (README.md 参照)
pip install -r requirements.txt   # edge-tts (音声合成)
```

## ディレクトリ

- `shortgen/` — 本体 (cli / render / tts / script_gen / themes)
- `scripts/` — 生成した台本JSON置き場
- `output/` — 動画出力先 (gitignore済み)
- `prompts/scriptwriter.md` — 台本の書き方ルール
