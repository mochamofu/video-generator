import { CheckCircle, Loader2, XCircle } from 'lucide-react'
import type { Task } from '../types'
import { downloadUrl, streamUrl } from '../api/client'

interface Props {
  task: Task
  onReset: () => void
}

export function TaskProgress({ task, onReset }: Props) {
  const isCompleted = task.state === 'completed'
  const isFailed = task.state === 'failed'
  const isRunning = task.state === 'processing' || task.state === 'pending'

  const videos = task.combined_videos?.length ? task.combined_videos : task.videos ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {isRunning && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />}
        {isCompleted && <CheckCircle className="w-5 h-5 text-green-400" />}
        {isFailed && <XCircle className="w-5 h-5 text-red-400" />}
        <span className="font-medium">
          {isRunning && '動画を生成中...'}
          {isCompleted && '生成完了！'}
          {isFailed && '生成に失敗しました'}
        </span>
        <span className="ml-auto text-sm text-gray-400">{task.progress}%</span>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            isFailed ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${task.progress}%` }}
        />
      </div>

      {task.message && (
        <p className="text-sm text-gray-400">{task.message}</p>
      )}

      {isCompleted && videos.length > 0 && (
        <div className="space-y-4">
          {videos.map((v, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-gray-900 border border-gray-700">
              <video
                className="w-full max-h-[480px]"
                controls
                src={streamUrl(v)}
              />
              <div className="p-3 flex justify-end">
                <a
                  href={downloadUrl(v)}
                  download
                  className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors"
                >
                  ダウンロード
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {(isCompleted || isFailed) && (
        <button
          onClick={onReset}
          className="w-full py-2.5 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors text-sm"
        >
          新しい動画を作成
        </button>
      )}
    </div>
  )
}
