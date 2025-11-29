import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Eye, Trash2 } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { uploadTaskImage, isValidImageUrl, deleteTaskImage } from '../lib/storage'
import { BackgroundImageDisplayMode } from '../types/attachment'

interface BackgroundImageUploadProps {
  currentImageUrl: string | null
  displayMode: BackgroundImageDisplayMode
  onSave: (imageUrl: string | null, displayMode: BackgroundImageDisplayMode) => Promise<void>
  userId: string
  taskId: string
  onClose: () => void
}

export function BackgroundImageUpload({
  currentImageUrl,
  displayMode,
  onSave,
  userId,
  taskId,
  onClose,
}: BackgroundImageUploadProps) {
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [imageUrl, setImageUrl] = useState(currentImageUrl || '')
  const [urlInput, setUrlInput] = useState('')
  const [selectedMode, setSelectedMode] = useState<BackgroundImageDisplayMode>(displayMode || 'thumbnail')
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'url'>('upload')

  // Reset state when modal opens/closes
  useEffect(() => {
    if (currentImageUrl) {
      setImageUrl(currentImageUrl)
      setPreviewUrl(currentImageUrl)
    } else {
      setImageUrl('')
      setPreviewUrl(null)
    }
    setSelectedMode(displayMode || 'thumbnail')
  }, [currentImageUrl, displayMode])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const result = await uploadTaskImage(file, userId, taskId, true)
      if (result.error) {
        showToast(result.error, 'error', 3000)
      } else {
        setImageUrl(result.url)
        setPreviewUrl(result.url)
        showToast('Image uploaded successfully', 'success', 2000)
      }
    } catch (err) {
      console.error('Upload error:', err)
      showToast('Failed to upload image', 'error', 3000)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
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

    setImageUrl(urlInput)
    setPreviewUrl(urlInput)
    setUrlInput('')
    showToast('Image URL set', 'success', 2000)
  }

  const handleRemove = async () => {
    if (currentImageUrl && currentImageUrl.includes('/storage/v1/object/public/')) {
      // Extract storage path from URL
      const urlParts = currentImageUrl.split('/storage/v1/object/public/task-images/')
      if (urlParts.length > 1) {
        const storagePath = urlParts[1]
        await deleteTaskImage(storagePath)
      }
    }
    setImageUrl('')
    setPreviewUrl(null)
    showToast('Background image removed', 'success', 2000)
  }

  const handleSave = async () => {
    if (!previewUrl) {
      // Remove background image
      await onSave(null, null)
    } else {
      await onSave(imageUrl, selectedMode)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Set Background Image</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-background-tertiary rounded transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Upload Method Selection */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setUploadMethod('upload')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                uploadMethod === 'upload'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background-tertiary border-background-tertiary text-text-secondary hover:border-primary/50'
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Upload File
            </button>
            <button
              onClick={() => setUploadMethod('url')}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                uploadMethod === 'url'
                  ? 'bg-primary text-white border-primary'
                  : 'bg-background-tertiary border-background-tertiary text-text-secondary hover:border-primary/50'
              }`}
            >
              <LinkIcon className="w-4 h-4 inline mr-2" />
              Paste URL
            </button>
          </div>

          {/* Upload Method Content */}
          <AnimatePresence mode="wait">
            {uploadMethod === 'upload' ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="background-image-upload"
                />
                <label
                  htmlFor="background-image-upload"
                  className={`
                    flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg
                    cursor-pointer transition-colors
                    ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
                    ${previewUrl ? 'border-primary/50' : 'border-background-tertiary'}
                  `}
                >
                  {uploading ? (
                    <>
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-3" />
                      <span className="text-text-secondary">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-12 h-12 text-text-tertiary mb-3" />
                      <span className="text-text-secondary mb-1">Click to upload or drag and drop</span>
                      <span className="text-xs text-text-tertiary">Max 10MB (JPEG, PNG, GIF, WebP)</span>
                    </>
                  )}
                </label>
              </motion.div>
            ) : (
              <motion.div
                key="url"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-4 py-2 bg-background-tertiary border border-background-tertiary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handleUrlSubmit}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
                  >
                    Set URL
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview */}
          {previewUrl && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-text-tertiary" />
                <span className="text-sm text-text-secondary">Preview</span>
              </div>
              <div className="relative rounded-lg overflow-hidden border border-background-tertiary">
                <img
                  src={previewUrl}
                  alt="Background preview"
                  className="w-full h-48 object-cover"
                  onError={() => {
                    setPreviewUrl(null)
                    showToast('Failed to load image', 'error', 2000)
                  }}
                />
                <button
                  onClick={handleRemove}
                  className="absolute top-2 right-2 p-2 bg-danger hover:bg-danger/90 text-white rounded-full transition-colors"
                  aria-label="Remove image"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Display Mode Selection */}
          {previewUrl && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Display Style
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedMode('thumbnail')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    selectedMode === 'thumbnail'
                      ? 'border-primary bg-primary/10'
                      : 'border-background-tertiary hover:border-primary/50'
                  }`}
                >
                  <ImageIcon className="w-6 h-6 mx-auto mb-2 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">Thumbnail</span>
                  <span className="text-xs text-text-tertiary block mt-1">Above task</span>
                </button>
                <button
                  onClick={() => setSelectedMode('icon')}
                  className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                    selectedMode === 'icon'
                      ? 'border-primary bg-primary/10'
                      : 'border-background-tertiary hover:border-primary/50'
                  }`}
                >
                  <ImageIcon className="w-6 h-6 mx-auto mb-2 text-text-tertiary" />
                  <span className="text-sm text-text-secondary">Icon</span>
                  <span className="text-xs text-text-tertiary block mt-1">Right side</span>
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={uploading}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

