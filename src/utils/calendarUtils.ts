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
 * This function explicitly uses the browser's local timezone. The browser should be set to
 * Europe/Istanbul (UTC+3) for accurate time display. If the browser timezone is incorrect,
 * the user should set their system timezone to Istanbul.
 */
export function getCurrentTimePosition(startHour = 8): number | null {
  // Create a new Date object - this uses the browser's local timezone
  const now = new Date()
  
  // Get timezone offset in minutes (negative for timezones ahead of UTC)
  // Istanbul is UTC+3, so getTimezoneOffset() should return -180 (3 hours * 60 minutes)
  const timezoneOffset = now.getTimezoneOffset() // Returns offset in minutes (UTC - local)
  const timezoneOffsetHours = -timezoneOffset / 60 // Convert to hours (Istanbul should be +3)
  
  // Explicitly get local time components using the browser's timezone
  // These methods return values in the browser's local timezone
  // For Istanbul (UTC+3), this should correctly reflect local time
  let localHours = now.getHours() // 0-23 in local time
  let localMinutes = now.getMinutes() // 0-59 in local time
  let localSeconds = now.getSeconds() // 0-59 in local time
  
  // If timezone offset suggests we're not in Istanbul timezone, log a warning
  // Istanbul is UTC+3, so offset should be -180 minutes (or close to it, accounting for DST)
  if (process.env.NODE_ENV === 'development') {
    const expectedOffsetIstanbul = -180 // UTC+3 = -180 minutes
    const offsetDiff = Math.abs(timezoneOffset - expectedOffsetIstanbul)
    if (offsetDiff > 60) { // Allow 1 hour difference for DST
      console.warn(
        `[Time Indicator] Timezone offset is ${timezoneOffsetHours} hours (expected UTC+3 for Istanbul). ` +
        `Current local time: ${localHours}:${localMinutes.toString().padStart(2, '0')}. ` +
        `Please ensure your browser/system timezone is set to Europe/Istanbul.`
      )
    } else {
      console.log(
        `[Time Indicator] Local time: ${localHours}:${localMinutes.toString().padStart(2, '0')}:${localSeconds.toString().padStart(2, '0')} ` +
        `(Timezone: UTC${timezoneOffsetHours >= 0 ? '+' : ''}${timezoneOffsetHours})`
      )
    }
  }
  
  // Calculate total minutes from midnight (local time)
  // Include seconds for more precise positioning
  const totalMinutesFromMidnight = localHours * 60 + localMinutes + (localSeconds / 60)
  
  // Calculate minutes from start of visible day (startHour:00 in local time)
  const startMinutes = startHour * 60
  const currentMinutes = totalMinutesFromMidnight - startMinutes
  const dayMinutes = (22 - startHour) * 60 // 8 AM to 10 PM = 14 hours = 840 minutes
  
  // Only show indicator if within the visible time range
  if (currentMinutes < 0 || currentMinutes > dayMinutes) return null
  
  // Return position as percentage (0-100%)
  // This gives us the exact position where the current time should appear
  const position = (currentMinutes / dayMinutes) * 100
  
  // Ensure position is within bounds (0-100%)
  return Math.max(0, Math.min(100, position))
}

