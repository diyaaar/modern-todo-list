import { format, isToday, getHours, getMinutes } from 'date-fns'
import { motion } from 'framer-motion'
import { CalendarEvent } from '../../contexts/CalendarContext'
import { generateTimeSlots, getEventsForDay, calculateEventPosition, getCurrentTimePosition } from '../../utils/calendarUtils'
import { EventBlock } from './EventBlock'
import { Loader2, Plus } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface DayViewProps {
  currentDate: Date
  events: CalendarEvent[]
  loading: boolean
  onEventClick: (event: CalendarEvent) => void
  onCreateEvent: (date: Date) => void
}

export function DayView({ currentDate, events, loading, onEventClick, onCreateEvent }: DayViewProps) {
  const timeSlots = generateTimeSlots(8, 22)
  const dayEvents = getEventsForDay(events, currentDate)
  const isTodayDay = isToday(currentDate)
  const currentTimePosition = getCurrentTimePosition(8)
  const timelineRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to current time if viewing today
  useEffect(() => {
    if (isTodayDay && currentTimePosition !== null && timelineRef.current) {
      const scrollPosition = (currentTimePosition / 100) * timelineRef.current.scrollHeight
      timelineRef.current.scrollTo({
        top: scrollPosition - 200, // Offset to show current time in view
        behavior: 'smooth',
      })
    }
  }, [isTodayDay, currentTimePosition])

  if (loading) {
    return (
      <div className="bg-background-secondary border border-background-tertiary rounded-lg p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  // Separate all-day events from timed events
  const allDayEvents = dayEvents.filter(e => {
    const start = new Date(e.start)
    return getHours(start) === 0 && getMinutes(start) === 0
  })
  const timedEvents = dayEvents.filter(e => {
    const start = new Date(e.start)
    return !(getHours(start) === 0 && getMinutes(start) === 0)
  })

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-background-secondary border border-background-tertiary rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-background-tertiary">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-text-primary">
              {format(currentDate, 'EEEE, MMMM d, yyyy')}
            </h3>
            <p className="text-sm text-text-tertiary mt-1">
              {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <button
            onClick={() => onCreateEvent(currentDate)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <Plus className="w-5 h-5" />
            Add Event
          </button>
        </div>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="p-4 border-b border-background-tertiary bg-background-tertiary/50">
          <div className="text-xs font-semibold text-text-tertiary mb-2 uppercase tracking-wide">
            All Day
          </div>
          <div className="space-y-2">
            {allDayEvents.map((event) => (
              <EventBlock
                key={event.id}
                event={event}
                variant="day"
                onClick={() => onEventClick(event)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      <div
        ref={timelineRef}
        className="relative overflow-y-auto max-h-[600px]"
      >
        {/* Current time indicator */}
        {isTodayDay && currentTimePosition !== null && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: `${currentTimePosition}%` }}
          >
            <div className="flex items-center">
              <div className="w-16 flex-shrink-0 flex items-center justify-end pr-3">
                <div className="w-2 h-2 rounded-full bg-danger"></div>
              </div>
              <div className="flex-1 h-0.5 bg-danger"></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2">
          {/* Time column */}
          <div className="border-r border-background-tertiary">
            {timeSlots.map((slot) => {
              const isHour = slot.endsWith(':00')
              return (
                <div
                  key={slot}
                  className={`
                    border-b border-background-tertiary/50 h-16 flex items-start justify-end pr-3 pt-1
                    ${isHour ? 'border-b-background-tertiary' : ''}
                  `}
                >
                  {isHour && (
                    <span className="text-sm text-text-tertiary font-medium">{slot}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Events column */}
          <div className="relative">
            {/* Time slot grid */}
            {timeSlots.map((slot) => {
              const isHour = slot.endsWith(':00')
              return (
                <div
                  key={slot}
                  className={`
                    border-b border-background-tertiary/50 h-16
                    ${isHour ? 'border-b-background-tertiary' : ''}
                    hover:bg-background-tertiary/30 transition-colors cursor-pointer
                  `}
                  onClick={() => {
                    // Extract time from slot and create event
                    const [hours, minutes] = slot.split(':').map(Number)
                    const eventDate = new Date(currentDate)
                    eventDate.setHours(hours, minutes, 0, 0)
                    onCreateEvent(eventDate)
                  }}
                />
              )
            })}

            {/* Events */}
            <div className="absolute inset-0 pointer-events-none">
              {timedEvents.map((event) => {
                const pos = calculateEventPosition(event, 8)
                
                return (
                  <div
                    key={event.id}
                    className="absolute left-2 right-2 pointer-events-auto"
                    style={{
                      top: `${pos.top}%`,
                      height: `${pos.height}%`,
                    }}
                    onClick={() => onEventClick(event)}
                  >
                    <EventBlock
                      event={event}
                      variant="day"
                      onClick={() => onEventClick(event)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

