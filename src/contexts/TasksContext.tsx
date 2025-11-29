import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useWorkspaces } from './WorkspacesContext'
import { useToast } from './ToastContext'
import { Task, TaskWithSubtasks, TaskInsert, TaskUpdate, TaskFilter, TaskSort } from '../types/task'
import { buildTaskTree, flattenTaskTree } from '../utils/taskUtils'

const getSupabase = () => getSupabaseClient()

// Track pending updates to ignore our own realtime events
interface PendingUpdate {
  id: string
  type: 'create' | 'update' | 'delete'
  timestamp: number
  previousState?: Task // For rollback
}

interface TasksContextType {
  tasks: TaskWithSubtasks[]
  loading: boolean
  error: string | null
  createTask: (task: Omit<TaskInsert, 'user_id'>) => Promise<Task | null>
  updateTask: (id: string, updates: TaskUpdate, suppressToast?: boolean) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  toggleTaskComplete: (id: string) => Promise<void>
  addAISuggestions: (taskId: string, suggestions: string[]) => Promise<void>
  filter: TaskFilter
  setFilter: (filter: TaskFilter) => void
  sort: TaskSort
  setSort: (sort: TaskSort) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedTagIds: string[]
  setSelectedTagIds: (tagIds: string[]) => void
  dateRangeStart: string | null
  setDateRangeStart: (date: string | null) => void
  dateRangeEnd: string | null
  setDateRangeEnd: (date: string | null) => void
  filteredAndSortedTasks: TaskWithSubtasks[]
}

const TasksContext = createContext<TasksContextType | undefined>(undefined)

export function TasksProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { currentWorkspaceId } = useWorkspaces()
  const { showToast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const previousWorkspaceIdRef = useRef<string | null>(null)
  const [filter, setFilter] = useState<TaskFilter>('all')
  const [sort, setSort] = useState<TaskSort>('created')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [dateRangeStart, setDateRangeStart] = useState<string | null>(null)
  const [dateRangeEnd, setDateRangeEnd] = useState<string | null>(null)
  
  // Track pending updates to prevent duplicate realtime event handling
  const pendingUpdatesRef = useRef<Map<string, PendingUpdate>>(new Map())
  
  // Clean up old pending updates (older than 5 seconds)
  const cleanupPendingUpdates = useCallback(() => {
    const now = Date.now()
    const fiveSecondsAgo = now - 5000
    pendingUpdatesRef.current.forEach((update, id) => {
      if (update.timestamp < fiveSecondsAgo) {
        pendingUpdatesRef.current.delete(id)
      }
    })
  }, [])

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    if (!user) {
      setTasks([])
      setLoading(false)
      return
    }

    // CRITICAL: Don't clear tasks during workspace transitions
    // Keep old tasks visible so AnimatePresence can animate them out
    // Only update when new data arrives

    try {
      setError(null)
      
      // Only show loading skeleton on initial load (no previous workspace)
      const isWorkspaceChange = previousWorkspaceIdRef.current !== null && previousWorkspaceIdRef.current !== currentWorkspaceId
      if (!isWorkspaceChange) {
        setLoading(true)
      }

      // CRITICAL: Don't fetch if no workspace is selected
      if (!currentWorkspaceId) {
        console.log('[TasksContext] No workspace selected, skipping task fetch')
        previousWorkspaceIdRef.current = null
        // Clear tasks after animation completes
        setTimeout(() => {
          setTasks([])
          setLoading(false)
        }, 300)
        return
      }

      const supabase = getSupabase()
      const query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', currentWorkspaceId) // CRITICAL: Always filter by workspace_id
      
      console.log('[TasksContext] Fetching tasks for workspace:', currentWorkspaceId)
      
      const { data, error: fetchError } = await query
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('[TasksContext] Error fetching tasks:', fetchError)
        throw fetchError
      }

      console.log('[TasksContext] Fetched tasks:', data?.length || 0, 'for workspace:', currentWorkspaceId)
      
      // Update tasks immediately - AnimatePresence will handle smooth crossfade
      // Old tasks (from previous workspace) will fade out via exit animation
      // New tasks (for current workspace) will fade in via enter animation
      // The key={currentWorkspaceId} in HomePage ensures proper animation trigger
      setTasks(data || [])
      setLoading(false)
      previousWorkspaceIdRef.current = currentWorkspaceId
    } catch (err) {
      console.error('Error fetching tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks')
      setLoading(false)
      // Don't clear tasks on error - keep them visible
    }
  }, [user, currentWorkspaceId])

  // Subscribe to task changes
  useEffect(() => {
    if (!user?.id) {
      console.log('[Realtime] No user, skipping subscription')
      return
    }

    // CRITICAL: Don't subscribe if no workspace is selected yet
    // Wait for workspace to be initialized
    if (!currentWorkspaceId) {
      console.log('[Realtime] No workspace selected yet, skipping subscription')
      return
    }

    const userId = user.id
    console.log('[Realtime] Setting up tasks subscription for user:', userId, 'workspace:', currentWorkspaceId)
    
    // Initial fetch
    fetchTasks()

    const supabase = getSupabase()
    const channelName = `tasks-changes-${userId}-${currentWorkspaceId}`
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('[Realtime] Task change received:', {
            event: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
          })
          
          // Clean up old pending updates
          cleanupPendingUpdates()
          
          // Check if this is our own update
          const taskId = (payload.new as any)?.id || (payload.old as any)?.id
          if (taskId && typeof taskId === 'string') {
            const pendingUpdate = pendingUpdatesRef.current.get(taskId)
            
            if (pendingUpdate) {
              // This is our own update - we already updated the UI optimistically
              console.log('[Realtime] Ignoring our own update for task:', taskId)
              // Remove from pending after a short delay to handle rapid updates
              setTimeout(() => {
                pendingUpdatesRef.current.delete(taskId)
              }, 1000)
              return // Don't refetch - we already updated UI
            }
          }
          
          // This is an update from another source (or our update wasn't tracked)
          // CRITICAL: Handle workspace_id changes - task moved between workspaces
          const oldWorkspaceId = (payload.old as any)?.workspace_id
          const newWorkspaceId = (payload.new as any)?.workspace_id
          const taskWorkspaceId = newWorkspaceId || oldWorkspaceId
          const isWorkspaceChange = oldWorkspaceId !== newWorkspaceId
          
          if (currentWorkspaceId) {
            if (isWorkspaceChange) {
              // Task was moved between workspaces
              if (oldWorkspaceId === currentWorkspaceId) {
                // Task was moved FROM current workspace - remove it immediately
                const movedTaskId = (payload.new as any)?.id || (payload.old as any)?.id
                console.log('[Realtime] Task moved from current workspace, removing:', movedTaskId)
                if (movedTaskId) {
                  setTasks((prevTasks) => prevTasks.filter((t) => t.id !== movedTaskId))
                }
              } else if (newWorkspaceId === currentWorkspaceId) {
                // Task was moved TO current workspace - refetch to get it
                console.log('[Realtime] Task moved to current workspace, refetching tasks')
                fetchTasks()
              } else {
                // Task moved between other workspaces - ignore
                console.log('[Realtime] Task moved between other workspaces, ignoring')
              }
            } else if (taskWorkspaceId === currentWorkspaceId) {
              // Normal update for task in current workspace
              console.log('[Realtime] External update detected for current workspace, refetching tasks')
              fetchTasks()
            } else {
              console.log('[Realtime] Ignoring update - task belongs to different workspace:', taskWorkspaceId, 'current:', currentWorkspaceId)
            }
          } else {
            // If no workspace selected, only show tasks without workspace
            if (!taskWorkspaceId || taskWorkspaceId === null) {
              console.log('[Realtime] External update detected (no workspace), refetching tasks')
              fetchTasks()
            } else {
              console.log('[Realtime] Ignoring update - task has workspace but none selected')
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Tasks subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] ✓ Successfully subscribed to tasks changes')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Realtime] ✗ Channel error - check Supabase Replication settings')
        } else if (status === 'TIMED_OUT') {
          console.error('[Realtime] ✗ Subscription timed out')
        } else if (status === 'CLOSED') {
          console.warn('[Realtime] ⚠ Channel closed')
        }
      })

    return () => {
      console.log('[Realtime] Cleaning up tasks subscription')
      supabase.removeChannel(channel)
    }
    // Re-subscribe when workspace changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentWorkspaceId])

  // Create task with optimistic update
  const createTask = useCallback(
    async (taskData: Omit<TaskInsert, 'user_id'>): Promise<Task | null> => {
      if (!user) return null

      // Generate temporary ID for optimistic update
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      let optimisticTask: Task | null = null

      try {
        const supabase = getSupabase()
        
        // Build query for existing tasks - use is.null for null parent_task_id
        const parentTaskId = taskData.parent_task_id ?? null
        
        // CRITICAL: Position query must also filter by workspace_id
        if (!currentWorkspaceId) {
          throw new Error('Cannot create task: No workspace selected')
        }

        let positionQuery = supabase
          .from('tasks')
          .select('position')
          .eq('user_id', user.id)
          .eq('workspace_id', currentWorkspaceId) // CRITICAL: Filter by workspace
        
        if (parentTaskId === null || parentTaskId === undefined) {
          positionQuery = positionQuery.is('parent_task_id', null)
        } else {
          positionQuery = positionQuery.eq('parent_task_id', parentTaskId)
        }
        
        const { data: existingTasks, error: positionError } = await positionQuery
          .order('position', { ascending: false })
          .limit(1)

        if (positionError) {
          console.error('Error fetching position:', positionError)
          throw positionError
        }

        const maxPosition = existingTasks && existingTasks.length > 0 
          ? (existingTasks[0].position ?? 0) + 1 
          : 0

        // CRITICAL: Always set workspace_id to current workspace when creating task
        if (!currentWorkspaceId) {
          throw new Error('Cannot create task: No workspace selected')
        }

        // Prepare task data
        const taskToInsert: TaskInsert = {
          title: taskData.title.trim(),
          description: taskData.description?.trim() || null,
          priority: taskData.priority || null,
          deadline: taskData.deadline || null,
          parent_task_id: taskData.parent_task_id || null,
          workspace_id: currentWorkspaceId, // CRITICAL: Always use current workspace
          completed: false,
          user_id: user.id,
          position: maxPosition,
          updated_at: new Date().toISOString(),
        }

        console.log('[TasksContext] Creating task with workspace_id:', currentWorkspaceId)

        // Create optimistic task for immediate UI update
        optimisticTask = {
          id: tempId,
          user_id: taskToInsert.user_id,
          parent_task_id: taskToInsert.parent_task_id ?? null,
          workspace_id: taskToInsert.workspace_id ?? null,
          title: taskToInsert.title,
          description: taskToInsert.description ?? null,
          priority: taskToInsert.priority ?? null,
          deadline: taskToInsert.deadline ?? null,
          completed: taskToInsert.completed ?? false,
          completed_at: null,
          position: taskToInsert.position ?? null,
          background_image_url: taskToInsert.background_image_url ?? null,
          background_image_display_mode: taskToInsert.background_image_display_mode ?? null,
          created_at: new Date().toISOString(),
          updated_at: taskToInsert.updated_at ?? new Date().toISOString(),
        }

        // Optimistic update: add task immediately to UI
        setTasks((prevTasks) => [...prevTasks, optimisticTask!])
        console.log('[Optimistic] Task created optimistically:', tempId)

        // Track this as pending update
        pendingUpdatesRef.current.set(tempId, {
          id: tempId,
          type: 'create',
          timestamp: Date.now(),
        })

        // API call in background
        const { data, error: createError } = await supabase
          .from('tasks')
          .insert(taskToInsert)
          .select()
          .single()

        if (createError) {
          // Rollback: remove optimistic task
          setTasks((prevTasks) => prevTasks.filter((t) => t.id !== tempId))
          pendingUpdatesRef.current.delete(tempId)
          console.error('[Optimistic] Rollback: Task creation failed', createError)
          throw createError
        }

        // Replace optimistic task with real task
        setTasks((prevTasks) => 
          prevTasks.map((t) => (t.id === tempId ? data : t))
        )

        // Track the real ID for realtime event filtering
        pendingUpdatesRef.current.delete(tempId)
        pendingUpdatesRef.current.set(data.id, {
          id: data.id,
          type: 'create',
          timestamp: Date.now(),
        })

        // Clean up after a delay
        setTimeout(() => {
          pendingUpdatesRef.current.delete(data.id)
        }, 2000)

        showToast('Task created successfully', 'success')
        return data
      } catch (err) {
        // Rollback if not already done
        if (optimisticTask) {
          setTasks((prevTasks) => prevTasks.filter((t) => t.id !== tempId))
          pendingUpdatesRef.current.delete(tempId)
        }
        console.error('Error creating task:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to create task'
        setError(errorMessage)
        showToast(errorMessage, 'error')
        return null
      }
    },
    [user, currentWorkspaceId, showToast]
  )

  // Update task with optimistic update
  const updateTask = useCallback(
    async (id: string, updates: TaskUpdate, suppressToast = false) => {
      // Find the current task state for rollback
      const currentTask = tasks.find((t) => t.id === id)
      if (!currentTask) {
        console.warn('[Optimistic] Task not found for update:', id)
        return
      }

      const previousState = { ...currentTask }
      const updatedTask = { ...currentTask, ...updates, updated_at: new Date().toISOString() }
      
      // CRITICAL: Check if workspace_id is being changed
      const isWorkspaceChange = updates.workspace_id !== undefined && updates.workspace_id !== currentTask.workspace_id

      // Optimistic update: immediately update UI
      setTasks((prevTasks) => {
        if (isWorkspaceChange) {
          // If moving to different workspace, remove from current list immediately
          console.log('[Optimistic] Removing task from current workspace:', id, 'moving to:', updates.workspace_id)
          return prevTasks.filter((task) => task.id !== id)
        } else {
          // Normal update: update task in place
          return prevTasks.map((task) => (task.id === id ? updatedTask : task))
        }
      })
      console.log('[Optimistic] Task updated optimistically:', id, updates)

      // Track this as pending update
      pendingUpdatesRef.current.set(id, {
        id,
        type: 'update',
        timestamp: Date.now(),
        previousState: currentTask,
      })

      try {
        const supabase = getSupabase()
        const { error: updateError } = await supabase
          .from('tasks')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)

        if (updateError) {
          // Rollback: restore previous state
          setTasks((prevTasks) => {
            if (isWorkspaceChange) {
              // Restore task if it was removed
              return [...prevTasks, previousState]
            } else {
              return prevTasks.map((task) => (task.id === id ? previousState : task))
            }
          })
          pendingUpdatesRef.current.delete(id)
          console.error('[Optimistic] Rollback: Task update failed', updateError)
          throw updateError
        }

        // Success - keep the optimistic update, clean up tracking after delay
        setTimeout(() => {
          pendingUpdatesRef.current.delete(id)
        }, 2000)

        // Don't show toast for every update (too noisy for checkbox toggles)
        // Only show for significant updates
        if (isWorkspaceChange) {
          // Workspace change toast will be shown by MoveTaskModal
          // Don't show generic update toast here
        } else if (updates.title || updates.description || updates.priority || updates.deadline) {
          if (!suppressToast) {
            showToast('Task updated successfully', 'success', 2000)
          }
        }
      } catch (err) {
        // Rollback if not already done
        setTasks((prevTasks) => {
          if (isWorkspaceChange) {
            // Restore task if it was removed
            return [...prevTasks, previousState]
          } else {
            return prevTasks.map((task) => (task.id === id ? previousState : task))
          }
        })
        pendingUpdatesRef.current.delete(id)
        console.error('Error updating task:', err)
        const errorMessage = err instanceof Error ? err.message : 'Failed to update task'
        setError(errorMessage)
        if (!suppressToast) {
          showToast(errorMessage, 'error')
        }
      }
    },
    [tasks, showToast]
  )

  // Delete task with optimistic update
  const deleteTask = useCallback(async (id: string) => {
    // Find the current task state for rollback
    const currentTask = tasks.find((t) => t.id === id)
    if (!currentTask) {
      console.warn('[Optimistic] Task not found for deletion:', id)
      return
    }

    // Also find all child tasks that will be affected
    const childTasks = tasks.filter((t) => t.parent_task_id === id)

    // Optimistic update: remove task immediately from UI
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id))
    console.log('[Optimistic] Task deleted optimistically:', id)

    // Track this as pending update
    pendingUpdatesRef.current.set(id, {
      id,
      type: 'delete',
      timestamp: Date.now(),
      previousState: currentTask,
    })

    try {
      const supabase = getSupabase()
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)

      if (deleteError) {
        // Rollback: restore task and children
        setTasks((prevTasks) => {
          const restored = [...prevTasks, currentTask, ...childTasks]
          return restored
        })
        pendingUpdatesRef.current.delete(id)
        console.error('[Optimistic] Rollback: Task deletion failed', deleteError)
        throw deleteError
      }

      // Success - clean up tracking after delay
      setTimeout(() => {
        pendingUpdatesRef.current.delete(id)
      }, 2000)

      showToast('Task deleted successfully', 'success', 2000)
    } catch (err) {
      // Rollback if not already done
      setTasks((prevTasks) => {
        const restored = [...prevTasks, currentTask, ...childTasks]
        return restored
      })
      pendingUpdatesRef.current.delete(id)
      console.error('Error deleting task:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task'
      setError(errorMessage)
      showToast(errorMessage, 'error')
    }
  }, [tasks, showToast])

  // Toggle task completion
  const toggleTaskComplete = useCallback(
    async (id: string) => {
      const task = flattenTaskTree(buildTaskTree(tasks)).find((t) => t.id === id)
      if (!task) return

      const newCompleted = !task.completed
      await updateTask(id, {
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      })

      // If completing a task, check if all subtasks are complete
      // If uncompleting, uncomplete parent tasks
      if (newCompleted) {
        // Check if all siblings are complete to auto-complete parent
        // This logic can be enhanced
      } else {
        // Uncomplete all parent tasks
        let parentId = task.parent_task_id
        while (parentId) {
          const parent = tasks.find((t) => t.id === parentId)
          if (parent && parent.completed) {
            await updateTask(parentId, {
              completed: false,
              completed_at: null,
            })
          }
          parentId = parent?.parent_task_id || null
        }
      }
    },
    [tasks, updateTask]
  )

  // Add AI suggestions as subtasks
  const addAISuggestions = useCallback(
    async (taskId: string, suggestions: string[]) => {
      if (!user) return

      try {
        const supabase = getSupabase()
        // Get max position for new subtasks
        const { data: existingSubtasks } = await supabase
          .from('tasks')
          .select('position')
          .eq('user_id', user.id)
          .eq('parent_task_id', taskId)
          .order('position', { ascending: false })
          .limit(1)

        let startPosition = 0
        if (existingSubtasks && existingSubtasks.length > 0) {
          startPosition = (existingSubtasks[0].position ?? 0) + 1
        }

        // Create tasks for each suggestion
        const tasksToInsert = suggestions.map((suggestion, index) => ({
          user_id: user.id,
          parent_task_id: taskId,
          title: suggestion,
          position: startPosition + index,
          updated_at: new Date().toISOString(),
        }))

        const { error: insertError } = await supabase
          .from('tasks')
          .insert(tasksToInsert)

        if (insertError) throw insertError

        showToast(`Added ${suggestions.length} subtask${suggestions.length !== 1 ? 's' : ''}`, 'success')

        // Log suggestions to ai_suggestions table (optional)
        try {
          const suggestionsToLog = suggestions.map((suggestion) => ({
            task_id: taskId,
            suggestion,
            accepted: true,
          }))

          await supabase.from('ai_suggestions').insert(suggestionsToLog)
        } catch (logError) {
          // Non-critical error, just log it
          console.warn('Failed to log AI suggestions:', logError)
        }
      } catch (err) {
        console.error('Error adding AI suggestions:', err)
        setError(err instanceof Error ? err.message : 'Failed to add suggestions')
        throw err
      }
    },
    [user, showToast]
  )

  // State for tasks with tags (for filtering)
  const [tasksWithTags, setTasksWithTags] = useState<Map<string, string[]>>(new Map())

  // Fetch task tags for filtering
  useEffect(() => {
    if (!user || selectedTagIds.length === 0) {
      setTasksWithTags(new Map())
      return
    }

    const fetchTaskTags = async () => {
      const supabase = getSupabase()
      const { data } = await supabase
        .from('task_tags')
        .select('task_id, tag_id')
        .in('tag_id', selectedTagIds)

      if (data) {
        const taskTagsMap = new Map<string, string[]>()
        data.forEach((tt) => {
          const existing = taskTagsMap.get(tt.task_id) || []
          taskTagsMap.set(tt.task_id, [...existing, tt.tag_id])
        })
        setTasksWithTags(taskTagsMap)
      }
    }

    fetchTaskTags()
  }, [user, selectedTagIds])

  // Filter and sort tasks
  const filteredAndSortedTasks = useCallback(() => {
    // CRITICAL: Filter by workspace_id first to ensure only current workspace tasks are shown
    // This prevents old tasks from showing during workspace transitions
    let filtered: Task[] = tasks.filter((task) => {
      if (!currentWorkspaceId) return false
      return task.workspace_id === currentWorkspaceId
    })

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((task) =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query)
      )
    }

    // Apply status filter
    if (filter === 'active') {
      filtered = filtered.filter((task) => !task.completed)
    } else if (filter === 'completed') {
      filtered = filtered.filter((task) => task.completed)
    }

    // Apply tag filter
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter((task) => {
        const taskTagIds = tasksWithTags.get(task.id) || []
        return selectedTagIds.some((tagId) => taskTagIds.includes(tagId))
      })
    }

    // Apply date range filter
    if (dateRangeStart || dateRangeEnd) {
      filtered = filtered.filter((task) => {
        if (!task.deadline) return false
        const taskDate = new Date(task.deadline).getTime()
        const start = dateRangeStart ? new Date(dateRangeStart).getTime() : 0
        const end = dateRangeEnd ? new Date(dateRangeEnd).getTime() : Infinity
        return taskDate >= start && taskDate <= end
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sort) {
        case 'deadline':
          if (!a.deadline && !b.deadline) return 0
          if (!a.deadline) return 1
          if (!b.deadline) return -1
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1, null: 0 }
          return (
            (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
            (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
          )
        case 'title':
          return a.title.localeCompare(b.title)
        case 'created':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return buildTaskTree(filtered as TaskWithSubtasks[])
  }, [tasks, currentWorkspaceId, filter, sort, searchQuery, selectedTagIds, dateRangeStart, dateRangeEnd, tasksWithTags])

  const value: TasksContextType = {
    tasks: buildTaskTree(tasks as TaskWithSubtasks[]),
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskComplete,
    addAISuggestions,
    filter,
    setFilter,
    sort,
    setSort,
    searchQuery,
    setSearchQuery,
    selectedTagIds,
    setSelectedTagIds,
    dateRangeStart,
    setDateRangeStart,
    dateRangeEnd,
    setDateRangeEnd,
    filteredAndSortedTasks: filteredAndSortedTasks(),
  }

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
}

export function useTasks() {
  const context = useContext(TasksContext)
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider')
  }
  return context
}

