import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X, ChevronRight } from 'lucide-react'
import { useCalendar } from '../../contexts/CalendarContext'

interface CalendarSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

export function CalendarSidebar({ isOpen, onToggle }: CalendarSidebarProps) {
  const { calendars, selectedCalendarIds, toggleCalendar, loading } = useCalendar()

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={`
          fixed left-4 top-1/2 -translate-y-1/2 z-40
          p-2 bg-background-secondary border border-background-tertiary rounded-lg
          shadow-lg hover:bg-background-tertiary transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary
          ${isOpen ? 'hidden' : 'block'}
        `}
        aria-label="Toggle calendar list"
      >
        <ChevronRight className="w-5 h-5 text-text-primary" />
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                fixed left-0 top-0 bottom-0 z-50
                w-64 bg-background-secondary border-r border-background-tertiary
                shadow-xl flex flex-col
                md:relative md:shadow-none md:border-r md:border-background-tertiary
              `}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-background-tertiary">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-text-primary">Calendars</h3>
                </div>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-background-tertiary rounded-lg transition-colors md:hidden"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-text-tertiary" />
                </button>
              </div>

              {/* Calendar List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading ? (
                  <div className="text-sm text-text-tertiary text-center py-8">
                    Loading calendars...
                  </div>
                ) : calendars.length === 0 ? (
                  <div className="text-sm text-text-tertiary text-center py-8">
                    No calendars found. Connect Google Calendar to get started.
                  </div>
                ) : (
                  calendars.map((calendar) => {
                    const isSelected = selectedCalendarIds.includes(calendar.id)
                    return (
                      <motion.div
                        key={calendar.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer group"
                        onClick={() => toggleCalendar(calendar.id)}
                      >
                        {/* Color Indicator */}
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-background-tertiary"
                          style={{
                            backgroundColor: isSelected ? calendar.color : 'transparent',
                            borderColor: isSelected ? calendar.color : calendar.color,
                          }}
                        >
                          {isSelected && (
                            <div className="w-full h-full rounded-full bg-white/20" />
                          )}
                        </div>

                        {/* Calendar Name */}
                        <span
                          className={`flex-1 text-sm font-medium transition-colors ${
                            isSelected ? 'text-text-primary' : 'text-text-secondary'
                          }`}
                        >
                          {calendar.name}
                        </span>

                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleCalendar(calendar.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-background-tertiary text-primary focus:ring-2 focus:ring-primary cursor-pointer"
                          aria-label={`Toggle ${calendar.name} calendar`}
                        />
                      </motion.div>
                    )
                  })
                )}
              </div>

              {/* Footer Info */}
              <div className="p-4 border-t border-background-tertiary">
                <p className="text-xs text-text-tertiary text-center">
                  {selectedCalendarIds.length} of {calendars.length} calendars shown
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

