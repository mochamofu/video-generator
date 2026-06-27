import { useState } from 'react'
import { Film, Github } from 'lucide-react'
import { VideoGeneratorForm } from './components/VideoGeneratorForm'
import { TaskProgress } from './components/TaskProgress'
import { TaskHistory } from './components/TaskHistory'
import { generateVideo } from './api/client'
import { useTaskPolling } from './hooks/useTask'
import type { VideoFormData } from './types'

export default function App() {
  const [taskId, setTaskId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { task, error: pollError } = useTaskPolling(taskId)

  const handleSubmit = async (data: VideoFormData) => {
    setLoading(true)
    setSubmitError(null)
    try {
      const { task_id } = await generateVideo(data)
      setTaskId(task_id)
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '送信に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setTaskId(null)
    setSubmitError(null)
  }

  const error = submitError || pollError

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <Film className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Video Generator</h1>
          <p className="text-xs text-gray-500">Powered by MoneyPrinterTurbo</p>
        </div>
        <a
          href="https://github.com/harry0703/MoneyPrinterTurbo"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-gray-500 hover:text-gray-300 transition-colors"
        >
          <Github className="w-5 h-5" />
        </a>
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center py-10 px-4">
        <div className="w-full max-w-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-950/50 border border-red-700 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          {task ? (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h2 className="font-semibold text-lg mb-5">生成状況</h2>
              <TaskProgress task={task} onReset={handleReset} />
            </div>
          ) : (
            <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
              <h2 className="font-semibold text-lg mb-5">動画を作成する</h2>
              <VideoGeneratorForm onSubmit={handleSubmit} loading={loading} />
            </div>
          )}

          <TaskHistory onSelect={setTaskId} currentTaskId={taskId} />
        </div>
      </main>
    </div>
  )
}
