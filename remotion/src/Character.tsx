import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';

export type CharacterAssets = {
  closed: string; // 口閉じ
  open: string;   // 口開き
  blink?: string; // 目閉じ(まばたき用、省略可)
};

// 音声の振幅で口パクするアバター (PNGTuber方式)
// - ナレーション音量 > しきい値 → 口開き画像に切り替え
// - 一定周期でまばたき
// - 常時ゆるく上下に揺れ + 発話時に小さく弾む
export const Character: React.FC<{
  assets: CharacterAssets;
  audioSrc: string;
  width: number;
  corner?: boolean; // 実写素材と同居する時は右下に小さく
}> = ({assets, audioSrc, width, corner}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const audioData = useAudioData(staticFile(audioSrc));

  let amp = 0;
  if (audioData) {
    const bins = visualizeAudio({
      audioData,
      frame,
      fps,
      numberOfSamples: 16,
    });
    // 低〜中域(声の帯域)の平均を口パクの信号にする
    amp = bins.slice(1, 8).reduce((a, b) => a + b, 0) / 7;
  }
  const talking = amp > 0.04;

  // まばたき: 約2.8秒周期 + 擬似ランダムなズレ (決定論的 = レンダリング安定)
  const CYCLE = 84;
  const seed = Math.floor(frame / CYCLE);
  const jitter = (seed * 37) % 18;
  const inCycle = frame % CYCLE;
  const blinking =
    assets.blink !== undefined && inCycle >= 58 + jitter && inCycle < 62 + jitter;

  const src = blinking ? assets.blink! : talking ? assets.open : assets.closed;

  // 登場スプリング + アイドルモーション
  const enter = spring({frame, fps, config: {damping: 14, mass: 0.9}});
  const bob = Math.sin((frame / fps) * 1.7) * 9;
  const sway = Math.sin((frame / fps) * 0.8) * 1.3;
  const bounce = 1 + Math.min(amp, 0.3) * 0.06;

  const pos: React.CSSProperties = corner
    ? {right: 16, transform: `translateY(${bob}px) rotate(${sway}deg) scale(${bounce})`}
    : {
        left: '50%',
        transform: `translateX(-50%) translateY(${bob}px) rotate(${sway}deg) scale(${bounce})`,
      };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: interpolate(enter, [0, 1], [-420, corner ? -14 : -30]),
        transformOrigin: 'bottom center',
        ...pos,
      }}
    >
      <Img
        src={staticFile(src)}
        style={{width: corner ? Math.min(width, 440) : width, display: 'block'}}
      />
    </div>
  );
};
