import { getHours, getMinutes } from 'date-fns'
import { CalendarEvent } from '../contexts/CalendarContext'

/**
 * Generate time slots for a day (default: 8 AM to 10 PM)
 */
export function generateTimeSlots(startHour = 8, endHour = 22) {
  const slots: string[] = []
  for (let hour = startHour; hour <= endHour; hour++) {
    slots.push(`${hour.toString().padStart(2, '0')}:00`)
    if (hour < endHour) {
      slots.push(`${hour.toString().padStart(2, '0')}:30`)
    }
  }
  return slots
}

/**
 * Get events for a specific day
 */
export function getEventsForDay(events: CalendarEvent[], date: Date) {
  return events.filter(event => {
    const eventDate = new Date(event.start)
    return (
      eventDate.getFullYear() === date.getFullYear() &&
      eventDate.getMonth() === date.getMonth() &&
      eventDate.getDate() === date.getDate()
    )
  })
}

/**
 * Get events for a week (Monday to Sunday)
 */
export function getEventsForWeek(events: CalendarEvent[], weekStart: Date) {
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  
  return events.filter(event => {
    const eventDate = new Date(event.start)
    return eventDate >= weekStart && eventDate <= weekEnd
  })
}

/**
 * Calculate event position and height for timeline view
 */
export function calculateEventPosition(event: CalendarEvent, startHour = 8) {
  const start = new Date(event.start)
  const end = new Date(event.end)
  
  const startMinutes = getHours(start) * 60 + getMinutes(start) - startHour * 60
  const endMinutes = getHours(end) * 60 + getMinutes(end) - startHour * 60
  const duration = endMinutes - startMinutes
  
  // Position as percentage of day (0-100%)
  const dayMinutes = (22 - startHour) * 60 // 8 AM to 10 PM = 14 hours = 840 minutes
  const top = (startMinutes / dayMinutes) * 100
  const height = (duration / dayMinutes) * 100
  
  return {
    top: Math.max(0, top),
    height: Math.max(2, height), // Minimum 2% height
    startMinutes,
    endMinutes,
    duration,
  }
}

/**
 * Check if two events overlap
 */
export function eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
  const start1 = new Date(event1.start).getTime()
  const end1 = new Date(event1.end).getTime()
  const start2 = new Date(event2.start).getTime()
  const end2 = new Date(event2.end).getTime()
  
  return start1 < end2 && start2 < end1
}

/**
 * Group overlapping events for side-by-side display
 */
export function groupOverlappingEvents(events: CalendarEvent[]): CalendarEvent[][] {
  const groups: CalendarEvent[][] = []
  const processed = new Set<string>()
  
  events.forEach(event => {
    if (processed.has(event.id)) return
    
    const group = [event]
    processed.add(event.id)
    
    events.forEach(otherEvent => {
      if (processed.has(otherEvent.id)) return
      if (eventsOverlap(event, otherEvent)) {
        group.push(otherEvent)
        processed.add(otherEvent.id)
      }
    })
    
    groups.push(group)
  })
  
  return groups
}

/**
 * Get current time position in timeline
 * Uses local time to ensure accurate positioning based on user's timezone (Europe/Istanbul, UTC+3)
 * 
 * This function calculates the vertical position (as percentage) where the current time
 * indicator should appear in the Week view timeline.
 */
export function getCurrentTimePosition(startHour = 8): number | null {
  // Create a new Date object - this uses the browser's local timezone
  const now = new Date()
  
  // Get timezone offset in minutes (negative for timezones ahead of UTC)
  // Istanbul is UTC+3, so getTimezoneOffset() should return -180 (3 hours * 60 minutes)
  const timezoneOffset = now.getTimezoneOffset() // Returns offset in minutes (UTC - local)
  const timezoneOffsetHours = -timezoneOffset / 60 // Convert to hours (Istanbul should be +3)
  
  // Get UTC time components for reference
  const utcHours = now.getUTCHours()
  const utcMinutes = now.getUTCMinutes()
  const utcSeconds = now.getUTCSeconds()
  
  // Get local time components - these are what we want to use
  // These methods return values in the browser's local timezone
  const localHours = now.getHours() // 0-23 in local time
  const localMinutes = now.getMinutes() // 0-59 in local time
  const localSeconds = now.getSeconds() // 0-59 in local time
  
  // Calculate total minutes from midnight (local time)
  // Include seconds for more precise positioning
  const totalMinutesFromMidnight = localHours * 60 + localMinutes + (localSeconds / 60)
  
  // Calculate minutes from start of visible day (startHour:00 in local time)
  const startMinutes = startHour * 60
  const currentMinutes = totalMinutesFromMidnight - startMinutes
  const dayMinutes = (22 - startHour) * 60 // 8 AM to 10 PM = 14 hours = 840 minutes
  
  // Calculate position as percentage (0-100%)
  const position = (currentMinutes / dayMinutes) * 100
  
  // Comprehensive debugging
  console.log('[Time Indicator Debug]', {
    'UTC Time': `${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:${utcSeconds.toString().padStart(2, '0')}`,
    'Local Time': `${localHours.toString().padStart(2, '0')}:${localMinutes.toString().padStart(2, '0')}:${localSeconds.toString().padStart(2, '0')}`,
    'Timezone Offset': `${timezoneOffsetHours >= 0 ? '+' : ''}${timezoneOffsetHours} hours (${timezoneOffset} minutes)`,
    'Total Minutes from Midnight': totalMinutesFromMidnight.toFixed(2),
    'Start Hour': startHour,
    'Current Minutes from Start': currentMinutes.toFixed(2),
    'Day Minutes (8 AM - 10 PM)': dayMinutes,
    'Position Percentage': `${position.toFixed(2)}%`,
    'ISO String': now.toISOString(),
    'Locale String': now.toLocaleString('en-US', { timeZone: 'Europe/Istanbul' }),
    'Istanbul Time (via Intl)': new Date().toLocaleString('en-US', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  })
  
  // Only show indicator if within the visible time range
  if (currentMinutes < 0 || currentMinutes > dayMinutes) {
    console.log('[Time Indicator] Outside visible range:', {
      currentMinutes,
      min: 0,
      max: dayMinutes,
      reason: currentMinutes < 0 ? 'Before start hour' : 'After end hour'
    })
    return null
  }
  
  // Ensure position is within bounds (0-100%)
  const finalPosition = Math.max(0, Math.min(100, position))
  
  console.log('[Time Indicator] Final position:', finalPosition + '%')
  
  return finalPosition
}

