import { Database } from './database'

export type Task = Database['public']['Tables']['tasks']['Row']
export type TaskInsert = Database['public']['Tables']['tasks']['Insert']
export type TaskUpdate = Database['public']['Tables']['tasks']['Update']

export interface TaskWithSubtasks extends Task {
  subtasks?: TaskWithSubtasks[]
}

export type TaskPriority = 'high' | 'medium' | 'low' | null
export type TaskFilter = 'all' | 'active' | 'completed'
export type TaskSort = 'created' | 'deadline' | 'priority' | 'title'

