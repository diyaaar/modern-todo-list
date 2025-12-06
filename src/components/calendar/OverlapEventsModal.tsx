import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarEvent } from '../../contexts/CalendarContext'
import { EventBlock } from './EventBlock'

interface OverlapEventsModalProps {
  isOpen: boolean
  onClose: () => void
  events: CalendarEvent[]
  timeSlot: string
}

export function OverlapEventsModal({ isOpen, onClose, events, timeSlot }: OverlapEventsModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-background-tertiary">
            <div>
              <h3 className="text-lg font-bold text-text-primary">Events at {timeSlot}</h3>
              <p className="text-sm text-text-tertiary mt-1">
                {events.length} event{events.length !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Events List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
              >
                <EventBlock
                  event={event}
                  variant="day"
                  onClick={() => {
                    // Event click handler can be passed as prop if needed
                    onClose()
                  }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

