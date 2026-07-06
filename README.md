# shortgen — Claude Code × ffmpeg ショート動画自動生成

台本JSON → 縦型ショート動画(1080x1920, 30fps)を**完全自動**で生成するツール。
YouTube Shorts / TikTok / Instagram Reels にそのまま投稿できるmp4と、
字幕(.srt)・投稿用キャプション(.caption.txt)を出力します。

**仕組み**: 台本(タイトル+シーンごとのテロップ/ナレーション)をClaudeが書き、
TTSで音声合成し、ffmpegでアニメーション背景+テロップ焼き込み+プログレスバー付きの
動画に合成します。API課金なしでも動きます(後述)。

## 必要なもの

| 必須 | 入手方法 |
|---|---|
| Python 3.10+ | https://www.python.org/ |
| ffmpeg | mac: `brew install ffmpeg` / Windows: `winget install ffmpeg` / Ubuntu: `apt install ffmpeg` |
| 日本語フォント | mac/Windowsは標準フォントを自動検出。Linuxは `apt install fonts-ipafont-gothic` |

```bash
git clone <このリポジトリ>
cd video-generator
pip install -r requirements.txt   # edge-tts(音声合成)
```

## 2つのレンダラー

| コマンド | 内容 | 追加要件 |
|---|---|---|
| `renderpro` **(推奨)** | 口パクするプレゼンターキャラが語りかける + スプリングアニメーションのテロップ + 動く背景 (Remotion製) | Node.js 18+ |
| `render` | テロップのみの簡易版 (ffmpeg直) | なし |

```bash
# 初回のみ (renderpro用)
cd remotion && npm install && cd ..

python3 -m shortgen renderpro examples/sample.json
```

### キャラクターを差し替える

`assets/character/` の3枚のPNG(透過)を置き換えるだけ:

| ファイル | 内容 |
|---|---|
| `closed.png` | 口閉じ(基本) |
| `open.png` | 口開き(発話中に切替) |
| `blink.png` | 目閉じ(まばたき、任意) |

無い場合はフラットデザインのプレースホルダーが自動生成されます。

**AI生成イラストを使う場合**(nijijourney / Midjourney / Pixia / GPT Image等):

1. ベースを生成: 「上半身・正面向き・口を閉じて微笑み・**単色グリーンバック(#00FF00)**」
2. 同じ画像を参照させて差分生成(nijiなら `--oref`/キャラクターリファレンス):
   - 「口を開けて話している。それ以外は完全に同じ」
   - 「目を閉じている。それ以外は完全に同じ」
3. 透過PNG化して配置:
   ```bash
   python3 -m shortgen.character niji_closed.png assets/character/closed.png
   python3 -m shortgen.character niji_open.png   assets/character/open.png
   python3 -m shortgen.character niji_blink.png  assets/character/blink.png
   ```

## 使い方

### パターンA: Claude Codeと組み合わせる(推奨・APIキー不要)

このリポジトリをClaude Codeで開いて、話しかけるだけ:

```
「NISAの初心者向けネタでショート動画を3本作って」
```

Claude Codeが `CLAUDE.md` の指示に従い、台本JSONを書いて
`python3 -m shortgen render` を実行し、`output/` にmp4を吐きます。
台本生成にAPIを使わない(Claude Code自身が書く)ので追加コストゼロ。

### パターンB: 手書きの台本からレンダリング

```bash
python3 -m shortgen render examples/sample.json
# → output/sample.mp4 + sample.srt + sample.caption.txt
```

### パターンC: Claude APIで完全自動(cron運用向け)

```bash
pip install anthropic
export ANTHROPIC_API_KEY=sk-ant-...   # または `ant auth login`

python3 -m shortgen new "コンビニで買える高タンパク食品" --render
python3 -m shortgen batch topics.txt --render   # 1行1トピックで量産
```

## 台本フォーマット

```json
{
  "title": "知らないと損する\n節約術3選",
  "theme": "midnight",
  "hashtags": ["#節約", "#お金の勉強"],
  "scenes": [
    { "text": "9割の人が\n損してます", "narration": "実は9割の人が知らずに損している…" }
  ]
}
```

詳細ルールは [`prompts/scriptwriter.md`](prompts/scriptwriter.md) を参照。
テーマは `midnight / sunset / forest / paper / crimson` の5種。

## 音声合成(TTS)

`--tts auto`(デフォルト)で上から順に自動選択:

| エンジン | 品質 | 条件 |
|---|---|---|
| `voicevox` | ◎ ずんだもん等 | [VOICEVOX](https://voicevox.hiroshiba.jp/) を起動しておく(無料) |
| `edge` | ◎ 自然な音声 | `pip install edge-tts`(無料・要ネット) |
| `openjtalk` | △ 機械的 | `apt install open-jtalk open-jtalk-mecab-naist-jdic hts-voice-nitech-jp-atr503-m001` |
| `none` | 無音 | 文字数から表示時間を推定 |

話者変更: `--tts voicevox --voice 3`(話者ID) / `--tts edge --voice ja-JP-KeitaNeural`

## BGM

台本の `"bgm": "path/to/music.mp3"` で音量22%のループBGMをミックス。
フリーBGMは [DOVA-SYNDROME](https://dova-s.jp/) 等から(各サイトの利用規約を確認)。

## 投稿の自動化について

YouTube Data API / TikTok Content Posting API 等で投稿まで自動化できますが、
**新規アカウント+API投稿の組み合わせはスパム判定されやすい**ため、
まずは生成したmp4 + `.caption.txt` を手動投稿する運用を推奨します。

## 注意

- 生成コンテンツの正確性は投稿前に必ず確認してください
- 各プラットフォームの規約(AI生成コンテンツの開示義務など)に従ってください
