import {Img, OffthreadVideo, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

// 実写素材(製品写真・体験シーン等)を角丸カードで表示
export const MediaCard: React.FC<{
  src: string;
  mediaType: 'image' | 'video';
  compact: boolean; // キャラと同居する場合は少し小さく
}> = ({src, mediaType, compact}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - 3, fps, config: {damping: 13, mass: 0.9}});
  const drift = Math.sin(frame / fps / 1.4) * 6;

  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: compact ? 720 : 780,
        left: 70,
        right: 70,
        height: compact ? 560 : 720,
        borderRadius: 40,
        overflow: 'hidden',
        boxShadow: '0 24px 70px rgba(0,0,0,0.45)',
        transform: `scale(${0.9 + s * 0.1}) translateY(${(1 - s) * 60 + drift}px)`,
        opacity: s,
      }}
    >
      {mediaType === 'video' ? (
        <OffthreadVideo src={staticFile(src)} muted style={style} loop />
      ) : (
        <Img src={staticFile(src)} style={style} />
      )}
    </div>
  );
};
