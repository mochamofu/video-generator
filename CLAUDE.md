# video-generator (shortgen)

台本JSONからffmpegで縦型ショート動画(1080x1920)を自動生成するツール。

## アカウント運用

`accounts/<slug>/profile.md` に各アカウントの設計(ペルソナ・ネタの柱・法規制NG・CTA・
テーマ・ハッシュタグ)がある。**台本を書く前に必ず該当プロファイルを読むこと**。

| slug | 内容 | 台本の置き場 |
|---|---|---|
| `invest` | 投資ナレッジ(四季報・銘柄の探し方・日米情報源) | `scripts/invest/` |
| `gin-shampoo` | 自社オーガニックシャンプーGIN.(実写製品) | `scripts/gin-shampoo/` |
| `neuro-aroma` | 脳波測定パーソナライズアロマ | `scripts/neuro-aroma/` |

特に法規制(投資=金商法 / シャンプー・アロマ=薬機法)のNG表現はプロファイル記載の
ルールを厳守する。

## Claude Codeへの指示: ショート動画の作り方

ユーザーに「〇〇についてショート動画を作って」「〇〇ネタで3本量産して」等と
依頼されたら、**Claude APIを呼ばずに自分で台本を書いて**レンダリングする:

1. `prompts/scriptwriter.md` のルールに従い、台本JSONを `scripts/<スラッグ>.json` に書く
   (フォーマットは `examples/sample.json` 参照。scenes 5〜8個、合計45秒以内、
   各シーンに `emoji` を付ける)
2. レンダリング(**renderproを既定にする**。口パクキャラ+アニメーション付き):
   ```bash
   python3 -m shortgen renderpro scripts/<スラッグ>.json
   ```
   Node.jsが無い/失敗する場合のみ簡易版 `render` にフォールバック。
   出力は `output/<スラッグ>.mp4`(+ `.srt` 字幕 + `.caption.txt` 投稿用キャプション)
3. 複数本頼まれたら 1〜2 をトピックごとに繰り返す
4. 生成したmp4はユーザーに提示する

### 注意
- TTSは `--tts auto` で自動選択 (VOICEVOX → edge-tts → Open JTalk → 無音)
- 事実に基づく内容のみ。誇張・虚偽・医療/投資の断定的助言は書かない
- テーマは内容に合わせて選ぶ: midnight(汎用) / sunset(エモ系) / forest(健康・自然) /
  paper(教養・解説) / crimson(注意喚起・衝撃系)
- 実写素材があるシーンは `"media": "assets/media/..."` を付ける(画像/動画両対応)。
  キャラ不要なら台本トップに `"character_width": 0`

### その他のコマンド
- `python3 -m shortgen edit <台本>` — CapCut風タイムラインエディタ起動(スマホ対応)。
  ユーザーが「編集したい」「調整したい」と言ったらこれを案内
- `python3 -m shortgen export <台本>` — CapCut持ち込み用素材一式
  (シーン別音声wav/字幕srt/テロップ透過PNG/キャプション)を書き出し

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
