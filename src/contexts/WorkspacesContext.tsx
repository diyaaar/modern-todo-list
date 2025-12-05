import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { Workspace, WorkspaceInsert, WorkspaceUpdate } from '../types/workspace'

const getSupabase = () => getSupabaseClient()

interface WorkspacesContextType {
  workspaces: Workspace[]
  currentWorkspaceId: string | null
  setCurrentWorkspaceId: (id: string | null) => void
  loading: boolean
  error: string | null
  createWorkspace: (workspace: Omit<WorkspaceInsert, 'user_id' | 'order'>) => Promise<Workspace | null>
  updateWorkspace: (id: string, updates: WorkspaceUpdate) => Promise<void>
  deleteWorkspace: (id: string) => Promise<void>
  reorderWorkspaces: (workspaceIds: string[]) => Promise<void>
  ensureDefaultWorkspace: () => Promise<string | null>
}

const WorkspacesContext = createContext<WorkspacesContextType | undefined>(undefined)

export function WorkspacesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch workspaces
  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('user_id', user.id)
        .order('order', { ascending: true })

      if (fetchError) throw fetchError

      const fetchedWorkspaces = data || []
      setWorkspaces(fetchedWorkspaces)

      // CRITICAL: Always set current workspace if we have workspaces and none is selected
      if (fetchedWorkspaces.length > 0) {
        setCurrentWorkspaceId((prevId) => {
          // If no workspace is selected, or current one doesn't exist, select the first one
          if (!prevId || !fetchedWorkspaces.find((w) => w.id === prevId)) {
            console.log('[WorkspacesContext] Setting current workspace to:', fetchedWorkspaces[0].id)
            return fetchedWorkspaces[0].id
          }
          return prevId
        })
      } else {
        // No workspaces - clear current
        setCurrentWorkspaceId(null)
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch workspaces')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Ensure default workspace exists
  const ensureDefaultWorkspace = useCallback(async (): Promise<string | null> => {
    if (!user) return null

    try {
      const supabase = getSupabase()
      
      // Check if user has any workspaces
      const { data: existingWorkspaces } = await supabase
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (existingWorkspaces && existingWorkspaces.length > 0) {
        return existingWorkspaces[0].id
      }

      // Create default "Main" workspace
      const { data: newWorkspace, error: createError } = await supabase
        .from('workspaces')
        .insert({
          user_id: user.id,
          name: 'Main',
          icon: '📋',
          color: '#e1e1e1', // Light Gray
          order: 0,
        })
        .select()
        .single()

      if (createError) throw createError

      // Update all existing tasks to use this workspace
      await supabase
        .from('tasks')
        .update({ workspace_id: newWorkspace.id })
        .eq('user_id', user.id)
        .is('workspace_id', null)

      await fetchWorkspaces()
      setCurrentWorkspaceId(newWorkspace.id)

      return newWorkspace.id
    } catch (err) {
      console.error('Error ensuring default workspace:', err)
      return null
    }
  }, [user, fetchWorkspaces])

  // Subscribe to workspace changes
  useEffect(() => {
    if (!user?.id) {
      return
    }

    let isMounted = true

    // Initialize: Ensure default workspace exists and fetch workspaces
    const initialize = async () => {
      // First, ensure default workspace exists
      await ensureDefaultWorkspace()
      
      if (!isMounted) return
      
      // Then fetch workspaces (which will set currentWorkspaceId if not set)
      await fetchWorkspaces()
    }

    initialize()

    const supabase = getSupabase()
    const channelName = `workspaces-changes-${user.id}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspaces',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[Realtime] Workspace change received:', payload)
          if (isMounted) {
            fetchWorkspaces()
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Workspaces subscription status:', status)
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
    // Only depend on user.id to prevent unnecessary re-subscriptions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Create workspace
  const createWorkspace = useCallback(
    async (workspaceData: Omit<WorkspaceInsert, 'user_id' | 'order'>): Promise<Workspace | null> => {
      if (!user) return null

      try {
        const supabase = getSupabase()
        
        // Get max order
        const { data: existingWorkspaces } = await supabase
          .from('workspaces')
          .select('order')
          .eq('user_id', user.id)
          .order('order', { ascending: false })
          .limit(1)

        const maxOrder = existingWorkspaces && existingWorkspaces.length > 0 
          ? existingWorkspaces[0].order + 1 
          : 0

        const { data, error: createError } = await supabase
          .from('workspaces')
          .insert({
            ...workspaceData,
            user_id: user.id,
            order: maxOrder,
          })
          .select()
          .single()

        if (createError) throw createError

        await fetchWorkspaces()
        if (data) {
          setCurrentWorkspaceId(data.id)
        }

        return data
      } catch (err) {
        console.error('Error creating workspace:', err)
        setError(err instanceof Error ? err.message : 'Failed to create workspace')
        return null
      }
    },
    [user, fetchWorkspaces]
  )

  // Update workspace
  const updateWorkspace = useCallback(
    async (id: string, updates: WorkspaceUpdate) => {
      try {
        const supabase = getSupabase()
        const { error: updateError } = await supabase
          .from('workspaces')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) throw updateError

        await fetchWorkspaces()
      } catch (err) {
        console.error('Error updating workspace:', err)
        setError(err instanceof Error ? err.message : 'Failed to update workspace')
        throw err
      }
    },
    [fetchWorkspaces]
  )

  // Delete workspace
  const deleteWorkspace = useCallback(
    async (id: string) => {
      if (!user) return

      // Don't allow deleting if it's the last workspace
      const { data: allWorkspaces } = await getSupabase()
        .from('workspaces')
        .select('id')
        .eq('user_id', user.id)

      if (allWorkspaces && allWorkspaces.length <= 1) {
        throw new Error('Cannot delete the last workspace')
      }

      try {
        const supabase = getSupabase()
        
        // Get another workspace to move tasks to
        const { data: otherWorkspace } = await supabase
          .from('workspaces')
          .select('id')
          .eq('user_id', user.id)
          .neq('id', id)
          .limit(1)
          .single()

        if (otherWorkspace) {
          // Move all tasks to another workspace
          await supabase
            .from('tasks')
            .update({ workspace_id: otherWorkspace.id })
            .eq('workspace_id', id)
        }

        // Delete workspace
        const { error: deleteError } = await supabase
          .from('workspaces')
          .delete()
          .eq('id', id)

        if (deleteError) throw deleteError

        // Switch to another workspace if current was deleted
        if (currentWorkspaceId === id && otherWorkspace) {
          setCurrentWorkspaceId(otherWorkspace.id)
        }

        await fetchWorkspaces()
      } catch (err) {
        console.error('Error deleting workspace:', err)
        setError(err instanceof Error ? err.message : 'Failed to delete workspace')
        throw err
      }
    },
    [user, currentWorkspaceId, fetchWorkspaces]
  )

  // Reorder workspaces
  const reorderWorkspaces = useCallback(
    async (workspaceIds: string[]) => {
      try {
        const supabase = getSupabase()
        
        // Update order for each workspace
        const updates = workspaceIds.map((id, index) =>
          supabase
            .from('workspaces')
            .update({ order: index })
            .eq('id', id)
        )

        await Promise.all(updates)
        await fetchWorkspaces()
      } catch (err) {
        console.error('Error reordering workspaces:', err)
        setError(err instanceof Error ? err.message : 'Failed to reorder workspaces')
      }
    },
    [fetchWorkspaces]
  )

  const value: WorkspacesContextType = {
    workspaces,
    currentWorkspaceId,
    setCurrentWorkspaceId,
    loading,
    error,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    reorderWorkspaces,
    ensureDefaultWorkspace,
  }

  return <WorkspacesContext.Provider value={value}>{children}</WorkspacesContext.Provider>
}

export function useWorkspaces() {
  const context = useContext(WorkspacesContext)
  if (context === undefined) {
    throw new Error('useWorkspaces must be used within a WorkspacesProvider')
  }
  return context
}

