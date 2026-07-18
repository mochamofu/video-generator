import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';

// 動きのある背景: ベースグラデーション + ゆっくり漂う光のブロブ + ドットグリッド
export const Background: React.FC<{bg0: string; bg1: string; accent: string}> = ({
  bg0,
  bg1,
  accent,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const blob = (
    speed: number,
    phase: number,
    size: number,
    color: string,
    opacity: number,
  ) => {
    const x = 540 + Math.sin(t * speed + phase) * 380;
    const y = 800 + Math.cos(t * speed * 0.8 + phase * 1.7) * 620;
    return (
      <div
        style={{
          position: 'absolute',
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
          opacity,
          filter: 'blur(40px)',
        }}
      />
    );
  };

  return (
    <AbsoluteFill
      style={{background: `linear-gradient(160deg, ${bg0} 0%, ${bg1} 100%)`}}
    >
      {blob(0.25, 0, 900, accent, 0.22)}
      {blob(0.18, 2.4, 1100, bg1, 0.5)}
      {blob(0.32, 4.1, 700, accent, 0.14)}
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.07) 2px, transparent 2px)',
          backgroundSize: '54px 54px',
          backgroundPosition: `0px ${(-t * 14) % 54}px`,
        }}
      />
    </AbsoluteFill>
  );
};
