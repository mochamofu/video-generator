import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

// シーンテロップ: 行ごとにスプリングで飛び込むキネティックタイポグラフィ
export const KineticText: React.FC<{
  text: string;
  emoji?: string;
  accent: string;
  textColor: string;
  sceneStart: number; // frame
  sceneEnd: number;   // frame
}> = ({text, emoji, accent, textColor, sceneStart, sceneEnd}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - sceneStart;
  const outStart = sceneEnd - sceneStart - Math.round(fps * 0.25);
  const exit = interpolate(local, [outStart, sceneEnd - sceneStart], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const lines = text.split('\n');

  return (
    <div
      style={{
        position: 'absolute',
        top: 330,
        left: 70,
        right: 70,
        opacity: exit,
        transform: `translateY(${(1 - exit) * -30}px)`,
      }}
    >
      {emoji ? (
        <div
          style={{
            fontSize: 150,
            lineHeight: 1,
            marginBottom: 26,
            transform: `scale(${spring({
              frame: local - 2,
              fps,
              config: {damping: 9, mass: 0.7},
            })}) rotate(${Math.sin(frame / fps) * 4}deg)`,
            transformOrigin: 'bottom left',
          }}
        >
          {emoji}
        </div>
      ) : null}
      {lines.map((line, i) => {
        const s = spring({
          frame: local - i * 5,
          fps,
          config: {damping: 13, mass: 0.8},
        });
        return (
          <div
            key={i}
            style={{
              transform: `translateX(${interpolate(s, [0, 1], [-90, 0])}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
              opacity: s,
              transformOrigin: 'left center',
              marginBottom: 14,
            }}
          >
            <span
              style={{
                display: 'inline',
                fontSize: 92,
                fontWeight: 900,
                lineHeight: 1.32,
                color: textColor,
                background: 'rgba(0,0,0,0.45)',
                boxShadow: `-14px 0 0 rgba(0,0,0,0.45), 14px 0 0 rgba(0,0,0,0.45), inset 0 -14px 0 ${accent}55`,
                boxDecorationBreak: 'clone',
                WebkitBoxDecorationBreak: 'clone',
              }}
            >
              {line}
            </span>
          </div>
        );
      })}
    </div>
  );
};
