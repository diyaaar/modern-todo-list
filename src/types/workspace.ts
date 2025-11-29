import { Database } from './database'

export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update']

export const WORKSPACE_COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Pink', value: '#ec4899' },
] as const

// Emoji picker is now used instead of hardcoded array
// Keeping this for backward compatibility if needed
export const WORKSPACE_ICONS = [
  '📋', '🏠', '📚', '💼', '🎯', '⭐', '🎨', '🚀',
  '💡', '🎵', '🏃', '🍔', '🎮', '📱', '💻', '🎬',
] as const

