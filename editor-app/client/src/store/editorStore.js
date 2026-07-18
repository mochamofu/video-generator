import {create} from 'zustand';
import {uid} from '../util/id';
import {ASPECT_PRESETS} from '../util/aspect';

const DEFAULT_FPS = 30;

function emptyProject() {
  const preset = ASPECT_PRESETS[0];
  return {
    id: null,
    name: '無題プロジェクト',
    width: preset.width,
    height: preset.height,
    fps: DEFAULT_FPS,
    tracks: [
      {id: uid('trk'), type: 'text', name: 'テキスト', clips: []},
      {id: uid('trk'), type: 'video', name: 'V1', clips: []},
    ],
  };
}

function findClip(project, clipId) {
  for (const track of project.tracks) {
    const clip = track.clips.find((c) => c.id === clipId);
    if (clip) return {track, clip};
  }
  return null;
}

export function projectDurationFrames(project) {
  let max = 30;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.start + clip.duration);
    }
  }
  return max;
}

export const useEditorStore = create((set, get) => ({
  project: emptyProject(),
  selectedClipId: null,
  playheadFrame: 0,
  pxPerSecond: 60,
  isPlaying: false,
  mediaBin: [],
  projectsList: [],
  isDirty: false,
  renderJob: null, // {jobId, state, progress, message}
  lastError: null,
  toasts: [],

  // ── プロジェクト全体 ─────────────────────────
  newProject: () => set({project: emptyProject(), selectedClipId: null, playheadFrame: 0, isDirty: false}),

  loadProject: (project) => set({project, selectedClipId: null, playheadFrame: 0, isDirty: false}),

  setProjectName: (name) => set((s) => ({project: {...s.project, name}, isDirty: true})),

  setAspectRatio: (width, height) =>
    set((s) => ({project: {...s.project, width, height}, isDirty: true})),

  markSaved: (savedProject) => set({project: savedProject, isDirty: false}),

  setMediaBin: (items) => set({mediaBin: items}),
  addMediaItem: (item) => set((s) => ({mediaBin: [...s.mediaBin, item]})),
  removeMediaItem: (id) => set((s) => ({mediaBin: s.mediaBin.filter((m) => m.id !== id)})),

  setProjectsList: (list) => set({projectsList: list}),

  setLastError: (msg) => set({lastError: msg}),

  // ── トラック ─────────────────────────
  addTrack: (type) =>
    set((s) => {
      const count = s.project.tracks.filter((t) => t.type === type).length + 1;
      const label = type === 'video' ? `V${count}` : type === 'audio' ? `A${count}` : `T${count}`;
      const track = {id: uid('trk'), type, name: label, clips: []};
      return {project: {...s.project, tracks: [...s.project.tracks, track]}, isDirty: true};
    }),

  removeTrack: (trackId) =>
    set((s) => ({
      project: {...s.project, tracks: s.project.tracks.filter((t) => t.id !== trackId)},
      isDirty: true,
    })),

  toggleTrackProp: (trackId, prop) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) =>
          t.id === trackId ? {...t, [prop]: !t[prop]} : t
        ),
      },
      isDirty: true,
    })),

  reorderTrack: (trackId, direction) =>
    set((s) => {
      const tracks = [...s.project.tracks];
      const idx = tracks.findIndex((t) => t.id === trackId);
      const swapIdx = idx + direction;
      if (idx < 0 || swapIdx < 0 || swapIdx >= tracks.length) return {};
      [tracks[idx], tracks[swapIdx]] = [tracks[swapIdx], tracks[idx]];
      return {project: {...s.project, tracks}, isDirty: true};
    }),

  renameTrack: (trackId, name) =>
    set((s) => ({
      project: {
        ...s.project,
        tracks: s.project.tracks.map((t) => (t.id === trackId ? {...t, name} : t)),
      },
      isDirty: true,
    })),

  // ── クリップ追加 ─────────────────────────
  addMediaClip: (trackId, mediaItem, startFrame) =>
    set((s) => {
      const fps = s.project.fps;
      const durationFrames = mediaItem.durationSeconds
        ? Math.max(1, Math.round(mediaItem.durationSeconds * fps))
        : Math.round(3 * fps);
      const clip = {
        id: uid('clip'),
        kind: 'media',
        mediaId: mediaItem.id,
        mediaType: mediaItem.mediaType,
        src: mediaItem.url,
        start: Math.max(0, Math.round(startFrame)),
        duration: durationFrames,
        trimStart: 0,
        sourceDurationFrames: mediaItem.durationSeconds ? durationFrames : null,
        volume: 1,
        x: 0,
        y: 0,
        width: s.project.width,
        height: s.project.height,
        objectFit: 'cover',
      };
      const tracks = s.project.tracks.map((t) =>
        t.id === trackId ? {...t, clips: [...t.clips, clip]} : t
      );
      return {project: {...s.project, tracks}, isDirty: true, selectedClipId: clip.id};
    }),

  /** ドラッグ操作なしでメディアビンから追加するためのフォールバック(ダブルクリック等) */
  addMediaAtPlayhead: (mediaItem) =>
    set((s) => {
      const wantType = mediaItem.mediaType === 'audio' ? 'audio' : 'video';
      let track = s.project.tracks.find((t) => t.type === wantType);
      let tracks = s.project.tracks;
      if (!track) {
        track = {id: uid('trk'), type: wantType, name: wantType === 'audio' ? 'A1' : 'V1', clips: []};
        tracks = [...tracks, track];
      }
      const fps = s.project.fps;
      const durationFrames = mediaItem.durationSeconds
        ? Math.max(1, Math.round(mediaItem.durationSeconds * fps))
        : Math.round(3 * fps);
      const clip = {
        id: uid('clip'),
        kind: 'media',
        mediaId: mediaItem.id,
        mediaType: mediaItem.mediaType,
        src: mediaItem.url,
        start: s.playheadFrame,
        duration: durationFrames,
        trimStart: 0,
        sourceDurationFrames: mediaItem.durationSeconds ? durationFrames : null,
        volume: 1,
        x: 0,
        y: 0,
        width: s.project.width,
        height: s.project.height,
        objectFit: 'cover',
      };
      tracks = tracks.map((t) => (t.id === track.id ? {...t, clips: [...t.clips, clip]} : t));
      return {project: {...s.project, tracks}, isDirty: true, selectedClipId: clip.id};
    }),

  addTextClip: (trackId, startFrame) =>
    set((s) => {
      const clip = {
        id: uid('clip'),
        kind: 'text',
        start: Math.max(0, Math.round(startFrame)),
        duration: Math.round(3 * s.project.fps),
        text: 'テロップ',
        fontSize: 80,
        fontWeight: 900,
        color: '#ffffff',
        background: 'rgba(0,0,0,0.45)',
        align: 'left',
        x: Math.round(s.project.width * 0.08),
        y: Math.round(s.project.height * 0.42),
        width: Math.round(s.project.width * 0.84),
        animation: 'spring',
      };
      const tracks = s.project.tracks.map((t) =>
        t.id === trackId ? {...t, clips: [...t.clips, clip]} : t
      );
      return {project: {...s.project, tracks}, isDirty: true, selectedClipId: clip.id};
    }),

  // ── クリップ編集 ─────────────────────────
  updateClip: (clipId, patch) =>
    set((s) => {
      const tracks = s.project.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? {...c, ...patch} : c)),
      }));
      return {project: {...s.project, tracks}, isDirty: true};
    }),

  moveClip: (clipId, targetTrackId, newStartFrame) =>
    set((s) => {
      const found = findClip(s.project, clipId);
      if (!found) return {};
      const clampedStart = Math.max(0, Math.round(newStartFrame));
      const movedClip = {...found.clip, start: clampedStart};
      const tracks = s.project.tracks.map((t) => {
        if (t.id === found.track.id && t.id === targetTrackId) {
          return {...t, clips: t.clips.map((c) => (c.id === clipId ? movedClip : c))};
        }
        if (t.id === found.track.id) {
          return {...t, clips: t.clips.filter((c) => c.id !== clipId)};
        }
        if (t.id === targetTrackId) {
          return {...t, clips: [...t.clips, movedClip]};
        }
        return t;
      });
      return {project: {...s.project, tracks}, isDirty: true};
    }),

  setClipLeftEdge: (clipId, newStartFrame) =>
    set((s) => {
      const found = findClip(s.project, clipId);
      if (!found) return {};
      const {clip} = found;
      const trimStart = clip.trimStart || 0;
      const minStart = clip.kind === 'media' ? Math.max(0, clip.start - trimStart) : 0;
      const maxStart = clip.start + clip.duration - 1;
      const clamped = Math.max(minStart, Math.min(Math.round(newStartFrame), maxStart));
      const delta = clamped - clip.start;
      const patch = {
        start: clamped,
        duration: clip.duration - delta,
      };
      if (clip.kind === 'media') patch.trimStart = trimStart + delta;
      return updateClipInState(s, clipId, patch);
    }),

  setClipRightEdge: (clipId, newEndFrame) =>
    set((s) => {
      const found = findClip(s.project, clipId);
      if (!found) return {};
      const {clip} = found;
      const minEnd = clip.start + 1;
      const maxEnd =
        clip.kind === 'media' && clip.sourceDurationFrames != null
          ? clip.start + (clip.sourceDurationFrames - (clip.trimStart || 0))
          : Infinity;
      const clamped = Math.max(minEnd, Math.min(Math.round(newEndFrame), maxEnd));
      return updateClipInState(s, clipId, {duration: clamped - clip.start});
    }),

  splitClipAtPlayhead: () =>
    set((s) => {
      const clipId = s.selectedClipId;
      if (!clipId) return {};
      const found = findClip(s.project, clipId);
      if (!found) return {};
      const {track, clip} = found;
      const at = s.playheadFrame;
      if (at <= clip.start || at >= clip.start + clip.duration) return {};
      const leftDuration = at - clip.start;
      const rightDuration = clip.duration - leftDuration;
      const newClip = {
        ...clip,
        id: uid('clip'),
        start: at,
        duration: rightDuration,
      };
      if (clip.kind === 'media') newClip.trimStart = (clip.trimStart || 0) + leftDuration;
      const tracks = s.project.tracks.map((t) => {
        if (t.id !== track.id) return t;
        const clips = t.clips.map((c) => (c.id === clipId ? {...c, duration: leftDuration} : c));
        clips.push(newClip);
        return {...t, clips};
      });
      return {project: {...s.project, tracks}, isDirty: true, selectedClipId: newClip.id};
    }),

  deleteClip: (clipId) =>
    set((s) => {
      const tracks = s.project.tracks.map((t) => ({
        ...t,
        clips: t.clips.filter((c) => c.id !== clipId),
      }));
      return {
        project: {...s.project, tracks},
        isDirty: true,
        selectedClipId: s.selectedClipId === clipId ? null : s.selectedClipId,
      };
    }),

  duplicateClip: (clipId) =>
    set((s) => {
      const found = findClip(s.project, clipId);
      if (!found) return {};
      const {track, clip} = found;
      const newClip = {...clip, id: uid('clip'), start: clip.start + clip.duration};
      const tracks = s.project.tracks.map((t) =>
        t.id === track.id ? {...t, clips: [...t.clips, newClip]} : t
      );
      return {project: {...s.project, tracks}, isDirty: true, selectedClipId: newClip.id};
    }),

  // ── 選択 / 再生ヘッド / ズーム ─────────────────────────
  selectClip: (clipId) => set({selectedClipId: clipId}),
  setPlayhead: (frame) => set({playheadFrame: Math.max(0, Math.round(frame))}),
  setIsPlaying: (v) => set({isPlaying: v}),
  setPxPerSecond: (v) => set({pxPerSecond: Math.max(8, Math.min(400, v))}),

  // ── 書き出しジョブ ─────────────────────────
  setRenderJob: (job) => set({renderJob: job}),

  // ── トースト通知 ─────────────────────────
  addToast: (message, type = 'info') =>
    set((s) => {
      const toast = {id: uid('toast'), message, type};
      setTimeout(() => get().removeToast(toast.id), type === 'error' ? 6000 : 3000);
      return {toasts: [...s.toasts, toast]};
    }),
  removeToast: (id) => set((s) => ({toasts: s.toasts.filter((t) => t.id !== id)})),
}));

function updateClipInState(s, clipId, patch) {
  const tracks = s.project.tracks.map((t) => ({
    ...t,
    clips: t.clips.map((c) => (c.id === clipId ? {...c, ...patch} : c)),
  }));
  return {project: {...s.project, tracks}, isDirty: true};
}
