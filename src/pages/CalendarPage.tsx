import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Plus, Loader2, HelpCircle } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isPast,
  isWeekend,
  startOfDay,
  isToday as isTodayDate,
  addDays,
} from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useCalendar, CalendarEvent } from '../contexts/CalendarContext'
import { useToast } from '../contexts/ToastContext'
import { EventBlock } from '../components/calendar/EventBlock'
import { Tooltip } from '../components/calendar/Tooltip'
import { DayModal } from '../components/calendar/DayModal'
import { EventDetailsModal } from '../components/calendar/EventDetailsModal'
import { calendarTheme } from '../config/calendarTheme'
import { WeekView } from '../components/calendar/WeekView'
import { CalendarSidebar } from '../components/calendar/CalendarSidebar'
import { getEventsForWeek } from '../utils/calendarUtils'

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  // Sidebar state: closed by default on both mobile and desktop
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { events, loading, error, fetchEvents, isAuthenticated, connectGoogleCalendar, fetchCalendars, updateCurrentDate } = useCalendar()
  const { showToast } = useToast()
  const calendarRef = useRef<HTMLDivElement>(null)

  // Load data once on mount or when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchCalendars()
      // Only show loading on initial load
      fetchEvents(currentDate, true)
      updateCurrentDate(currentDate)
    }
  }, [isAuthenticated]) // Only depend on isAuthenticated, not currentDate
  
  // Update current date for background sync when date changes
  useEffect(() => {
    if (isAuthenticated) {
      updateCurrentDate(currentDate)
      // Use a small delay to batch rapid date changes
      const timeoutId = setTimeout(() => {
        fetchEvents(currentDate, false) // Don't show loading
      }, 100)
      
      return () => clearTimeout(timeoutId)
    }
  }, [currentDate, isAuthenticated, fetchEvents, updateCurrentDate])

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar_connected') === 'true') {
      showToast('Google Calendar connected successfully!', 'success', 3000)
      window.history.replaceState({}, '', window.location.pathname)
      window.location.reload()
    } else if (params.get('calendar_error')) {
      const error = params.get('calendar_error')
      showToast(`Failed to connect Google Calendar: ${error}`, 'error', 5000)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [showToast])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          handlePreviousMonth()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleNextMonth()
          break
        case 't':
        case 'T':
          e.preventDefault()
          handleToday()
          break
        case 'm':
        case 'M':
          e.preventDefault()
          setViewMode('month')
          break
        case 'w':
        case 'W':
          e.preventDefault()
          setViewMode('week')
          break
        case 'Escape':
          setShowShortcuts(false)
          setSelectedDate(null)
          setSelectedEvent(null)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])


  // Week starts on Monday (weekStartsOn: 1)
  const weekOptions = { weekStartsOn: 1 as const }
  
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, weekOptions)
  const calendarEnd = endOfWeek(monthEnd, weekOptions)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePreviousMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(subMonths(currentDate, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, -7))
    }
  }

  const handleNextMonth = () => {
    if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1))
    } else if (viewMode === 'week') {
      setCurrentDate(addDays(currentDate, 7))
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = useCallback((date: Date) => {
    return isTodayDate(date)
  }, [])

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return isSameDay(eventDate, date)
    })
  }

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event)
  }

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Connect Google Calendar</h2>
            <p className="text-text-tertiary mb-6">
              Connect your Google Calendar to view and manage events alongside your tasks.
            </p>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={connectGoogleCalendar}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          >
            Connect Google Calendar
          </motion.button>
        </div>
      </div>
    )
  }

  const isTodayButtonDisabled = isToday(currentDate)

  return (
    <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
      {/* Calendar Sidebar */}
      <CalendarSidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />

      <motion.div
        ref={calendarRef}
        className="flex-1 space-y-4 sm:space-y-6 min-w-0"
        animate={{
          marginLeft: sidebarOpen ? 0 : 0, // Sidebar width is handled by flexbox
        }}
        transition={{
          duration: 0.35,
          ease: [0.4, 0.0, 0.2, 1],
        }}
      >
      {/* Calendar Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
      >
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-text-primary mb-1 sm:mb-2 truncate">
            {viewMode === 'month' && format(currentDate, 'MMMM yyyy')}
            {viewMode === 'week' && `Week of ${format(startOfWeek(currentDate, weekOptions), 'MMM d')}`}
          </h2>
          <p className="text-xs sm:text-sm text-text-tertiary">
            {viewMode === 'month' && `${events.length} event${events.length !== 1 ? 's' : ''} this month`}
            {viewMode === 'week' && `${getEventsForWeek(events, startOfWeek(currentDate, weekOptions)).length} event${getEventsForWeek(events, startOfWeek(currentDate, weekOptions)).length !== 1 ? 's' : ''} this week`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-background-secondary border border-background-tertiary rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-secondary
                ${
                  viewMode === 'month'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
                }
              `}
              aria-label="Month view"
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`
                px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-secondary
                ${
                  viewMode === 'week'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-text-secondary hover:text-text-primary hover:bg-background-tertiary'
                }
              `}
              aria-label="Week view"
            >
              Week
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Tooltip content="Previous (←)">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-background-tertiary rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-secondary"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-5 h-5 text-text-tertiary" />
              </button>
            </Tooltip>
            <button
              onClick={handleToday}
              disabled={isTodayButtonDisabled}
              className={`
                px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-secondary
                ${
                  isTodayButtonDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-dark shadow-md hover:shadow-lg hover:scale-105 active:scale-95'
                }
              `}
              aria-label="Go to today"
            >
              Today
            </button>
            <Tooltip content="Next (→)">
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-background-tertiary rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-secondary"
                aria-label="Next month"
              >
                <ChevronRight className="w-5 h-5 text-text-tertiary" />
              </button>
            </Tooltip>
          </div>

          {/* Keyboard Shortcuts Button */}
          <Tooltip content="Keyboard shortcuts">
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background-secondary"
              aria-label="Show keyboard shortcuts"
            >
              <HelpCircle className="w-5 h-5 text-text-tertiary" />
            </button>
          </Tooltip>
        </div>
      </motion.div>

      {/* Keyboard Shortcuts Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
          >
            <motion.div
              initial={{ y: 20 }}
              animate={{ y: 0 }}
              exit={{ y: 20 }}
              className="bg-background-secondary border border-background-tertiary rounded-lg p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-text-primary mb-4">Keyboard Shortcuts</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Navigate</span>
                  <kbd className="px-2 py-1 bg-background-tertiary rounded text-text-primary">← →</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Go to today</span>
                  <kbd className="px-2 py-1 bg-background-tertiary rounded text-text-primary">T</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Month view</span>
                  <kbd className="px-2 py-1 bg-background-tertiary rounded text-text-primary">M</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Week view</span>
                  <kbd className="px-2 py-1 bg-background-tertiary rounded text-text-primary">W</kbd>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Close</span>
                  <kbd className="px-2 py-1 bg-background-tertiary rounded text-text-primary">Esc</kbd>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      {/* Calendar Grid */}
      <AnimatePresence mode="wait">
        {viewMode === 'month' && (
          <motion.div
            key="month"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            className="bg-background-secondary border border-background-tertiary rounded-lg p-4 sm:p-6"
          >
            {/* Day Headers - Monday to Sunday */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <div
                  key={day}
                  className={`text-center text-xs sm:text-sm font-semibold py-1.5 sm:py-2 ${
                    index === 5 || index === 6 ? 'text-text-tertiary' : 'text-text-secondary'
                  }`}
                >
                  <span className="hidden sm:inline">{day}</span>
                  <span className="sm:hidden">{day.substring(0, 1)}</span>
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            {loading ? (
              <div className="flex items-center justify-center py-8 sm:py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {calendarDays.map((day, index) => {
                  const dayEvents = getEventsForDate(day)
                  const isCurrentMonth = isSameMonth(day, currentDate)
                  const isTodayDay = isToday(day)
                  const isPastDay = isPast(startOfDay(day)) && !isTodayDay
                  const isWeekendDay = isWeekend(day)

                  return (
                    <motion.div
                      key={day.toISOString()}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.01 }}
                      onClick={() => handleDayClick(day)}
                      className={`
                        min-h-[60px] sm:min-h-[100px] md:min-h-[120px] p-1.5 sm:p-2 md:p-3 rounded-lg border transition-all duration-200 cursor-pointer touch-manipulation
                        ${isCurrentMonth
                          ? isWeekendDay
                            ? calendarTheme.colors.weekend.bg
                            : 'bg-background-tertiary'
                          : 'bg-background-secondary/50 opacity-50'
                        }
                        ${isTodayDay
                          ? `${calendarTheme.colors.today.ring} ${calendarTheme.colors.today.bg} border-primary`
                          : 'border-background-tertiary hover:border-primary/50'
                        }
                        ${isPastDay ? calendarTheme.colors.past.opacity : ''}
                        hover:bg-background-tertiary/80 active:bg-background-tertiary/90 hover:shadow-sm
                        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                      `}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          handleDayClick(day)
                        }
                      }}
                      aria-label={`${format(day, 'EEEE, MMMM d')}${dayEvents.length > 0 ? `, ${dayEvents.length} events` : ''}`}
                    >
                      <div
                        className={`
                          text-sm font-semibold mb-2 flex items-center justify-between
                          ${isTodayDay
                            ? calendarTheme.colors.today.text
                            : isCurrentMonth
                            ? 'text-text-primary'
                            : 'text-text-tertiary'
                          }
                        `}
                      >
                        <span>{format(day, 'd')}</span>
                        {isTodayDay && (
                          <motion.span
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-2 h-2 rounded-full bg-primary"
                          />
                        )}
                      </div>
                      <div className="space-y-1">
                        <AnimatePresence>
                          {dayEvents.slice(0, 3).map((event, eventIndex) => (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: eventIndex * 0.05 }}
                            >
                              <EventBlock
                                event={event}
                                variant="month"
                                onClick={() => handleEventClick(event)}
                              />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                        {dayEvents.length > 3 && (
                          <Tooltip content={`${dayEvents.length - 3} more events`}>
                            <motion.button
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDayClick(day)
                              }}
                              className="text-xs text-text-tertiary hover:text-primary px-1.5 py-0.5 rounded hover:bg-background-secondary transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              +{dayEvents.length - 3} more
                            </motion.button>
                          </Tooltip>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}

        {viewMode === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            loading={loading}
            onEventClick={handleEventClick}
            onDayClick={handleDayClick}
            weekOptions={weekOptions}
          />
        )}
      </AnimatePresence>

      {/* Day Modal */}
      {selectedDate && (
        <DayModal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          date={selectedDate}
          events={events}
          onEventClick={handleEventClick}
        />
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={selectedEvent}
        />
      )}
      </motion.div>
    </div>
  )
}
