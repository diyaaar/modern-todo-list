import { getSupabaseClient } from './supabase'

const BUCKET_NAME = 'task-images'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

export interface UploadResult {
  path: string
  url: string
  error?: string
}

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user's ID
 * @param taskId - The task's ID
 * @param isBackground - Whether this is a background image
 * @returns The storage path and public URL
 */
export async function uploadTaskImage(
  file: File,
  userId: string,
  taskId: string,
  isBackground: boolean = false
): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      path: '',
      url: '',
      error: `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      path: '',
      url: '',
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  try {
    const supabase = getSupabaseClient()
    
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = isBackground
      ? `background-${timestamp}.${fileExtension}`
      : `attachment-${timestamp}.${fileExtension}`
    
    // Storage path: {user_id}/{task_id}/{filename}
    const storagePath = `${userId}/${taskId}/${fileName}`

    // Upload file
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (error) {
      console.error('Storage upload error:', error)
      return {
        path: '',
        url: '',
        error: error.message || 'Failed to upload image',
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath)

    return {
      path: storagePath,
      url: urlData?.publicUrl || '',
    }
  } catch (err) {
    console.error('Upload error:', err)
    return {
      path: '',
      url: '',
      error: err instanceof Error ? err.message : 'Failed to upload image',
    }
  }
}

/**
 * Delete an image from Supabase Storage
 * @param storagePath - The storage path of the image to delete
 */
export async function deleteTaskImage(storagePath: string): Promise<{ error?: string }> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([storagePath])

    if (error) {
      console.error('Storage delete error:', error)
      return { error: error.message || 'Failed to delete image' }
    }

    return {}
  } catch (err) {
    console.error('Delete error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to delete image' }
  }
}

/**
 * Get public URL for an image from storage path
 * @param storagePath - The storage path
 * @returns Public URL
 */
export function getImageUrl(storagePath: string): string {
  const supabase = getSupabaseClient()
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath)
  return data.publicUrl
}

/**
 * Validate image URL (for external URLs)
 * @param url - The URL to validate
 * @returns Whether the URL is valid
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

// ============================================
// AVATAR UPLOAD FUNCTIONS
// ============================================

const AVATAR_BUCKET_NAME = 'user-avatars'
const AVATAR_MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const AVATAR_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

/**
 * Upload a user avatar to Supabase Storage
 * @param file - The image file to upload
 * @param userId - The user's ID
 * @returns The storage path and public URL
 */
export async function uploadAvatar(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate file size
  if (file.size > AVATAR_MAX_FILE_SIZE) {
    return {
      path: '',
      url: '',
      error: `File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  // Validate MIME type
  if (!AVATAR_ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      path: '',
      url: '',
      error: `Invalid file type. Allowed types: ${AVATAR_ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  try {
    const supabase = getSupabaseClient()
    
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `avatar-${timestamp}.${fileExtension}`
    
    // Storage path: {user_id}/{filename}
    const storagePath = `${userId}/${fileName}`

    // Delete old avatar if exists (optional - you might want to keep history)
    // For now, we'll use upsert to replace the old one
    // But first, let's get the old avatar path from user metadata
    
    // Upload file (upsert: true to replace if exists)
    const { error } = await supabase.storage
      .from(AVATAR_BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true, // Replace existing avatar
      })

    if (error) {
      console.error('Avatar upload error:', error)
      return {
        path: '',
        url: '',
        error: error.message || 'Failed to upload avatar',
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(AVATAR_BUCKET_NAME)
      .getPublicUrl(storagePath)

    return {
      path: storagePath,
      url: urlData?.publicUrl || '',
    }
  } catch (err) {
    console.error('Avatar upload error:', err)
    return {
      path: '',
      url: '',
      error: err instanceof Error ? err.message : 'Failed to upload avatar',
    }
  }
}

/**
 * Delete a user avatar from Supabase Storage
 * @param storagePath - The storage path of the avatar to delete
 */
export async function deleteAvatar(storagePath: string): Promise<{ error?: string }> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.storage.from(AVATAR_BUCKET_NAME).remove([storagePath])

    if (error) {
      console.error('Avatar delete error:', error)
      return { error: error.message || 'Failed to delete avatar' }
    }

    return {}
  } catch (err) {
    console.error('Avatar delete error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to delete avatar' }
  }
}

/**
 * Get public URL for an avatar from storage path
 * @param storagePath - The storage path
 * @returns Public URL
 */
export function getAvatarUrl(storagePath: string): string {
  const supabase = getSupabaseClient()
  const { data } = supabase.storage.from(AVATAR_BUCKET_NAME).getPublicUrl(storagePath)
  return data.publicUrl
}

// ============================================
// TEMPORARY PHOTO STORAGE (for AI analysis)
// ============================================

const TEMP_PHOTO_BUCKET_NAME = 'task-photos'
const TEMP_PHOTO_MAX_FILE_SIZE = 20 * 1024 * 1024 // 20 MB for photos

/**
 * Upload a temporary photo for AI analysis
 * Photos are stored temporarily and should be deleted after processing
 * @param file - The image file to upload
 * @param userId - The user's ID
 * @returns The storage path and public URL
 */
export async function uploadTempPhoto(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate file size
  if (file.size > TEMP_PHOTO_MAX_FILE_SIZE) {
    return {
      path: '',
      url: '',
      error: `File size exceeds 20MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      path: '',
      url: '',
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }

  try {
    const supabase = getSupabaseClient()
    
    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `temp-${timestamp}.${fileExtension}`
    
    // Storage path: {user_id}/temp/{filename}
    const storagePath = `${userId}/temp/${fileName}`

    // Upload file
    const { error } = await supabase.storage
      .from(TEMP_PHOTO_BUCKET_NAME)
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Temp photo upload error:', error)
      return {
        path: '',
        url: '',
        error: error.message || 'Failed to upload photo',
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(TEMP_PHOTO_BUCKET_NAME)
      .getPublicUrl(storagePath)

    return {
      path: storagePath,
      url: urlData?.publicUrl || '',
    }
  } catch (err) {
    console.error('Temp photo upload error:', err)
    return {
      path: '',
      url: '',
      error: err instanceof Error ? err.message : 'Failed to upload photo',
    }
  }
}

/**
 * Delete a temporary photo
 * @param storagePath - The storage path of the photo to delete
 */
export async function deleteTempPhoto(storagePath: string): Promise<{ error?: string }> {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.storage.from(TEMP_PHOTO_BUCKET_NAME).remove([storagePath])

    if (error) {
      console.error('Temp photo delete error:', error)
      return { error: error.message || 'Failed to delete photo' }
    }

    return {}
  } catch (err) {
    console.error('Temp photo delete error:', err)
    return { error: err instanceof Error ? err.message : 'Failed to delete photo' }
  }
}

/**
 * Convert image file to base64 for OpenAI Vision API
 * @param file - The image file
 * @returns Base64 encoded string and MIME type
 */
export function imageToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1] || result
      resolve({
        base64,
        mimeType: file.type,
      })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

