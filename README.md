# Video Generator

MoneyPrinterTurbo を使ったAI動画自動生成ブラウザアプリです。  
テーマを入力するだけで、スクリプト・音声・字幕・BGM付きの動画を自動生成します。

---

## 必要なもの

| 必須 | 内容 |
|------|------|
| Docker Desktop | [こちらからインストール](https://www.docker.com/products/docker-desktop/) |
| OpenAI APIキー | スクリプト生成に使用（[取得はこちら](https://platform.openai.com/api-keys)） |
| Pexels APIキー | 動画素材の取得に使用（[無料で取得](https://www.pexels.com/api/)） |

> GPUモードを使う場合は追加で **NVIDIA GPU + NVIDIA Container Toolkit** が必要です（後述）

---

## セットアップ手順

### 1. リポジトリをクローン

```bash
git clone https://github.com/mochamofu/video-generator.git
cd video-generator
```

### 2. 設定ファイルを作成

```bash
cp .env.example .env
```

`.env` をテキストエディタで開き、APIキーを設定します：

```
USE_GPU=false                        # GPUを使う場合は true に変更
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...               # ← OpenAI APIキーを貼り付け
OPENAI_MODEL_NAME=gpt-4o
PEXELS_API_KEYS=...                 # ← Pexels APIキーを貼り付け
```

### 3. 起動

```bash
./start.sh
```

初回はMoneyPrinterTurboのダウンロードとビルドが走るため **5〜10分** かかります。

### 4. ブラウザでアクセス

起動完了後、ブラウザで以下を開きます：

```
http://localhost:3000
```

---

## 使い方

### 動画を作る

1. **動画のテーマ** を入力（例：「猫の面白い瞬間 TOP5」）
2. **処理デバイス** を選択（CPU / GPU）
3. **音声・アスペクト比** などを設定
4. **「動画を生成する」** ボタンをクリック
5. 進捗バーが完了したら動画をプレビュー・ダウンロード

### 各設定の説明

| 設定項目 | 説明 |
|---------|------|
| 動画のテーマ | AIがスクリプトを自動生成するお題 |
| スクリプト（任意） | 自分でスクリプトを書く場合に入力 |
| アスペクト比 | 9:16（TikTok/Reels）/ 16:9（YouTube）/ 1:1 |
| 素材ソース | Pexels または Pixabay から動画素材を取得 |
| 音声 | テキスト読み上げの声を選択 |
| 処理デバイス | CPU（誰でも使える）/ GPU（高速・高品質） |
| 字幕 | 表示のON/OFF・位置・フォントサイズ |
| BGM | ランダムまたはなし |

---

## GPUモードについて

GPUモードを使うと以下が高速化・高品質化されます：

| 処理 | CPUモード | GPUモード |
|------|-----------|-----------|
| 字幕生成（Whisper） | CPU処理・低速 | CUDA高速処理 |
| 動画エンコード | libx264（ソフトウェア） | h264_nvenc（NVIDIAハードウェア） |

### GPU利用の前提条件

- NVIDIA製GPU（GeForce / RTX / GTX など）
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) のインストール

### GPU起動方法

`.env` で `USE_GPU=true` にしてから `./start.sh` を実行するだけです。  
スクリプトが自動的にGPU対応のDocker Composeプロファイルで起動します。

---

## 停止・再起動

```bash
# 停止
docker compose down

# 再起動（コード変更後）
./start.sh --build
```

---

## トラブルシューティング

### `Permission denied: ./start.sh`

```bash
chmod +x start.sh
```

### 動画が生成されない・エラーになる

- `.env` のAPIキーが正しく設定されているか確認
- Pexels APIキーは無料で取得可能です（1時間あたり200リクエスト制限あり）
- OpenAI APIに残高があるか確認

### GPU起動時に「could not select device driver」エラー

NVIDIA Container Toolkit が未インストールです。  
[公式ガイド](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) に従ってインストールしてください。

### ポート3000が使用中

`docker-compose.yml` の `ports` を変更します：
```yaml
ports:
  - "3001:80"  # 3000 → 3001 などに変更
```

---

## 生成される動画の仕様

- 形式：MP4
- 解像度：フルHD（1920×1080 または 1080×1920）
- 音声：Edge TTS（無料）または Azure Speech
- 字幕：Whisper（GPU）または Edge TTS タイムスタンプ（CPU）
