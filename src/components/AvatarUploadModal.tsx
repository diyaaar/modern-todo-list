import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Trash2, Camera } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { useAuth } from '../contexts/AuthContext'
import { uploadAvatar, deleteAvatar, isValidImageUrl } from '../lib/storage'

interface AvatarUploadModalProps {
  isOpen: boolean
  onClose: () => void
  currentAvatarUrl: string | null
}

export function AvatarUploadModal({
  isOpen,
  onClose,
  currentAvatarUrl,
}: AvatarUploadModalProps) {
  const { user, updateAvatar } = useAuth()
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPreview(currentAvatarUrl)
      setSelectedFile(null)
      setUrlInput('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [isOpen, currentAvatarUrl])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('File size exceeds 5MB limit', 'error', 3000)
      return
    }

    // Validate MIME type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      showToast('Invalid file type. Allowed: JPEG, PNG, GIF, WebP', 'error', 3000)
      return
    }

    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      showToast('Please enter a valid URL', 'error', 2000)
      return
    }

    if (!isValidImageUrl(urlInput)) {
      showToast('Invalid URL format', 'error', 2000)
      return
    }

    setPreview(urlInput)
    setUrlInput('')
    showToast('Image URL set', 'success', 2000)
  }

  const handleUpload = async () => {
    if (!user) return

    if (selectedFile) {
      // Upload file
      setUploading(true)
      try {
        const result = await uploadAvatar(selectedFile, user.id)
        if (result.error) {
          showToast(result.error, 'error', 3000)
          return
        }

        // Update user's avatar_url in database
        await updateAvatar(result.url)
        showToast('Avatar uploaded successfully', 'success', 2000)
        onClose()
      } catch (err) {
        console.error('Upload error:', err)
        showToast('Failed to upload avatar', 'error', 3000)
      } finally {
        setUploading(false)
      }
    } else if (preview && preview.startsWith('http')) {
      // Use URL directly
      setUploading(true)
      try {
        await updateAvatar(preview)
        showToast('Avatar updated successfully', 'success', 2000)
        onClose()
      } catch (err) {
        console.error('Update error:', err)
        showToast('Failed to update avatar', 'error', 3000)
      } finally {
        setUploading(false)
      }
    }
  }

  const handleRemove = async () => {
    if (!user || !currentAvatarUrl) return

    setUploading(true)
    try {
      // If avatar is from storage, delete it
      if (currentAvatarUrl.includes('/storage/v1/object/public/user-avatars/')) {
        const urlParts = currentAvatarUrl.split('/storage/v1/object/public/user-avatars/')
        if (urlParts.length > 1) {
          const storagePath = urlParts[1]
          await deleteAvatar(storagePath)
        }
      }

      await updateAvatar(null)
      setPreview(null)
      showToast('Avatar removed', 'success', 2000)
      onClose()
    } catch (err) {
      console.error('Remove error:', err)
      showToast('Failed to remove avatar', 'error', 3000)
    } finally {
      setUploading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl max-w-md w-full z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-primary">Change Profile Picture</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-background-tertiary rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            {/* Preview */}
            <div className="flex justify-center mb-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background-tertiary">
                {preview ? (
                  <img
                    src={preview}
                    alt="Avatar preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-background-tertiary flex items-center justify-center">
                    <Camera className="w-12 h-12 text-text-tertiary" />
                  </div>
                )}
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-background-tertiary hover:bg-background-tertiary/80 rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">Upload from device</span>
                </label>
              </div>

              {/* URL Input */}
              <div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Or paste image URL"
                    className="flex-1 px-3 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUrlSubmit()
                      }
                    }}
                  />
                  <button
                    onClick={handleUrlSubmit}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm"
                  >
                    Use URL
                  </button>
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Max 5MB. Formats: JPEG, PNG, GIF, WebP
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-background-tertiary">
              {currentAvatarUrl && (
                <button
                  onClick={handleRemove}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="text-sm">Remove</span>
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!preview || uploading || (!selectedFile && preview === currentAvatarUrl)}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

