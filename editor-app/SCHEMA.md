# プロジェクトJSONスキーマ

サーバー(`server/projects/*.json`)・クライアント(JS)・Remotion合成(TS)が共有するデータ形式。
すべての時間軸は **フレーム単位**(`project.fps` 基準)で統一し、UI表示のときだけ秒に変換する。

```jsonc
{
  "id": "proj_xxxxxx",
  "name": "無題プロジェクト",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "tracks": [
    {
      "id": "trk_xxxxxx",
      "type": "video",        // "video" | "text" | "audio" (トラック全体の主用途。videoトラックにも画像クリップを置ける)
      "name": "V1",
      "muted": false,
      "hidden": false,
      "clips": [
        {
          "id": "clip_xxxxxx",
          "kind": "media",     // "media" | "text"
          "mediaId": "media_xxxxxx",   // メディアビンのアイテムID
          "mediaType": "video",         // "video" | "image" | "audio"
          "src": "/api/media/xxxxxx/file",  // 絶対URL(サーバー配信)
          "start": 0,           // タイムライン上の開始フレーム
          "duration": 90,       // タイムライン上での表示長(フレーム)
          "trimStart": 0,       // ソースメディアのイン点(フレーム)。画像/音声にも適用可
          "sourceDurationFrames": 300, // ソースの全長(トリム上限の計算に使用)。画像はnull(無制限)
          "volume": 1,          // 0-1 (video/audioクリップのみ)
          "x": 0, "y": 0, "width": 1080, "height": 1920,  // 画面内の配置ボックス(px, 左上原点)
          "objectFit": "cover"  // "cover" | "contain"
        },
        {
          "id": "clip_yyyyyy",
          "kind": "text",
          "start": 0,
          "duration": 90,
          "text": "テロップ",
          "fontSize": 80,
          "fontWeight": 900,
          "color": "#ffffff",
          "background": "rgba(0,0,0,0.45)",
          "align": "left",      // "left" | "center" | "right"
          "x": 70, "y": 330, "width": 940,
          "animation": "spring" // "none" | "spring" | "fade"
        }
      ]
    }
  ]
}
```

## 描画順(レイヤー)
`tracks` 配列の **先頭が最背面、末尾が最前面**。UIのトラックリストは逆順表示(上に行くほど前面)で、
Premiere等の一般的なNLEの見た目に合わせる。

## メディアビンアイテム(`server/media-index.json` に集約)
```jsonc
{
  "id": "media_xxxxxx",
  "filename": "gin_awa.mp4",
  "mediaType": "video",          // "video" | "image" | "audio"
  "url": "/media/xxxxxx.mp4",
  "thumbnailUrl": "/thumbs/xxxxxx.jpg",
  "durationSeconds": 12.4,        // 画像はnull。クリップ生成時に project.fps を掛けてフレーム数に変換する
  "width": 1920, "height": 1080,  // 画像/動画のみ
  "sizeBytes": 1234567
}
```
