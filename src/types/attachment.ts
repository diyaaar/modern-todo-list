import { Database } from './database'

export type TaskLink = Database['public']['Tables']['task_links']['Row']
export type TaskLinkInsert = Database['public']['Tables']['task_links']['Insert']
export type TaskLinkUpdate = Database['public']['Tables']['task_links']['Update']

export type TaskImage = Database['public']['Tables']['task_images']['Row']
export type TaskImageInsert = Database['public']['Tables']['task_images']['Insert']
export type TaskImageUpdate = Database['public']['Tables']['task_images']['Update']

export type BackgroundImageDisplayMode = 'thumbnail' | 'icon' | null

