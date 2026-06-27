export type AspectRatio = '9:16' | '16:9' | '1:1'
export type VideoSource = 'pexels' | 'pixabay' | 'local'
export type SubtitleProvider = 'edge' | 'whisper'
export type TaskState = 'pending' | 'processing' | 'completed' | 'failed'

export interface VideoFormData {
  video_subject: string
  video_script?: string
  video_aspect: AspectRatio
  video_clip_duration: number
  video_count: number
  video_source: VideoSource
  voice_name: string
  voice_rate: number
  voice_volume: number
  bgm_type: 'random' | 'custom' | 'none'
  subtitle_enabled: boolean
  subtitle_provider: SubtitleProvider
  font_size: number
  subtitle_position: 'top' | 'center' | 'bottom'
  paragraph_number: number
}

export interface Task {
  task_id: string
  state: TaskState
  progress: number
  message?: string
  videos?: string[]
  combined_videos?: string[]
}

export interface ApiResponse<T> {
  status: number
  message: string
  data: T
}
