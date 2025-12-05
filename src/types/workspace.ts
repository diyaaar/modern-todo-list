import { Database } from './database'

export type Workspace = Database['public']['Tables']['workspaces']['Row']
export type WorkspaceInsert = Database['public']['Tables']['workspaces']['Insert']
export type WorkspaceUpdate = Database['public']['Tables']['workspaces']['Update']

export const WORKSPACE_COLORS = [
  { name: 'Light Blue', value: '#a4bdfc' },
  { name: 'Mint Green', value: '#7ae7bf' },
  { name: 'Light Purple', value: '#dbadff' },
  { name: 'Coral', value: '#ff887c' },
  { name: 'Light Yellow', value: '#fbd75b' },
  { name: 'Peach', value: '#ffb878' },
  { name: 'Cyan', value: '#46d6db' },
  { name: 'Light Gray', value: '#e1e1e1' },
  { name: 'Medium Blue', value: '#5484ed' },
  { name: 'Green', value: '#51b749' },
  { name: 'Red', value: '#dc2127' },
] as const

// Emoji picker is now used instead of hardcoded array
// Keeping this for backward compatibility if needed
export const WORKSPACE_ICONS = [
  '📋', '🏠', '📚', '💼', '🎯', '⭐', '🎨', '🚀',
  '💡', '🎵', '🏃', '🍔', '🎮', '📱', '💻', '🎬',
] as const

