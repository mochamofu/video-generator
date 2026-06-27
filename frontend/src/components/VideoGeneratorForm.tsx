import { useState } from 'react'
import { Clapperboard, ChevronDown, ChevronUp } from 'lucide-react'
import type { VideoFormData } from '../types'
import { GpuSelector } from './GpuSelector'

const VOICE_OPTIONS = [
  { value: 'zh-CN-YunxiNeural', label: '中国語 - 男性 (Yunxi)' },
  { value: 'zh-CN-XiaoxiaoNeural', label: '中国語 - 女性 (Xiaoxiao)' },
  { value: 'en-US-AndrewNeural', label: '英語 (US) - 男性 (Andrew)' },
  { value: 'en-US-JennyNeural', label: '英語 (US) - 女性 (Jenny)' },
  { value: 'ja-JP-KeitaNeural', label: '日本語 - 男性 (Keita)' },
  { value: 'ja-JP-NanamiNeural', label: '日本語 - 女性 (Nanami)' },
]

const DEFAULT_FORM: VideoFormData = {
  video_subject: '',
  video_aspect: '9:16',
  video_clip_duration: 5,
  video_count: 1,
  video_source: 'pexels',
  voice_name: 'ja-JP-NanamiNeural',
  voice_rate: 1.0,
  voice_volume: 1.0,
  bgm_type: 'random',
  subtitle_enabled: true,
  subtitle_provider: 'edge',
  font_size: 60,
  subtitle_position: 'bottom',
  paragraph_number: 1,
}

interface Props {
  onSubmit: (data: VideoFormData) => void
  loading: boolean
}

export function VideoGeneratorForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<VideoFormData>(DEFAULT_FORM)
  const [useGpu, setUseGpu] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const set = <K extends keyof VideoFormData>(k: K, v: VideoFormData[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleGpuChange = (gpu: boolean) => {
    setUseGpu(gpu)
    set('subtitle_provider', gpu ? 'whisper' : 'edge')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Topic */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          動画のテーマ / トピック <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={form.video_subject}
          onChange={e => set('video_subject', e.target.value)}
          placeholder="例：東京の観光スポット TOP5"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
        />
      </div>

      {/* Script (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          スクリプト（オプション）
        </label>
        <textarea
          value={form.video_script ?? ''}
          onChange={e => set('video_script', e.target.value)}
          placeholder="スクリプトを入力しない場合はAIが自動生成します"
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
        />
      </div>

      {/* Aspect + Source */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">アスペクト比</label>
          <select
            value={form.video_aspect}
            onChange={e => set('video_aspect', e.target.value as VideoFormData['video_aspect'])}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="9:16">縦型 9:16 (TikTok・Reels)</option>
            <option value="16:9">横型 16:9 (YouTube)</option>
            <option value="1:1">正方形 1:1</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">素材ソース</label>
          <select
            value={form.video_source}
            onChange={e => set('video_source', e.target.value as VideoFormData['video_source'])}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="pexels">Pexels</option>
            <option value="pixabay">Pixabay</option>
            <option value="local">ローカル素材</option>
          </select>
        </div>
      </div>

      {/* Voice */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">音声</label>
        <select
          value={form.voice_name}
          onChange={e => set('voice_name', e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
        >
          {VOICE_OPTIONS.map(v => (
            <option key={v.value} value={v.value}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* GPU Selector */}
      <GpuSelector useGpu={useGpu} onChange={handleGpuChange} />

      {/* Advanced toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(p => !p)}
        className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
      >
        {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        詳細設定
      </button>

      {showAdvanced && (
        <div className="space-y-4 p-4 bg-gray-900 rounded-xl border border-gray-800">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">クリップ時間（秒）</label>
              <input
                type="number"
                min={2}
                max={15}
                value={form.video_clip_duration}
                onChange={e => set('video_clip_duration', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">生成本数</label>
              <input
                type="number"
                min={1}
                max={5}
                value={form.video_count}
                onChange={e => set('video_count', Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="subtitle"
              checked={form.subtitle_enabled}
              onChange={e => set('subtitle_enabled', e.target.checked)}
              className="w-4 h-4 accent-indigo-500"
            />
            <label htmlFor="subtitle" className="text-sm text-gray-300">字幕を表示する</label>
          </div>

          {form.subtitle_enabled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">字幕の位置</label>
                <select
                  value={form.subtitle_position}
                  onChange={e => set('subtitle_position', e.target.value as VideoFormData['subtitle_position'])}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                >
                  <option value="bottom">下</option>
                  <option value="center">中央</option>
                  <option value="top">上</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">フォントサイズ</label>
                <input
                  type="number"
                  min={30}
                  max={120}
                  value={form.font_size}
                  onChange={e => set('font_size', Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">BGM</label>
            <select
              value={form.bgm_type}
              onChange={e => set('bgm_type', e.target.value as VideoFormData['bgm_type'])}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              <option value="random">ランダム</option>
              <option value="none">なし</option>
            </select>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !form.video_subject}
        className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition-colors text-white"
      >
        <Clapperboard className="w-5 h-5" />
        {loading ? '生成中...' : '動画を生成する'}
      </button>
    </form>
  )
}
