import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Upload, Trash2 } from 'lucide-react'
import { useToast } from '../contexts/ToastContext'
import { uploadTaskImage } from '../lib/storage'

interface ImageAttachmentModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (storagePath: string, fileName: string, fileSize: number, mimeType: string) => Promise<void>
  userId: string
  taskId: string
}

export function ImageAttachmentModal({
  isOpen,
  onClose,
  onSave,
  userId,
  taskId,
}: ImageAttachmentModalProps) {
  const { showToast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds 10MB limit', 'error', 3000)
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

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    try {
      const result = await uploadTaskImage(selectedFile, userId, taskId, false)
      if (result.error) {
        showToast(result.error, 'error', 3000)
      } else {
        // Extract storage path from URL
        const urlParts = result.url.split('/storage/v1/object/public/task-images/')
        const storagePath = urlParts.length > 1 ? urlParts[1] : result.path
        
        await onSave(
          storagePath,
          selectedFile.name,
          selectedFile.size,
          selectedFile.type
        )
        showToast('Image uploaded successfully', 'success', 2000)
        setSelectedFile(null)
        setPreview(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        onClose()
      }
    } catch (err) {
      console.error('Upload error:', err)
      showToast('Failed to upload image', 'error', 3000)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setSelectedFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
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
              <h2 className="text-xl font-semibold text-text-primary">Add Image</h2>
              <button
                onClick={onClose}
                className="p-1 hover:bg-background-tertiary rounded transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-text-tertiary" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
              id="image-attachment-upload"
            />

            {!preview ? (
              <label
                htmlFor="image-attachment-upload"
                className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-background-tertiary rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-12 h-12 text-text-tertiary mb-3" />
                <span className="text-text-secondary mb-1">Click to upload or drag and drop</span>
                <span className="text-xs text-text-tertiary">Max 10MB (JPEG, PNG, GIF, WebP)</span>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-lg overflow-hidden border border-background-tertiary">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={handleRemove}
                    className="absolute top-2 right-2 p-2 bg-danger hover:bg-danger/90 text-white rounded-full transition-colors"
                    aria-label="Remove image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-sm text-text-secondary">
                  <p>File: {selectedFile?.name}</p>
                  <p>Size: {selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : 0} MB</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

