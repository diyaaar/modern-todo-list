import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RotateCcw } from 'lucide-react'

interface UndoSnackbarProps {
  isOpen: boolean
  onUndo: () => void
  onClose: () => void
  duration?: number // Duration in milliseconds (default: 3000)
  message?: string
}

export function UndoSnackbar({
  isOpen,
  onUndo,
  onClose,
  duration = 3000,
  message = 'Task deleted',
}: UndoSnackbarProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    if (!isOpen) {
      setProgress(100)
      return
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, duration - elapsed)
      const progressPercent = (remaining / duration) * 100
      setProgress(progressPercent)

      if (remaining === 0) {
        clearInterval(interval)
        onClose()
      }
    }, 16) // Update every ~16ms for smooth animation (60fps)

    return () => clearInterval(interval)
  }, [isOpen, duration, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
            className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl min-w-[280px] max-w-[400px] pointer-events-auto"
          >
            <div className="p-4">
              {/* Progress bar */}
              <div className="mb-3 h-1 bg-background-tertiary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: '100%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.016, ease: 'linear' }}
                />
              </div>

              {/* Content */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-text-primary flex-1">{message}</span>
                <button
                  onClick={() => {
                    onUndo()
                    onClose()
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-primary hover:text-primary-dark hover:bg-primary/10 rounded transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Undo
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

