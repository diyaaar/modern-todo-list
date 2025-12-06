import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { motion } from 'framer-motion'
import { CalendarEvent } from '../../contexts/CalendarContext'
import { generateTimeSlots, getEventsForWeek, calculateEventPosition, getCurrentTimePosition } from '../../utils/calendarUtils'
import { Loader2 } from 'lucide-react'

interface WeekViewProps {
  currentDate: Date
  events: CalendarEvent[]
  loading: boolean
  onEventClick: (event: CalendarEvent) => void
  onDayClick: (date: Date) => void
  weekOptions: { weekStartsOn: 1 }
}

export function WeekView({ currentDate, events, loading, onEventClick, onDayClick, weekOptions }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, weekOptions)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const timeSlots = generateTimeSlots(8, 22)
  const weekEvents = getEventsForWeek(events, weekStart)
  const currentTimePosition = getCurrentTimePosition(8)
  const isCurrentWeek = weekDays.some(day => isToday(day))

  if (loading) {
    return (
      <div className="bg-background-secondary border border-background-tertiary rounded-lg p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="bg-background-secondary border border-background-tertiary rounded-lg overflow-hidden"
    >
      {/* Header with day names */}
      <div className="grid grid-cols-8 border-b border-background-tertiary">
        <div className="p-3 border-r border-background-tertiary"></div>
        {weekDays.map((day) => {
          const dayEvents = weekEvents.filter(e => {
            const eventDate = new Date(e.start)
            return isSameDay(eventDate, day)
          })
          const isTodayDay = isToday(day)
          
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={`
                p-3 border-r border-background-tertiary last:border-r-0 cursor-pointer transition-colors
                ${isTodayDay ? 'bg-primary/10 border-b-2 border-b-primary' : 'hover:bg-background-tertiary'}
              `}
            >
              <div className="text-center">
                <div className={`text-xs font-medium ${isTodayDay ? 'text-primary' : 'text-text-tertiary'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg font-bold mt-1 ${isTodayDay ? 'text-primary' : 'text-text-primary'}`}>
                  {format(day, 'd')}
                </div>
                <div className="text-xs text-text-tertiary mt-1">
                  {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Time slots and events */}
      <div className="relative overflow-y-auto max-h-[600px]">
        {/* Current time indicator */}
        {isCurrentWeek && currentTimePosition !== null && (
          <div
            className="absolute left-0 right-0 z-10 pointer-events-none"
            style={{ top: `${currentTimePosition}%` }}
          >
            <div className="flex items-center">
              <div className="w-12 flex-shrink-0 flex items-center justify-end pr-2">
                <div className="w-2 h-2 rounded-full bg-danger"></div>
              </div>
              <div className="flex-1 h-0.5 bg-danger"></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-8">
          {/* Time column */}
          <div className="border-r border-background-tertiary">
            {timeSlots.map((slot) => {
              const isHour = slot.endsWith(':00')
              return (
                <div
                  key={slot}
                  className={`
                    border-b border-background-tertiary/50 h-12 flex items-start justify-end pr-2 pt-1
                    ${isHour ? 'border-b-background-tertiary' : ''}
                  `}
                >
                  {isHour && (
                    <span className="text-xs text-text-tertiary font-medium">{slot}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayEvents = weekEvents.filter(e => {
              const eventDate = new Date(e.start)
              return isSameDay(eventDate, day)
            })
            const isTodayDay = isToday(day)

            return (
              <div
                key={day.toISOString()}
                className={`
                  border-r border-background-tertiary last:border-r-0 relative
                  ${isTodayDay ? 'bg-primary/5' : ''}
                `}
              >
                {/* Time slot grid */}
                {timeSlots.map((slot) => {
                  const isHour = slot.endsWith(':00')
                  return (
                    <div
                      key={slot}
                      className={`
                        border-b border-background-tertiary/50 h-12
                        ${isHour ? 'border-b-background-tertiary' : ''}
                      `}
                    />
                  )
                })}

                {/* Events */}
                <div className="absolute inset-0 pointer-events-none">
                  {dayEvents.map((event) => {
                    const pos = calculateEventPosition(event, 8)
                    const eventColor = event.color || '#3b82f6'
                    
                    return (
                      <div
                        key={event.id}
                        className="absolute left-0 right-0 pointer-events-auto cursor-pointer"
                        style={{
                          top: `${pos.top}%`,
                          height: `${pos.height}%`,
                          padding: '0 2px',
                        }}
                        onClick={() => onEventClick(event)}
                      >
                        <div
                          className="h-full rounded px-2 py-0.5 text-xs overflow-hidden"
                          style={{
                            backgroundColor: `${eventColor}20`,
                            borderLeft: `3px solid ${eventColor}`,
                            color: eventColor,
                          }}
                        >
                          <div className="font-medium truncate">{event.summary}</div>
                          <div className="text-[10px] opacity-80">
                            {format(new Date(event.start), 'HH:mm')} - {format(new Date(event.end), 'HH:mm')}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

