import {useEffect, useMemo, useRef, useState} from 'react';
import {useEditorStore, projectDurationFrames} from '../store/editorStore';
import {framesToPx, pxToFrames, formatTimecode} from '../util/time';
import Clip from './Clip';
import {MEDIA_DRAG_MIME} from './MediaBin';

const TRACK_TYPE_LABEL = {video: '映像/画像', text: 'テキスト', audio: '音声'};
const TRACK_TYPE_COLOR = {video: 'var(--track-video)', text: 'var(--track-text)', audio: 'var(--track-audio)'};

function niceStepSeconds(targetPx, pxPerSecond) {
  const rawSeconds = targetPx / pxPerSecond;
  const steps = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
  return steps.find((s) => s >= rawSeconds) || 600;
}

export default function Timeline() {
  const project = useEditorStore((s) => s.project);
  const fps = project.fps;
  const pxPerSecond = useEditorStore((s) => s.pxPerSecond);
  const setPxPerSecond = useEditorStore((s) => s.setPxPerSecond);
  const playheadFrame = useEditorStore((s) => s.playheadFrame);
  const setPlayhead = useEditorStore((s) => s.setPlayhead);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectClip = useEditorStore((s) => s.selectClip);
  const mediaBin = useEditorStore((s) => s.mediaBin);

  const addTrack = useEditorStore((s) => s.addTrack);
  const removeTrack = useEditorStore((s) => s.removeTrack);
  const toggleTrackProp = useEditorStore((s) => s.toggleTrackProp);
  const reorderTrack = useEditorStore((s) => s.reorderTrack);
  const renameTrack = useEditorStore((s) => s.renameTrack);
  const addMediaClip = useEditorStore((s) => s.addMediaClip);
  const addTextClip = useEditorStore((s) => s.addTextClip);
  const moveClip = useEditorStore((s) => s.moveClip);
  const setClipLeftEdge = useEditorStore((s) => s.setClipLeftEdge);
  const setClipRightEdge = useEditorStore((s) => s.setClipRightEdge);
  const deleteClip = useEditorStore((s) => s.deleteClip);
  const splitClipAtPlayhead = useEditorStore((s) => s.splitClipAtPlayhead);
  const duplicateClip = useEditorStore((s) => s.duplicateClip);
  const addToast = useEditorStore((s) => s.addToast);

  const durationFrames = projectDurationFrames(project) + Math.round(fps * 5);
  const totalWidth = Math.max(600, framesToPx(durationFrames, fps, pxPerSecond));

  const [dropTargetTrack, setDropTargetTrack] = useState(null);
  const dragInfoRef = useRef(null); // {clipId, kind, startX, originStart, originDuration, originTrackId}
  const dragVisualRef = useRef(null);
  const [dragVisual, setDragVisual] = useState(null); // {clipId, kind, deltaPx, targetTrackId}
  const scrollRef = useRef(null);
  const rulerRef = useRef(null);

  const mediaById = useMemo(() => {
    const map = {};
    for (const m of mediaBin) map[m.id] = m;
    return map;
  }, [mediaBin]);

  // ── ドラッグ(移動/トリム)の実処理 ─────────────────────────
  function startDrag(kind, e, clip, trackId) {
    e.preventDefault();
    e.stopPropagation();
    const info = {
      clipId: clip.id,
      kind,
      startX: e.clientX,
      originStart: clip.start,
      originDuration: clip.duration,
      originTrackId: trackId,
    };
    dragInfoRef.current = info;
    const visual = {clipId: clip.id, kind, deltaPx: 0, targetTrackId: trackId};
    dragVisualRef.current = visual;
    setDragVisual(visual);
  }

  useEffect(() => {
    if (!dragVisual) return undefined;
    function onMove(e) {
      const info = dragInfoRef.current;
      if (!info) return;
      const deltaPx = e.clientX - info.startX;
      let targetTrackId = info.originTrackId;
      if (info.kind === 'move') {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const rowEl = el && el.closest && el.closest('[data-track-id]');
        if (rowEl) targetTrackId = rowEl.getAttribute('data-track-id');
      }
      const next = {clipId: info.clipId, kind: info.kind, deltaPx, targetTrackId};
      dragVisualRef.current = next;
      setDragVisual(next);
      setDropTargetTrack(info.kind === 'move' ? targetTrackId : null);
    }
    function onUp() {
      const info = dragInfoRef.current;
      const visual = dragVisualRef.current;
      if (info && visual) {
        const deltaFrames = pxToFrames(visual.deltaPx, fps, pxPerSecond);
        if (info.kind === 'move') {
          moveClip(info.clipId, visual.targetTrackId, info.originStart + deltaFrames);
        } else if (info.kind === 'trim-left') {
          setClipLeftEdge(info.clipId, info.originStart + deltaFrames);
        } else if (info.kind === 'trim-right') {
          setClipRightEdge(info.clipId, info.originStart + info.originDuration + deltaFrames);
        }
      }
      dragInfoRef.current = null;
      dragVisualRef.current = null;
      setDragVisual(null);
      setDropTargetTrack(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragVisual?.clipId, dragVisual?.kind, fps, pxPerSecond]);

  // ── ルーラーでシーク ─────────────────────────
  function seekFromClientX(clientX) {
    const rect = rulerRef.current.getBoundingClientRect();
    const scrollLeft = scrollRef.current ? scrollRef.current.scrollLeft : 0;
    const px = clientX - rect.left + scrollLeft;
    const frame = Math.max(0, Math.round(pxToFrames(px, fps, pxPerSecond)));
    setPlayhead(frame);
  }
  function onRulerPointerDown(e) {
    seekFromClientX(e.clientX);
    function onMove(ev) { seekFromClientX(ev.clientX); }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  // ── メディアビンからのドロップ ─────────────────────────
  function onTrackDrop(e, track) {
    e.preventDefault();
    setDropTargetTrack(null);
    const raw = e.dataTransfer.getData(MEDIA_DRAG_MIME);
    if (!raw) return;
    let item;
    try { item = JSON.parse(raw); } catch { return; }
    if (track.type === 'audio' && item.mediaType !== 'audio') {
      addToast('音声トラックには音声ファイルのみ配置できます', 'error');
      return;
    }
    if (track.type === 'text') {
      addToast('テキストトラックにはメディアを配置できません(＋テキストボタンを使ってください)', 'error');
      return;
    }
    const rowEl = e.currentTarget;
    const rect = rowEl.getBoundingClientRect();
    const scrollLeft = scrollRef.current ? scrollRef.current.scrollLeft : 0;
    const px = e.clientX - rect.left + scrollLeft;
    const startFrame = Math.max(0, Math.round(pxToFrames(px, fps, pxPerSecond)));
    addMediaClip(track.id, item, startFrame);
  }

  // ── 再生ヘッド線 ─────────────────────────
  const playheadPx = framesToPx(playheadFrame, fps, pxPerSecond);

  // ── ルーラー目盛り ─────────────────────────
  const stepSeconds = niceStepSeconds(80, pxPerSecond);
  const tickCount = Math.ceil((durationFrames / fps) / stepSeconds) + 1;
  const ticks = Array.from({length: tickCount}, (_, i) => i * stepSeconds);

  const displayTracks = [...project.tracks].reverse(); // 上に行くほど前面

  function handleAddText() {
    // Zustandのset()は同期的に反映されるため、addTrack直後にgetState()で最新を読める
    let track = project.tracks.find((t) => t.type === 'text');
    if (!track) {
      addTrack('text');
      const updated = useEditorStore.getState().project;
      track = updated.tracks.find((t) => t.type === 'text');
    }
    addTextClip(track.id, playheadFrame);
  }

  return (
    <div className="timeline-panel">
      <div className="timeline-toolbar">
        <button className="primary" onClick={handleAddText}>＋ テキストを追加</button>
        <div style={{width: 1, height: 20, background: 'var(--line)'}} />
        <button onClick={() => addTrack('video')}>＋映像/画像トラック</button>
        <button onClick={() => addTrack('text')}>＋テキストトラック</button>
        <button onClick={() => addTrack('audio')}>＋音声トラック</button>
        <div style={{width: 1, height: 20, background: 'var(--line)'}} />
        <button
          disabled={!selectedClipId}
          onClick={() => splitClipAtPlayhead()}
          title="再生ヘッドの位置で選択中クリップを分割 (S)"
        >
          ✂ 分割
        </button>
        <button
          disabled={!selectedClipId}
          onClick={() => selectedClipId && duplicateClip(selectedClipId)}
        >
          ⧉ 複製
        </button>
        <button
          disabled={!selectedClipId}
          className="danger"
          onClick={() => selectedClipId && deleteClip(selectedClipId)}
          title="選択中クリップを削除 (Delete)"
        >
          🗑 削除
        </button>
        <div className="spacer" />
        <span className="tc">{formatTimecode(playheadFrame, fps)} / {formatTimecode(projectDurationFrames(project), fps)}</span>
        <button onClick={() => setPxPerSecond(pxPerSecond / 1.4)}>－</button>
        <button onClick={() => setPxPerSecond(pxPerSecond * 1.4)}>＋</button>
      </div>
      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-inner" style={{width: totalWidth + 150}}>
          <div className="track-headers">
            <div className="ruler-spacer" />
            {displayTracks.map((track) => (
              <div className="track-header" key={track.id}>
                <div className="name-row">
                  <span className="badge" style={{background: TRACK_TYPE_COLOR[track.type]}}>
                    {TRACK_TYPE_LABEL[track.type]}
                  </span>
                  <input
                    className="name"
                    value={track.name}
                    onChange={(e) => renameTrack(track.id, e.target.value)}
                  />
                </div>
                <div className="btns">
                  <button onClick={() => reorderTrack(track.id, -1)} title="前面へ">▲</button>
                  <button onClick={() => reorderTrack(track.id, 1)} title="背面へ">▼</button>
                  <button
                    onClick={() => toggleTrackProp(track.id, 'muted')}
                    title="ミュート"
                    style={{color: track.muted ? 'var(--danger)' : undefined}}
                  >
                    {track.muted ? '🔇' : '🔊'}
                  </button>
                  <button
                    onClick={() => toggleTrackProp(track.id, 'hidden')}
                    title="表示/非表示"
                    style={{color: track.hidden ? 'var(--danger)' : undefined}}
                  >
                    {track.hidden ? '🙈' : '👁'}
                  </button>
                  <button className="danger" onClick={() => removeTrack(track.id)} title="トラック削除">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="tracks-area" style={{width: totalWidth, position: 'relative'}}>
            <div className="ruler" ref={rulerRef} onPointerDown={onRulerPointerDown}>
              {ticks.map((sec) => (
                <div key={sec} className="tick" style={{left: framesToPx(sec * fps, fps, pxPerSecond)}}>
                  {sec}s
                </div>
              ))}
            </div>

            {displayTracks.map((track) => (
              <div
                key={track.id}
                className={`track-row ${dropTargetTrack === track.id ? 'drop-target' : ''}`}
                data-track-id={track.id}
                onDragOver={(e) => { e.preventDefault(); setDropTargetTrack(track.id); }}
                onDragLeave={() => setDropTargetTrack((t) => (t === track.id ? null : t))}
                onDrop={(e) => onTrackDrop(e, track)}
              >
                {track.clips.map((clip) => {
                  const isDragging = dragVisual && dragVisual.clipId === clip.id;
                  const thumb =
                    clip.kind === 'media' && clip.mediaId && mediaById[clip.mediaId]
                      ? mediaById[clip.mediaId].thumbnailUrl
                      : null;
                  // ドラッグ中に別トラックへ移動している場合、元トラックでは非表示にして移動先だけに描く
                  if (isDragging && dragVisual.kind === 'move' && dragVisual.targetTrackId !== track.id) {
                    return null;
                  }
                  return (
                    <Clip
                      key={clip.id}
                      clip={clip}
                      fps={fps}
                      pxPerSecond={pxPerSecond}
                      selected={selectedClipId === clip.id}
                      isDragging={isDragging}
                      dragOffsetPx={isDragging && dragVisual.kind === 'move' ? dragVisual.deltaPx : 0}
                      resizeEdge={isDragging && dragVisual.kind.startsWith('trim') ? dragVisual.kind.replace('trim-', '') : null}
                      resizeDeltaPx={isDragging ? dragVisual.deltaPx : 0}
                      thumbnailUrl={thumb}
                      onSelect={selectClip}
                      onPointerDownMove={(e, c) => startDrag('move', e, c, track.id)}
                      onPointerDownEdge={(e, c, edge) => startDrag(edge === 'left' ? 'trim-left' : 'trim-right', e, c, track.id)}
                    />
                  );
                })}
              </div>
            ))}

            <div className="playhead" style={{left: playheadPx, top: 24, bottom: 0}}>
              <div className="playhead-handle" style={{top: -24}} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
