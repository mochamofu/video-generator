import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {Background} from './Background';
import {Character, type CharacterAssets} from './Character';
import {KineticText} from './KineticText';

export const FPS = 30;

export type Scene = {
  text: string;
  emoji?: string;
  start: number; // 秒
  end: number;   // 秒
};

export type VideoProps = {
  title: string;
  scenes: Scene[];
  audioSrc: string; // public/ 配下の相対パス
  character: CharacterAssets;
  characterWidth: number;
  total: number; // 秒
  bg0: string;
  bg1: string;
  accent: string;
  textColor: string;
};

export const defaultProps: VideoProps = {
  title: 'サンプル',
  scenes: [{text: 'こんにちは', start: 0, end: 3}],
  audioSrc: 'job/sample/audio.wav',
  character: {
    closed: 'character/closed.png',
    open: 'character/open.png',
    blink: 'character/blink.png',
  },
  characterWidth: 780,
  total: 3,
  bg0: '#101a3c',
  bg1: '#233d8a',
  accent: '#4dd0e1',
  textColor: '#ffffff',
};

const FONT =
  '"Noto Sans CJK JP", "Hiragino Sans", "Yu Gothic", "Meiryo", "IPAPGothic", sans-serif';

export const ShortVideo: React.FC<VideoProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const titleIn = spring({frame: frame - 4, fps, config: {damping: 12}});

  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <Background bg0={props.bg0} bg1={props.bg1} accent={props.accent} />

      {/* キャラクター (口パク) */}
      <Character
        assets={props.character}
        audioSrc={props.audioSrc}
        width={props.characterWidth}
      />

      {/* タイトルチップ */}
      <div
        style={{
          position: 'absolute',
          top: 108,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          transform: `translateY(${interpolate(titleIn, [0, 1], [-160, 0])}px)`,
        }}
      >
        <div
          style={{
            background: props.accent,
            color: '#0b1020',
            fontSize: 52,
            fontWeight: 900,
            lineHeight: 1.25,
            padding: '18px 44px',
            borderRadius: 999,
            boxShadow: '0 10px 34px rgba(0,0,0,0.35)',
            whiteSpace: 'pre-wrap',
            textAlign: 'center',
            maxWidth: 940,
          }}
        >
          {props.title.replace(/\n/g, '')}
        </div>
      </div>

      {/* シーンテロップ */}
      {props.scenes.map((sc, i) => {
        const from = Math.round(sc.start * fps);
        const to = Math.min(Math.round(sc.end * fps), durationInFrames);
        return (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <KineticText
              text={sc.text}
              emoji={sc.emoji}
              accent={props.accent}
              textColor={props.textColor}
              sceneStart={0}
              sceneEnd={to - from}
            />
          </Sequence>
        );
      })}

      {/* プログレスバー */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          height: 14,
          width: `${(frame / durationInFrames) * 100}%`,
          background: props.accent,
          boxShadow: `0 0 18px ${props.accent}`,
        }}
      />

      <Audio src={staticFile(props.audioSrc)} />
    </AbsoluteFill>
  );
};
