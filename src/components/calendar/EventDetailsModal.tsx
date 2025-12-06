import { useEffect } from 'react'
import { format } from 'date-fns'
import { X, Clock, MapPin, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarEvent } from '../../contexts/CalendarContext'

interface EventDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
}

export function EventDetailsModal({ isOpen, onClose, event }: EventDetailsModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen || !event) return null

  const startTime = new Date(event.start)
  const endTime = new Date(event.end)
  const eventColor = event.color || '#3b82f6'
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // minutes
  const isAllDay = format(startTime, 'HH:mm') === '00:00' && format(endTime, 'HH:mm') === '00:00'

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
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-background-tertiary">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: eventColor }}
              />
              <h3 className="text-xl font-bold text-text-primary">
                {event.summary}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Time */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-text-tertiary mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-text-primary">
                  {isAllDay ? (
                    'All Day'
                  ) : (
                    <>
                      {format(startTime, 'EEEE, MMMM d, yyyy')}
                      <br />
                      {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
                    </>
                  )}
                </div>
                {!isAllDay && duration > 0 && (
                  <div className="text-xs text-text-tertiary mt-1">
                    Duration: {Math.floor(duration / 60)}h {duration % 60}m
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-text-tertiary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-text-primary">Location</div>
                  <div className="text-sm text-text-secondary mt-1">{event.location}</div>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-text-tertiary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-text-primary mb-1">Description</div>
                  <div className="text-sm text-text-secondary whitespace-pre-wrap">{event.description}</div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

