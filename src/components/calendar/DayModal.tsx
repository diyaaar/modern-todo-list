import { useEffect } from 'react'
import { format, isSameDay } from 'date-fns'
import { X, Plus, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarEvent } from '../../contexts/CalendarContext'
import { EventBlock } from './EventBlock'

interface DayModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
  events: CalendarEvent[]
  onCreateEvent?: (date: Date) => void
}

export function DayModal({ isOpen, onClose, date, events, onCreateEvent }: DayModalProps) {
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

  if (!isOpen) return null

  const dayEvents = events.filter(event => {
    const eventDate = new Date(event.start)
    return isSameDay(eventDate, date)
  })

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
          className="bg-background-secondary border border-background-tertiary rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-background-tertiary">
            <div>
              <h3 className="text-xl font-bold text-text-primary">
                {format(date, 'EEEE, MMMM d, yyyy')}
              </h3>
              <p className="text-sm text-text-tertiary mt-1">
                {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
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
            {dayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-background-tertiary rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-text-tertiary" />
                </div>
                <p className="text-text-secondary font-medium mb-2">No events scheduled</p>
                <p className="text-text-tertiary text-sm">
                  This day is free. Add an event to get started.
                </p>
              </div>
            ) : (
              dayEvents.map((event) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <EventBlock
                    event={event}
                    variant="day"
                    onClick={() => {
                      // TODO: Open event details
                      console.log('Event clicked:', event)
                    }}
                  />
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-background-tertiary">
            <button
              onClick={() => {
                onCreateEvent?.(date)
                onClose()
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              <Plus className="w-5 h-5" />
              Add Event
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

