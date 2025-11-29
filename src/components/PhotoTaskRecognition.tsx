import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Camera, Upload, X, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { analyzePhotoForTasks, DetectedTask } from '../lib/openai'
import { imageToBase64 } from '../lib/storage'
import { useToast } from '../contexts/ToastContext'
import { TaskPreviewModal } from './TaskPreviewModal'

interface PhotoTaskRecognitionProps {
  isOpen: boolean
  onClose: () => void
  onTasksCreated: () => void
}

export function PhotoTaskRecognition({
  isOpen,
  onClose,
  onTasksCreated,
}: PhotoTaskRecognitionProps) {
  const { showToast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [detectedTasks, setDetectedTasks] = useState<DetectedTask[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null)
      setPreview(null)
      setDetectedTasks([])
      setShowPreview(false)
      setError(null)
    }
  }, [isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      showToast('Invalid file type. Please use JPG, PNG, GIF, or WebP', 'error', 3000)
      return
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      showToast('File size exceeds 20MB limit', 'error', 3000)
      return
    }

    setSelectedFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return

    setAnalyzing(true)
    setError(null)

    try {
      // Convert image to base64
      const { base64, mimeType } = await imageToBase64(selectedFile)

      // Analyze with OpenAI Vision
      const result = await analyzePhotoForTasks(base64, mimeType)

      if (result.tasks && result.tasks.length > 0) {
        setDetectedTasks(result.tasks)
        setShowPreview(true)
      } else {
        setError('No tasks detected in the image. Please try a clearer photo.')
      }
    } catch (err) {
      console.error('Error analyzing photo:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze photo'
      setError(errorMessage)
      showToast(errorMessage, 'error', 4000)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setPreview(null)
    setDetectedTasks([])
    setShowPreview(false)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleTasksCreated = () => {
    handleReset()
    onTasksCreated()
    onClose()
  }

  if (!isOpen) return null

  // Show preview modal if tasks are detected
  if (showPreview && detectedTasks.length > 0) {
    return (
      <TaskPreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false)
          handleReset()
        }}
        detectedTasks={detectedTasks}
        onTasksCreated={handleTasksCreated}
      />
    )
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-background-tertiary">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">Extract Tasks from Photo</h2>
                <p className="text-sm text-text-tertiary">Take or upload a photo of your to-do list</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {!preview ? (
              <div className="space-y-4">
                <div className="bg-background-tertiary/50 border border-background-tertiary rounded-lg p-4 mb-4">
                  <p className="text-sm text-text-secondary">
                    <strong>Tips for best results:</strong>
                  </p>
                  <ul className="text-xs text-text-tertiary mt-2 space-y-1 list-disc list-inside">
                    <li>Ensure the text is clear and readable</li>
                    <li>Good lighting helps with accuracy</li>
                    <li>Include indentation or bullets to show task hierarchy</li>
                    <li>Write dates and times clearly</li>
                  </ul>
                </div>

                {/* Mobile: Camera and Gallery */}
                <div className="grid grid-cols-2 gap-4 sm:hidden">
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-background-tertiary rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <Camera className="w-8 h-8 text-text-tertiary mb-2" />
                    <span className="text-sm text-text-secondary">Take Photo</span>
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>

                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-background-tertiary rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="w-8 h-8 text-text-tertiary mb-2" />
                    <span className="text-sm text-text-secondary">Upload Photo</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Desktop: File Upload */}
                <label className="hidden sm:flex flex-col items-center justify-center p-12 border-2 border-dashed border-background-tertiary rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                  <Upload className="w-12 h-12 text-text-tertiary mb-4" />
                  <span className="text-text-secondary mb-1">Click to upload or drag and drop</span>
                  <span className="text-xs text-text-tertiary">JPG, PNG, GIF, WebP (max 20MB)</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Image Preview */}
                <div className="relative rounded-lg overflow-hidden border border-background-tertiary">
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-auto max-h-96 object-contain bg-background-tertiary"
                  />
                  <button
                    onClick={handleReset}
                    className="absolute top-2 right-2 p-2 bg-background-secondary/90 hover:bg-background-secondary rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4 text-text-tertiary" />
                  </button>
                </div>

                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>{error}</span>
                  </div>
                )}

                {analyzing && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                    <p className="text-text-secondary">Analyzing image...</p>
                    <p className="text-xs text-text-tertiary mt-2">This may take a few seconds</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {preview && !analyzing && (
            <div className="flex items-center justify-between p-6 border-t border-background-tertiary">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
              >
                Choose Different Photo
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!selectedFile || analyzing}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Analyze Photo
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

