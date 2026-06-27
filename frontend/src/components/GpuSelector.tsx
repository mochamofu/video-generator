import { Cpu, Zap } from 'lucide-react'

interface Props {
  useGpu: boolean
  onChange: (v: boolean) => void
}

export function GpuSelector({ useGpu, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">処理デバイス</label>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange(false)}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            !useGpu
              ? 'border-indigo-500 bg-indigo-950/50 text-white'
              : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
          }`}
        >
          <Cpu className="w-6 h-6" />
          <span className="font-medium text-sm">CPU モード</span>
          <span className="text-xs text-gray-500 text-center">
            グラフィックボード不要<br />速度は遅め
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChange(true)}
          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
            useGpu
              ? 'border-yellow-500 bg-yellow-950/30 text-white'
              : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500'
          }`}
        >
          <Zap className="w-6 h-6 text-yellow-400" />
          <span className="font-medium text-sm">GPU モード</span>
          <span className="text-xs text-gray-500 text-center">
            NVIDIA GPU が必要<br />高速処理・高品質
          </span>
        </button>
      </div>
      {useGpu && (
        <p className="mt-2 text-xs text-yellow-400/80">
          ※ NVIDIA GPU + CUDA が必要です。Docker起動時に <code>docker compose -f docker-compose.yml -f docker-compose.gpu.yml up</code> を使用してください。
        </p>
      )}
    </div>
  )
}
