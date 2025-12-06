import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, X, ChevronLeft, Menu } from 'lucide-react'
import { useCalendar } from '../../contexts/CalendarContext'

interface CalendarSidebarProps {
  isOpen: boolean
  onToggle: () => void
}


export function CalendarSidebar({ isOpen, onToggle }: CalendarSidebarProps) {
  const { calendars, selectedCalendarIds, toggleCalendar, loading } = useCalendar()

  return (
    <>
      {/* Toggle Button - Visible when sidebar is closed (both mobile and desktop) */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          onClick={onToggle}
          className="fixed left-2 top-20 z-50 p-3 bg-background-secondary border border-background-tertiary rounded-lg shadow-lg hover:bg-background-tertiary active:bg-background-tertiary/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open calendar list"
        >
          <Menu className="w-5 h-5 text-text-primary" />
        </motion.button>
      )}

      {/* Desktop Sidebar - Always rendered, smooth width/opacity animation */}
      <motion.div
        initial={false}
        animate={{
          width: isOpen ? 256 : 0,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{
          duration: 0.35,
          ease: [0.4, 0.0, 0.2, 1], // Smooth easing (cubic-bezier)
        }}
        className="hidden md:block relative overflow-hidden flex-shrink-0"
        style={{
          willChange: 'width, opacity',
        }}
      >
        <div
          className="w-[256px] h-full bg-background-secondary border-r border-background-tertiary flex flex-col overflow-hidden"
          style={{
            pointerEvents: isOpen ? 'auto' : 'none',
          }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-background-tertiary flex-shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-lg font-bold text-text-primary">Calendars</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onToggle}
                  className="p-1.5 hover:bg-background-tertiary active:bg-background-tertiary/80 rounded-lg transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close sidebar"
                  title="Close sidebar"
                >
                  <ChevronLeft className="w-4 h-4 text-text-tertiary" />
                </button>
              </div>
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
            <div className="p-4 border-t border-background-tertiary flex-shrink-0">
              <p className="text-xs text-text-tertiary text-center">
                {selectedCalendarIds.length} of {calendars.length} calendars shown
              </p>
            </div>
          </div>
        </motion.div>

      {/* Mobile Sidebar - Slide in/out animation */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            />

            {/* Mobile Sidebar Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden bg-background-secondary border-r border-background-tertiary shadow-xl flex flex-col overflow-hidden w-[50vw] max-w-[280px] min-w-[240px]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-background-tertiary flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                  <h3 className="text-lg font-bold text-text-primary">Calendars</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggle}
                    className="p-1.5 hover:bg-background-tertiary active:bg-background-tertiary/80 rounded-lg transition-colors flex-shrink-0 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Close sidebar"
                    title="Close sidebar"
                  >
                    <X className="w-5 h-5 text-text-tertiary" />
                  </button>
                </div>
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
              <div className="p-4 border-t border-background-tertiary flex-shrink-0">
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

