import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { motion } from 'framer-motion'
import { useCalendar } from '../contexts/CalendarContext'
import { useToast } from '../contexts/ToastContext'

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month')
  const { events, loading, error, fetchEvents, isAuthenticated, connectGoogleCalendar } = useCalendar()
  const { showToast } = useToast()
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents(currentDate)
    }
  }, [currentDate, isAuthenticated, fetchEvents])

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('calendar_connected') === 'true') {
      showToast('Google Calendar connected successfully!', 'success', 3000)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
      // Refresh auth status
      window.location.reload()
    } else if (params.get('calendar_error')) {
      const error = params.get('calendar_error')
      showToast(`Failed to connect Google Calendar: ${error}`, 'error', 5000)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [showToast])

  // Mobile swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const diffX = touchStartX.current - touchEndX
    const diffY = Math.abs(touchStartY.current - touchEndY)
    const threshold = 50

    // Only handle horizontal swipes (ignore vertical scrolling)
    if (Math.abs(diffX) > threshold && diffY < threshold) {
      if (diffX > 0) {
        // Swipe left - next month
        handleNextMonth()
      } else {
        // Swipe right - previous month
        handlePreviousMonth()
      }
    }

    touchStartX.current = null
    touchStartY.current = null
  }

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePreviousMonth = () => {
    setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1))
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const getEventsForDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start)
      return isSameDay(eventDate, date)
    })
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-text-primary mb-2">Connect Google Calendar</h2>
            <p className="text-text-tertiary mb-6">
              Connect your Google Calendar to view and manage events alongside your tasks.
            </p>
          </div>
          <button
            onClick={connectGoogleCalendar}
            className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Connect Google Calendar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="space-y-6"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <p className="text-sm text-text-tertiary">
            {events.length} event{events.length !== 1 ? 's' : ''} this month
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-background-secondary border border-background-tertiary rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'month'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'week'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                viewMode === 'day'
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Day
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousMonth}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5 text-text-tertiary" />
            </button>
            <button
              onClick={handleToday}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-background-tertiary rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-background-tertiary rounded-lg transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5 text-text-tertiary" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <div className="bg-background-secondary border border-background-tertiary rounded-lg p-4 sm:p-6">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-text-tertiary py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => {
                const dayEvents = getEventsForDate(day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isToday = isSameDay(day, new Date())

                return (
                  <motion.div
                    key={day.toISOString()}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.01 }}
                    className={`
                      min-h-[80px] sm:min-h-[100px] p-2 rounded-lg border transition-all
                      ${isCurrentMonth
                        ? 'bg-background-tertiary border-background-tertiary hover:border-primary/50'
                        : 'bg-background-secondary/50 border-background-tertiary/50 opacity-50'
                      }
                      ${isToday ? 'ring-2 ring-primary' : ''}
                    `}
                  >
                    <div
                      className={`
                        text-sm font-medium mb-1
                        ${isToday
                          ? 'text-primary'
                          : isCurrentMonth
                          ? 'text-text-primary'
                          : 'text-text-tertiary'
                        }
                      `}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className="text-xs px-1.5 py-0.5 rounded truncate"
                          style={{
                            backgroundColor: event.color ? `${event.color}20` : '#3b82f620',
                            color: event.color || '#3b82f6',
                            borderLeft: `2px solid ${event.color || '#3b82f6'}`,
                          }}
                          title={event.summary}
                        >
                          {format(new Date(event.start), 'HH:mm')} {event.summary}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-text-tertiary px-1.5">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Week View - Placeholder */}
      {viewMode === 'week' && (
        <div className="bg-background-secondary border border-background-tertiary rounded-lg p-6 text-center text-text-tertiary">
          Week view coming soon
        </div>
      )}

      {/* Day View - Placeholder */}
      {viewMode === 'day' && (
        <div className="bg-background-secondary border border-background-tertiary rounded-lg p-6 text-center text-text-tertiary">
          Day view coming soon
        </div>
      )}
    </div>
  )
}

