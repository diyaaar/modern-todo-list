import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { Tag, TagInsert, TagUpdate } from '../types/tag'

const getSupabase = () => getSupabaseClient()

interface TagsContextType {
  tags: Tag[]
  loading: boolean
  error: string | null
  createTag: (tag: Omit<TagInsert, 'user_id'>) => Promise<Tag | null>
  updateTag: (id: string, updates: TagUpdate) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  getTaskTags: (taskId: string) => Promise<Tag[]>
  addTagToTask: (taskId: string, tagId: string) => Promise<void>
  removeTagFromTask: (taskId: string, tagId: string) => Promise<void>
}

const TagsContext = createContext<TagsContextType | undefined>(undefined)

export function TagsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch tags from Supabase
  const fetchTags = useCallback(async () => {
    if (!user) {
      setTags([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabase()
      const { data, error: fetchError } = await supabase
        .from('tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true })

      if (fetchError) throw fetchError

      setTags(data || [])
    } catch (err) {
      console.error('Error fetching tags:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tags')
    } finally {
      setLoading(false)
    }
  }, [user])

  // Subscribe to tag changes
  useEffect(() => {
    if (!user?.id) {
      console.log('[Realtime] No user, skipping tags subscription')
      return
    }

    const userId = user.id
    console.log('[Realtime] Setting up tags subscription for user:', userId)
    
    // Initial fetch
    fetchTags()

    const supabase = getSupabase()
    const channelName = `tags-changes-${userId}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tags',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Tag change received:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
          })
          // Refetch tags when any change occurs
          fetchTags()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, DELETE for task_tags
          schema: 'public',
          table: 'task_tags',
        },
        (payload) => {
          console.log('[Realtime] Task tag change received:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
          })
          // Note: Individual components will handle refreshing their own task tags
          // This subscription is mainly for logging and potential future use
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Tags subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ Successfully subscribed to tags and task_tags changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ✗ Channel error - check Supabase Replication settings')
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] ✗ Subscription timed out')
        } else if (status === 'CLOSED') {
          console.warn('[Realtime] ⚠ Channel closed')
        }
      })

    return () => {
      console.log('[Realtime] Cleaning up tags subscription')
      supabase.removeChannel(channel)
    }
    // Only depend on user.id to prevent unnecessary re-subscriptions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Create tag
  const createTag = useCallback(
    async (tagData: Omit<TagInsert, 'user_id'>): Promise<Tag | null> => {
      if (!user) return null

      try {
        const supabase = getSupabase()
        const { data, error: createError } = await supabase
          .from('tags')
          .insert({
            ...tagData,
            user_id: user.id,
          })
          .select()
          .single()

        if (createError) throw createError

        return data
      } catch (err) {
        console.error('Error creating tag:', err)
        setError(err instanceof Error ? err.message : 'Failed to create tag')
        return null
      }
    },
    [user]
  )

  // Update tag
  const updateTag = useCallback(
    async (id: string, updates: TagUpdate) => {
      try {
        const supabase = getSupabase()
        const { error: updateError } = await supabase
          .from('tags')
          .update(updates)
          .eq('id', id)

        if (updateError) throw updateError
      } catch (err) {
        console.error('Error updating tag:', err)
        setError(err instanceof Error ? err.message : 'Failed to update tag')
      }
    },
    []
  )

  // Delete tag
  const deleteTag = useCallback(async (id: string) => {
    // Optimistic update: remove tag from local state immediately
    setTags((prevTags) => prevTags.filter((tag) => tag.id !== id))
    
    try {
      const supabase = getSupabase()
      
      // First, delete all task_tags associations for this tag
      const { error: taskTagsError } = await supabase
        .from('task_tags')
        .delete()
        .eq('tag_id', id)

      if (taskTagsError) {
        console.error('Error deleting task_tags:', taskTagsError)
        // Rollback: refetch tags to restore state
        fetchTags()
        throw taskTagsError
      }

      // Then, delete the tag itself
      const { error: deleteError } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)

      if (deleteError) {
        // Rollback: refetch tags to restore state
        fetchTags()
        throw deleteError
      }
      
      // Success - optimistic update was correct, no need to refetch
      // Realtime subscription will handle any external updates
    } catch (err) {
      console.error('Error deleting tag:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete tag')
      throw err // Re-throw so caller can handle it
    }
  }, [fetchTags])

  // Get tags for a task
  const getTaskTags = useCallback(async (taskId: string): Promise<Tag[]> => {
    // Skip query for temporary task IDs (optimistic updates)
    if (taskId.startsWith('temp-')) {
      return []
    }

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('task_tags')
        .select('tag_id')
        .eq('task_id', taskId)

      if (error) {
        // If task doesn't exist yet (404 or similar), return empty array
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          return []
        }
        throw error
      }

      const tagIds = data?.map((row) => row.tag_id) || []
      if (tagIds.length === 0) return []

      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('*')
        .in('id', tagIds)

      if (tagsError) throw tagsError

      return tagsData || []
    } catch (err) {
      console.error('Error getting task tags:', err)
      return []
    }
  }, [])

  // Add tag to task
  const addTagToTask = useCallback(async (taskId: string, tagId: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('task_tags')
        .insert({
          task_id: taskId,
          tag_id: tagId,
        })

      if (error) throw error
    } catch (err) {
      console.error('Error adding tag to task:', err)
      setError(err instanceof Error ? err.message : 'Failed to add tag to task')
    }
  }, [])

  // Remove tag from task
  const removeTagFromTask = useCallback(async (taskId: string, tagId: string) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('task_tags')
        .delete()
        .eq('task_id', taskId)
        .eq('tag_id', tagId)

      if (error) throw error
    } catch (err) {
      console.error('Error removing tag from task:', err)
      setError(err instanceof Error ? err.message : 'Failed to remove tag from task')
    }
  }, [])

  const value: TagsContextType = {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    getTaskTags,
    addTagToTask,
    removeTagFromTask,
  }

  return <TagsContext.Provider value={value}>{children}</TagsContext.Provider>
}

export function useTags() {
  const context = useContext(TagsContext)
  if (context === undefined) {
    throw new Error('useTags must be used within a TagsProvider')
  }
  return context
}

