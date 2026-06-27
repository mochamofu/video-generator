import { useEffect, useState } from 'react'
import { Trash2, Play } from 'lucide-react'
import { getTasks, deleteTask } from '../api/client'
import type { Task } from '../types'

interface Props {
  onSelect: (taskId: string) => void
  currentTaskId: string | null
}

export function TaskHistory({ onSelect, currentTaskId }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    getTasks().then(setTasks).catch(() => {})
  }, [currentTaskId])

  if (tasks.length === 0) return null

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await deleteTask(id)
    setTasks(prev => prev.filter(t => t.task_id !== id))
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-medium text-gray-400 mb-3">生成履歴</h3>
      <div className="space-y-2">
        {tasks.map(t => (
          <div
            key={t.task_id}
            onClick={() => onSelect(t.task_id)}
            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
              t.task_id === currentTaskId
                ? 'bg-indigo-950/50 border border-indigo-700'
                : 'bg-gray-800/50 border border-gray-800 hover:bg-gray-800'
            }`}
          >
            <Play className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-gray-300 truncate">{t.task_id}</p>
              <p className={`text-xs mt-0.5 ${
                t.state === 'completed' ? 'text-green-400' :
                t.state === 'failed' ? 'text-red-400' : 'text-indigo-400'
              }`}>
                {t.state === 'completed' ? '完了' :
                 t.state === 'failed' ? '失敗' :
                 t.state === 'processing' ? `処理中 ${t.progress}%` : '待機中'}
              </p>
            </div>
            <button
              onClick={e => handleDelete(e, t.task_id)}
              className="p-1 text-gray-600 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
