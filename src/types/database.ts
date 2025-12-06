export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          streak_count: number
          total_xp: number
          level: number
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          streak_count?: number
          total_xp?: number
          level?: number
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          streak_count?: number
          total_xp?: number
          level?: number
        }
      }
      workspaces: {
        Row: {
          id: string
          user_id: string
          name: string
          icon: string
          color: string
          order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          icon?: string
          color?: string
          order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          icon?: string
          color?: string
          order?: number
          created_at?: string
          updated_at?: string
        }
      }
      calendars: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
          is_primary: boolean
          google_calendar_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color?: string
          is_primary?: boolean
          google_calendar_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
          is_primary?: boolean
          google_calendar_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          user_id: string
          parent_task_id: string | null
          workspace_id: string | null
          title: string
          description: string | null
          priority: 'high' | 'medium' | 'low' | null
          deadline: string | null
          completed: boolean
          completed_at: string | null
          archived: boolean
          position: number | null
          background_image_url: string | null
          background_image_display_mode: 'thumbnail' | 'icon' | null
          color_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          parent_task_id?: string | null
          workspace_id?: string | null
          title: string
          description?: string | null
          priority?: 'high' | 'medium' | 'low' | null
          deadline?: string | null
          completed?: boolean
          completed_at?: string | null
          archived?: boolean
          position?: number | null
          background_image_url?: string | null
          background_image_display_mode?: 'thumbnail' | 'icon' | null
          color_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          parent_task_id?: string | null
          workspace_id?: string | null
          title?: string
          description?: string | null
          priority?: 'high' | 'medium' | 'low' | null
          deadline?: string | null
          completed?: boolean
          completed_at?: string | null
          archived?: boolean
          position?: number | null
          background_image_url?: string | null
          background_image_display_mode?: 'thumbnail' | 'icon' | null
          color_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          color: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          color: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          color?: string
        }
      }
      task_tags: {
        Row: {
          task_id: string
          tag_id: string
        }
        Insert: {
          task_id: string
          tag_id: string
        }
        Update: {
          task_id?: string
          tag_id?: string
        }
      }
      ai_suggestions: {
        Row: {
          id: string
          task_id: string
          suggestion: string
          accepted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          suggestion: string
          accepted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          suggestion?: string
          accepted?: boolean
          created_at?: string
        }
      }
      task_links: {
        Row: {
          id: string
          task_id: string
          url: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          task_id: string
          url: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          url?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      task_images: {
        Row: {
          id: string
          task_id: string
          storage_path: string
          file_name: string
          file_size: number | null
          mime_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          storage_path: string
          file_name: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          storage_path?: string
          file_name?: string
          file_size?: number | null
          mime_type?: string | null
          created_at?: string
        }
      }
    }
  }
}

