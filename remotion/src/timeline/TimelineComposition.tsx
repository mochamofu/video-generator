import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

export type MediaClip = {
  id: string;
  kind: 'media';
  mediaType: 'video' | 'image' | 'audio';
  src: string;
  start: number;
  duration: number;
  trimStart?: number;
  volume?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  objectFit?: 'cover' | 'contain';
};

export type TextClip = {
  id: string;
  kind: 'text';
  start: number;
  duration: number;
  text: string;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  background?: string;
  align?: 'left' | 'center' | 'right';
  x?: number;
  y?: number;
  width?: number;
  animation?: 'none' | 'spring' | 'fade';
};

export type Clip = MediaClip | TextClip;

export type Track = {
  id: string;
  type: 'video' | 'text' | 'audio';
  name: string;
  muted?: boolean;
  hidden?: boolean;
  clips: Clip[];
};

export type TimelineProject = {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
  tracks: Track[];
};

export const FPS_DEFAULT = 30;

export const defaultProject: TimelineProject = {
  id: 'proj_default',
  name: '無題プロジェクト',
  width: 1080,
  height: 1920,
  fps: 30,
  tracks: [
    {
      id: 'trk_1',
      type: 'text',
      name: 'テキスト',
      clips: [
        {
          id: 'clip_1',
          kind: 'text',
          start: 0,
          duration: 90,
          text: 'ここにテロップ',
          fontSize: 80,
          color: '#ffffff',
          x: 70,
          y: 800,
          width: 940,
        },
      ],
    },
  ],
};

/** プロジェクト全体の長さ(フレーム)を算出 */
export function projectDurationFrames(project: TimelineProject): number {
  let max = 30;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.start + clip.duration);
    }
  }
  return max;
}

const TextClipView: React.FC<{clip: TextClip; localFrame: number; fps: number}> = ({
  clip,
  localFrame,
  fps,
}) => {
  const anim = clip.animation ?? 'spring';
  let opacity = 1;
  let translateX = 0;
  if (anim === 'spring') {
    const s = spring({frame: localFrame, fps, config: {damping: 13, mass: 0.8}});
    opacity = s;
    translateX = interpolate(s, [0, 1], [-40, 0]);
  } else if (anim === 'fade') {
    opacity = interpolate(localFrame, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: clip.x ?? 0,
        top: clip.y ?? 0,
        width: clip.width ?? 800,
        opacity,
        transform: `translateX(${translateX}px)`,
        textAlign: clip.align ?? 'left',
      }}
    >
      <span
        style={{
          display: 'inline',
          fontSize: clip.fontSize ?? 80,
          fontWeight: clip.fontWeight ?? 900,
          color: clip.color ?? '#ffffff',
          lineHeight: 1.3,
          whiteSpace: 'pre-wrap',
          background: clip.background ?? 'transparent',
          boxDecorationBreak: 'clone',
          WebkitBoxDecorationBreak: 'clone',
          fontFamily:
            '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif',
        }}
      >
        {clip.text}
      </span>
    </div>
  );
};

const MediaClipView: React.FC<{clip: MediaClip; project: TimelineProject}> = ({
  clip,
  project,
}) => {
  const x = clip.x ?? 0;
  const y = clip.y ?? 0;
  const width = clip.width ?? project.width;
  const height = clip.height ?? project.height;
  const fit = clip.objectFit ?? 'cover';
  const trimStart = clip.trimStart ?? 0;

  const boxStyle: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width,
    height,
    overflow: 'hidden',
  };
  const mediaStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: fit,
  };

  if (clip.mediaType === 'image') {
    return (
      <div style={boxStyle}>
        <Img src={clip.src} style={mediaStyle} />
      </div>
    );
  }
  if (clip.mediaType === 'video') {
    return (
      <div style={boxStyle}>
        <OffthreadVideo
          src={clip.src}
          style={mediaStyle}
          startFrom={trimStart}
          volume={clip.volume ?? 1}
        />
      </div>
    );
  }
  // audio: 画面には出さない
  return <Audio src={clip.src} startFrom={trimStart} volume={clip.volume ?? 1} />;
};

/** プロジェクトJSONから縦/横どちらの比率でも動画を合成する汎用コンポジション */
export const TimelineComposition: React.FC<{project: TimelineProject}> = ({
  project,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{background: '#000000'}}>
      {project.tracks.map((track) => {
        if (track.hidden) return null;
        return track.clips.map((clip) => {
          if (clip.kind === 'media' && clip.mediaType === 'audio' && track.muted) {
            return null;
          }
          if (clip.kind === 'media' && track.muted) {
            // 映像は出すが音声はミュート
            return (
              <Sequence key={clip.id} from={clip.start} durationInFrames={clip.duration}>
                <MediaClipView clip={{...clip, volume: 0}} project={project} />
              </Sequence>
            );
          }
          return (
            <Sequence key={clip.id} from={clip.start} durationInFrames={clip.duration}>
              {clip.kind === 'text' ? (
                <TextClipView clip={clip} localFrame={frame - clip.start} fps={fps} />
              ) : (
                <MediaClipView clip={clip} project={project} />
              )}
            </Sequence>
          );
        });
      })}
    </AbsoluteFill>
  );
};
