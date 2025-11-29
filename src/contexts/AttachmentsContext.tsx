import { createContext, useContext, ReactNode, useCallback } from 'react'
import { getSupabaseClient } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { TaskLink, TaskLinkUpdate, TaskImage } from '../types/attachment'

const getSupabase = () => getSupabaseClient()

interface AttachmentsContextType {
  // Links
  getTaskLinks: (taskId: string) => Promise<TaskLink[]>
  addTaskLink: (taskId: string, url: string, displayName?: string) => Promise<TaskLink | null>
  updateTaskLink: (linkId: string, updates: TaskLinkUpdate) => Promise<void>
  deleteTaskLink: (linkId: string) => Promise<void>
  
  // Images
  getTaskImages: (taskId: string) => Promise<TaskImage[]>
  addTaskImage: (taskId: string, storagePath: string, fileName: string, fileSize: number, mimeType: string) => Promise<TaskImage | null>
  deleteTaskImage: (imageId: string) => Promise<void>
}

const AttachmentsContext = createContext<AttachmentsContextType | undefined>(undefined)

export function AttachmentsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  // Get links for a task
  const getTaskLinks = useCallback(async (taskId: string): Promise<TaskLink[]> => {
    if (taskId.startsWith('temp-')) {
      return []
    }

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('task_links')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          return []
        }
        throw error
      }

      return data || []
    } catch (err) {
      console.error('Error getting task links:', err)
      return []
    }
  }, [])

  // Add link to task
  const addTaskLink = useCallback(async (
    taskId: string,
    url: string,
    displayName?: string
  ): Promise<TaskLink | null> => {
    if (!user) return null

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('task_links')
        .insert({
          task_id: taskId,
          url,
          display_name: displayName || null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error adding task link:', err)
      throw err
    }
  }, [user])

  // Update task link
  const updateTaskLink = useCallback(async (
    linkId: string,
    updates: TaskLinkUpdate
  ): Promise<void> => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('task_links')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkId)

      if (error) throw error
    } catch (err) {
      console.error('Error updating task link:', err)
      throw err
    }
  }, [])

  // Delete task link
  const deleteTaskLink = useCallback(async (linkId: string): Promise<void> => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('task_links')
        .delete()
        .eq('id', linkId)

      if (error) throw error
    } catch (err) {
      console.error('Error deleting task link:', err)
      throw err
    }
  }, [])

  // Get images for a task
  const getTaskImages = useCallback(async (taskId: string): Promise<TaskImage[]> => {
    if (taskId.startsWith('temp-')) {
      return []
    }

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('task_images')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true })

      if (error) {
        if (error.code === 'PGRST116' || error.message?.includes('not found')) {
          return []
        }
        throw error
      }

      return data || []
    } catch (err) {
      console.error('Error getting task images:', err)
      return []
    }
  }, [])

  // Add image to task
  const addTaskImage = useCallback(async (
    taskId: string,
    storagePath: string,
    fileName: string,
    fileSize: number,
    mimeType: string
  ): Promise<TaskImage | null> => {
    if (!user) return null

    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('task_images')
        .insert({
          task_id: taskId,
          storage_path: storagePath,
          file_name: fileName,
          file_size: fileSize,
          mime_type: mimeType,
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error adding task image:', err)
      throw err
    }
  }, [user])

  // Delete task image
  const deleteTaskImage = useCallback(async (imageId: string): Promise<void> => {
    try {
      const supabase = getSupabase()
      
      // First get the image to delete from storage
      const { data: imageData, error: fetchError } = await supabase
        .from('task_images')
        .select('storage_path')
        .eq('id', imageId)
        .single()

      if (fetchError) throw fetchError

      // Delete from database
      const { error: deleteError } = await supabase
        .from('task_images')
        .delete()
        .eq('id', imageId)

      if (deleteError) throw deleteError

      // Delete from storage
      if (imageData?.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('task-images')
          .remove([imageData.storage_path])

        if (storageError) {
          console.warn('Failed to delete image from storage:', storageError)
          // Don't throw - database deletion succeeded
        }
      }
    } catch (err) {
      console.error('Error deleting task image:', err)
      throw err
    }
  }, [])

  const value: AttachmentsContextType = {
    getTaskLinks,
    addTaskLink,
    updateTaskLink,
    deleteTaskLink,
    getTaskImages,
    addTaskImage,
    deleteTaskImage,
  }

  return <AttachmentsContext.Provider value={value}>{children}</AttachmentsContext.Provider>
}

export function useAttachments() {
  const context = useContext(AttachmentsContext)
  if (context === undefined) {
    throw new Error('useAttachments must be used within an AttachmentsProvider')
  }
  return context
}

