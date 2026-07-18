import {useEffect, useRef} from 'react';
import {Player} from '@remotion/player';
import {TimelineComposition} from '@timeline/TimelineComposition';
import {useEditorStore, projectDurationFrames} from '../store/editorStore';
import {formatTimecode} from '../util/time';

const MAX_PREVIEW_WIDTH = 420;
const MAX_PREVIEW_HEIGHT = 560;

export default function PreviewPlayer() {
  const project = useEditorStore((s) => s.project);
  const playheadFrame = useEditorStore((s) => s.playheadFrame);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const setIsPlaying = useEditorStore((s) => s.setIsPlaying);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const updateClip = useEditorStore((s) => s.updateClip);

  const playerRef = useRef(null);
  const selfUpdate = useRef(false);
  const durationInFrames = Math.max(30, projectDurationFrames(project));

  let activeSelectedClip = null;
  for (const track of project.tracks) {
    const c = track.clips.find(
      (cl) =>
        cl.id === selectedClipId &&
        playheadFrame >= cl.start &&
        playheadFrame < cl.start + cl.duration
    );
    if (c) { activeSelectedClip = c; break; }
  }

  // タイムライン側からのシーク(外部要因)のみ Player に反映する
  useEffect(() => {
    if (!playerRef.current) return;
    if (selfUpdate.current) {
      selfUpdate.current = false;
      return;
    }
    playerRef.current.seekTo(playheadFrame);
  }, [playheadFrame]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return undefined;
    const onFrame = (e) => {
      selfUpdate.current = true;
      setPlayhead(e.detail.frame);
    };
    const onEnded = () => setIsPlaying(false);
    player.addEventListener('frameupdate', onFrame);
    player.addEventListener('ended', onEnded);
    return () => {
      player.removeEventListener('frameupdate', onFrame);
      player.removeEventListener('ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerRef.current]);

  useEffect(() => {
    if (!playerRef.current) return;
    if (isPlaying) playerRef.current.play();
    else playerRef.current.pause();
  }, [isPlaying]);

  const scale = Math.min(MAX_PREVIEW_WIDTH / project.width, MAX_PREVIEW_HEIGHT / project.height, 1);
  const dispW = Math.round(project.width * scale);
  const dispH = Math.round(project.height * scale);

  function onOverlayPointerDown(e) {
    e.preventDefault();
    e.stopPropagation();
    const clip = activeSelectedClip;
    if (!clip) return;
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = clip.x ?? 0;
    const originY = clip.y ?? 0;
    function onMove(ev) {
      const dx = (ev.clientX - startX) / scale;
      const dy = (ev.clientY - startY) / scale;
      updateClip(clip.id, {x: Math.round(originX + dx), y: Math.round(originY + dy)});
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div className="preview-area">
      <div className="preview-canvas-wrap" style={{width: dispW, height: dispH}}>
        <Player
          ref={playerRef}
          component={TimelineComposition}
          inputProps={{project}}
          durationInFrames={durationInFrames}
          compositionWidth={project.width}
          compositionHeight={project.height}
          fps={project.fps}
          style={{width: dispW, height: dispH}}
          controls={false}
          clickToPlay={false}
          initialFrame={playheadFrame}
        />
        {activeSelectedClip && (
          <div
            className="canvas-drag-layer"
            style={{width: dispW, height: dispH, pointerEvents: 'none'}}
          >
            <div
              className="canvas-drag-box"
              style={{
                left: (activeSelectedClip.x ?? 0) * scale,
                top: (activeSelectedClip.y ?? 0) * scale,
                width: (activeSelectedClip.width ?? project.width) * scale,
                height:
                  (activeSelectedClip.kind === 'text' ? 44 : activeSelectedClip.height ?? project.height) *
                  (activeSelectedClip.kind === 'text' ? 1 : scale),
                pointerEvents: 'auto',
              }}
              onPointerDown={onOverlayPointerDown}
              title="ドラッグで位置を移動"
            />
          </div>
        )}
      </div>
      <div className="preview-controls">
        <button onClick={() => setPlayhead(0)} title="先頭へ">⏮</button>
        <button onClick={() => setIsPlaying(!isPlaying)} title="再生/一時停止 (Space)">
          {isPlaying ? '⏸' : '▶'}
        </button>
        <span className="tc">
          {formatTimecode(playheadFrame, project.fps)} / {formatTimecode(durationInFrames, project.fps)}
        </span>
        <span className="tc">{project.width}×{project.height} / {project.fps}fps</span>
      </div>
    </div>
  );
}
