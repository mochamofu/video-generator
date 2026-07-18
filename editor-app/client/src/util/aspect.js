export const ASPECT_PRESETS = [
  {id: '9:16', label: '9:16 縦(ショート動画)', width: 1080, height: 1920},
  {id: '16:9', label: '16:9 横(YouTube等)', width: 1920, height: 1080},
  {id: '1:1', label: '1:1 正方形', width: 1080, height: 1080},
  {id: '4:5', label: '4:5 縦(Instagram投稿)', width: 1080, height: 1350},
];

export function presetForSize(width, height) {
  return ASPECT_PRESETS.find((p) => p.width === width && p.height === height) || null;
}
