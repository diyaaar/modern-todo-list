import { useState } from 'react'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarEvent } from '../../contexts/CalendarContext'
import { generateTimeSlots, getEventsForWeek } from '../../utils/calendarUtils'
import { calculateEventPositions } from '../../utils/eventOverlap'
import { OverlapEventsModal } from './OverlapEventsModal'
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
  const [overlapModal, setOverlapModal] = useState<{
    events: CalendarEvent[]
    timeSlot: string
  } | null>(null)

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
      <div className="grid grid-cols-8 border-b border-background-tertiary bg-background-tertiary/30">
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
                ${isTodayDay ? 'bg-primary/10 border-b-2 border-b-primary' : 'hover:bg-background-tertiary/50'}
              `}
            >
              <div className="text-center">
                <div className={`text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${isTodayDay ? 'text-primary' : 'text-text-tertiary'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg sm:text-xl font-bold mt-1 sm:mt-1.5 ${isTodayDay ? 'text-primary' : 'text-text-primary'}`}>
                  {format(day, 'd')}
                </div>
                {dayEvents.length > 0 && (
                  <div className="text-[10px] sm:text-xs text-text-tertiary mt-1 sm:mt-1.5 font-medium">
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Time slots and events */}
      <div className="relative overflow-y-auto overflow-x-auto max-h-[60vh] sm:max-h-[70vh] -mx-2 sm:mx-0">
        <div className="grid grid-cols-8 min-w-[600px] sm:min-w-0">
          {/* Time column */}
          <div className="border-r border-background-tertiary flex-shrink-0">
            {timeSlots.map((slot) => {
              const isHour = slot.endsWith(':00')
              return (
                <div
                  key={slot}
                  className={`
                    border-b border-background-tertiary/50 h-10 sm:h-12 flex items-start justify-end pr-1 sm:pr-2 pt-1
                    ${isHour ? 'border-b-background-tertiary' : ''}
                  `}
                >
                  {isHour && (
                    <span className="text-[10px] sm:text-xs text-text-tertiary font-medium">{slot}</span>
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
                        border-b border-background-tertiary/50 h-10 sm:h-12
                        ${isHour ? 'border-b-background-tertiary' : ''}
                      `}
                    />
                  )
                })}

                {/* Events */}
                <div className="absolute inset-0 pointer-events-none">
                  {(() => {
                    const positioned = calculateEventPositions(dayEvents, 8)
                    const overlapGroups = new Map<string, CalendarEvent[]>()
                    
                    // Group overlapping events
                    dayEvents.forEach(event => {
                      const start = new Date(event.start).getTime()
                      const key = `${Math.floor(start / (30 * 60 * 1000))}` // 30-min buckets
                      
                      if (!overlapGroups.has(key)) {
                        overlapGroups.set(key, [])
                      }
                      overlapGroups.get(key)!.push(event)
                    })

                    // Find events that are hidden (part of 3+ overlap group)
                    const hiddenEvents: CalendarEvent[] = []
                    overlapGroups.forEach((groupEvents) => {
                      if (groupEvents.length > 2) {
                        // Events beyond index 1 are hidden
                        hiddenEvents.push(...groupEvents.slice(2))
                      }
                    })

                    const visiblePositioned = positioned.filter(p => 
                      !hiddenEvents.some(h => h.id === p.event.id)
                    )

                    return (
                      <>
                        <AnimatePresence>
                          {visiblePositioned.map((pos) => {
                            const eventColor = pos.event.color || '#3b82f6'
                            
                            return (
                              <motion.div
                                key={pos.event.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute pointer-events-auto cursor-pointer"
                                style={{
                                  top: `${pos.top}%`,
                                  height: `${pos.height}%`,
                                  left: `${pos.left}%`,
                                  width: `${pos.width}%`,
                                  zIndex: pos.zIndex,
                                }}
                                onClick={() => onEventClick(pos.event)}
                              >
                                <div
                                  className="h-full rounded px-2 py-0.5 text-xs overflow-hidden hover:shadow-md transition-all duration-200"
                                  style={{
                                    backgroundColor: `${eventColor}20`,
                                    borderLeft: `3px solid ${eventColor}`,
                                    color: eventColor,
                                  }}
                                >
                                  <div className="font-medium truncate">{pos.event.summary}</div>
                                  <div className="text-[10px] opacity-80">
                                    {format(new Date(pos.event.start), 'HH:mm')} - {format(new Date(pos.event.end), 'HH:mm')}
                                  </div>
                                </div>
                              </motion.div>
                            )
                          })}
                        </AnimatePresence>

                        {/* "+X more" button for hidden events */}
                        {hiddenEvents.length > 0 && (() => {
                          const firstHidden = hiddenEvents[0]
                          const startTime = new Date(firstHidden.start)
                          const dayStart = new Date(day)
                          dayStart.setHours(8, 0, 0, 0)
                          const top = ((startTime.getTime() - dayStart.getTime()) / (16 * 60 * 60 * 1000)) * 100
                          const timeSlot = format(startTime, 'HH:mm')

                          return (
                            <motion.button
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              className="absolute left-1/2 -translate-x-1/2 pointer-events-auto cursor-pointer z-20 px-2 py-1 rounded text-xs font-medium bg-background-tertiary hover:bg-background-tertiary/80 text-text-primary border border-background-tertiary shadow-sm transition-all duration-200"
                              style={{
                                top: `${top}%`,
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                setOverlapModal({
                                  events: hiddenEvents,
                                  timeSlot: `${timeSlot} - ${format(new Date(hiddenEvents[hiddenEvents.length - 1].end), 'HH:mm')}`,
                                })
                              }}
                            >
                              +{hiddenEvents.length} more
                            </motion.button>
                          )
                        })()}
                      </>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Overlap Events Modal */}
      {overlapModal && (
        <OverlapEventsModal
          isOpen={!!overlapModal}
          onClose={() => setOverlapModal(null)}
          events={overlapModal.events}
          timeSlot={overlapModal.timeSlot}
        />
      )}
    </motion.div>
  )
}

