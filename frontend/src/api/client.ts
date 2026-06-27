import type { ApiResponse, Task, VideoFormData } from '../types'

const BASE = '/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function generateVideo(data: VideoFormData): Promise<{ task_id: string }> {
  const resp = await request<ApiResponse<{ task_id: string }>>('/videos', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  return resp.data
}

export async function getTask(taskId: string): Promise<Task> {
  const resp = await request<ApiResponse<Task>>(`/tasks/${taskId}`)
  return resp.data
}

export async function getTasks(page = 1, pageSize = 20): Promise<Task[]> {
  const resp = await request<ApiResponse<Task[]>>(`/tasks?page=${page}&page_size=${pageSize}`)
  return resp.data ?? []
}

export async function deleteTask(taskId: string): Promise<void> {
  await request(`/tasks/${taskId}`, { method: 'DELETE' })
}

export async function getMusics(): Promise<string[]> {
  const resp = await request<ApiResponse<{ files: string[] }>>('/musics')
  return resp.data?.files ?? []
}

export function streamUrl(filePath: string): string {
  return `${BASE}/stream/${filePath}`
}

export function downloadUrl(filePath: string): string {
  return `${BASE}/download/${filePath}`
}
