import { useEffect, useRef, useState } from 'react'
import { getTask } from '../api/client'
import type { Task } from '../types'

export function useTaskPolling(taskId: string | null) {
  const [task, setTask] = useState<Task | null>(null)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!taskId) {
      setTask(null)
      return
    }

    const poll = async () => {
      try {
        const t = await getTask(taskId)
        setTask(t)
        if (t.state === 'completed' || t.state === 'failed') {
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [taskId])

  return { task, error }
}
