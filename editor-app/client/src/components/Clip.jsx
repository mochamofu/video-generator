import {framesToPx} from '../util/time';

const KIND_COLOR = {
  text: 'var(--track-text-dark)',
  audio: 'var(--track-audio-dark)',
  video: 'var(--track-video-dark)',
  image: 'var(--track-video-dark)',
};

function clipColor(clip) {
  if (clip.kind === 'text') return KIND_COLOR.text;
  if (clip.mediaType === 'audio') return KIND_COLOR.audio;
  return KIND_COLOR.video;
}

function clipLabel(clip) {
  if (clip.kind === 'text') return clip.text.split('\n')[0] || '(空のテキスト)';
  return clip.mediaId ? clip.mediaLabel || clip.mediaType : clip.mediaType;
}

export default function Clip({
  clip, fps, pxPerSecond, selected, dragOffsetPx = 0, resizeDeltaPx = 0, resizeEdge = null,
  isDragging, thumbnailUrl, onSelect, onPointerDownMove, onPointerDownEdge,
}) {
  let left = framesToPx(clip.start, fps, pxPerSecond);
  let width = Math.max(6, framesToPx(clip.duration, fps, pxPerSecond));

  if (isDragging && dragOffsetPx) {
    left += dragOffsetPx;
  }
  if (resizeEdge === 'left') {
    const clampedDelta = Math.min(resizeDeltaPx, width - 6);
    left += clampedDelta;
    width -= clampedDelta;
  } else if (resizeEdge === 'right') {
    width = Math.max(6, width + resizeDeltaPx);
  }

  return (
    <div
      className={`clip ${selected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{left, width, background: clipColor(clip)}}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        onSelect(clip.id);
        onPointerDownMove(e, clip);
      }}
      title={clipLabel(clip)}
    >
      {thumbnailUrl && <div className="thumb" style={{backgroundImage: `url(${thumbnailUrl})`}} />}
      <div className="clip-body">{clipLabel(clip)}</div>
      <div
        className="edge left"
        onPointerDown={(e) => { e.stopPropagation(); onSelect(clip.id); onPointerDownEdge(e, clip, 'left'); }}
      />
      <div
        className="edge right"
        onPointerDown={(e) => { e.stopPropagation(); onSelect(clip.id); onPointerDownEdge(e, clip, 'right'); }}
      />
    </div>
  );
}
