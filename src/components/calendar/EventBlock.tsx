import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { CalendarEvent } from '../../contexts/CalendarContext'
import { calendarTheme } from '../../config/calendarTheme'
import { Clock } from 'lucide-react'

interface EventBlockProps {
  event: CalendarEvent
  variant?: 'month' | 'week' | 'day'
  onClick?: () => void
}

export function EventBlock({ event, variant = 'month', onClick }: EventBlockProps) {
  const eventColor = event.color || '#3b82f6'
  const startTime = new Date(event.start)
  const endTime = new Date(event.end)
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // minutes
  const isLongEvent = duration > 60

  if (variant === 'month') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={onClick}
        className={`
          text-xs px-1.5 py-0.5 rounded-md truncate cursor-pointer
          ${calendarTheme.animations.eventHover}
          ${calendarTheme.shadows.event}
          group
        `}
        style={{
          backgroundColor: `${eventColor}20`,
          color: eventColor,
          borderLeft: `3px solid ${eventColor}`,
        }}
        title={`${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')} • ${event.summary}${event.description ? `\n${event.description}` : ''}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick?.()
          }
        }}
        aria-label={`Event: ${event.summary} at ${format(startTime, 'h:mm a')}`}
      >
        <div className="flex items-center gap-1">
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: eventColor }}
          />
          <span className="text-text-tertiary text-[10px] font-medium">
            {format(startTime, 'HH:mm')}
          </span>
          <span className="truncate flex-1">{event.summary}</span>
        </div>
      </motion.div>
    )
  }

  // Week/Day view - more detailed
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
        className={`
          p-1.5 sm:p-2 rounded-md cursor-pointer border-l-4 touch-manipulation min-h-[44px]
          ${calendarTheme.animations.eventHover}
          ${calendarTheme.shadows.event}
          group
        `}
      style={{
        backgroundColor: `${eventColor}15`,
        borderLeftColor: eventColor,
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      aria-label={`Event: ${event.summary} from ${format(startTime, 'h:mm a')} to ${format(endTime, 'h:mm a')}`}
    >
      <div className="space-y-1">
        <div className="font-semibold text-sm text-text-primary group-hover:text-primary transition-colors">
          {event.summary}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <span>
            {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
          </span>
          {isLongEvent && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.floor(duration / 60)}h {duration % 60}m
            </span>
          )}
        </div>
        {event.location && (
          <div className="text-xs text-text-tertiary truncate">
            📍 {event.location}
          </div>
        )}
        {event.description && (
          <div className="text-xs text-text-secondary line-clamp-2">
            {event.description}
          </div>
        )}
      </div>
    </motion.div>
  )
}

