export function framesToPx(frames, fps, pxPerSecond) {
  return (frames / fps) * pxPerSecond;
}

export function pxToFrames(px, fps, pxPerSecond) {
  return (px / pxPerSecond) * fps;
}

export function formatTimecode(frames, fps) {
  const totalSeconds = frames / fps;
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  const f = Math.round(frames % fps);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(f).padStart(2, '0')}`;
}
