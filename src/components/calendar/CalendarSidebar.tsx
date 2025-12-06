import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X, ChevronRight, ChevronLeft, Menu } from 'lucide-react'
import { useCalendar } from '../../contexts/CalendarContext'

interface CalendarSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

const SIDEBAR_STORAGE_KEY = 'calendar-sidebar-expanded'

export function CalendarSidebar({ isOpen, onToggle }: CalendarSidebarProps) {
  const { calendars, selectedCalendarIds, toggleCalendar, loading } = useCalendar()
  const [isExpanded, setIsExpanded] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    return saved !== null ? saved === 'true' : true
  })

  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isExpanded))
  }, [isExpanded])

  const handleToggle = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <>
      {/* Mobile Toggle Button (when sidebar is closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed left-4 top-1/2 -translate-y-1/2 z-40 p-2 bg-background-secondary border border-background-tertiary rounded-lg shadow-lg hover:bg-background-tertiary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary md:hidden"
          aria-label="Open calendar list"
        >
          <ChevronRight className="w-5 h-5 text-text-primary" />
        </button>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Sidebar Panel */}
            <motion.div
              initial={{ width: isExpanded ? 256 : 48 }}
              animate={{ width: isExpanded ? 256 : 48 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                fixed left-0 top-0 bottom-0 z-50
                bg-background-secondary border-r border-background-tertiary
                shadow-xl flex flex-col overflow-hidden
                md:relative md:shadow-none md:z-auto
                w-[280px] sm:w-[256px] md:w-auto
              `}
            >
              {/* Header - Always visible, even when collapsed */}
              <div className="flex items-center justify-between p-4 border-b border-background-tertiary flex-shrink-0 min-w-[48px]">
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="flex items-center gap-2 overflow-hidden"
                  >
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="text-lg font-bold text-text-primary whitespace-nowrap">Calendars</h3>
                  </motion.div>
                )}
                <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                  <button
                    onClick={handleToggle}
                    className="p-1.5 hover:bg-background-tertiary rounded-lg transition-colors flex-shrink-0"
                    aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                  >
                    {isExpanded ? (
                      <ChevronLeft className="w-4 h-4 text-text-tertiary" />
                    ) : (
                      <Menu className="w-4 h-4 text-text-tertiary" />
                    )}
                  </button>
                  <button
                    onClick={onToggle}
                    className="p-1.5 hover:bg-background-tertiary rounded-lg transition-colors md:hidden flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-text-tertiary" />
                  </button>
                </div>
              </div>

              {/* Calendar List */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 overflow-y-auto p-4 space-y-2"
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Footer Info */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 border-t border-background-tertiary flex-shrink-0"
                >
                  <p className="text-xs text-text-tertiary text-center">
                    {selectedCalendarIds.length} of {calendars.length} calendars shown
                  </p>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

