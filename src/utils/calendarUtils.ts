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
 * Simple calculation: (current_time - start_time) / (end_time - start_time) * 100
 * Uses Istanbul timezone explicitly
 */
export function getCurrentTimePosition(startHour = 8, endHour = 22): number | null {
  const now = new Date()
  
  // Get Istanbul time explicitly
  const istanbulTimeString = now.toLocaleString('en-US', { 
    timeZone: 'Europe/Istanbul', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: false 
  })
  
  // Parse time (format: "HH:MM")
  const [hoursStr, minutesStr] = istanbulTimeString.split(':')
  const currentHours = parseInt(hoursStr, 10)
  const currentMinutes = parseInt(minutesStr, 10)
  
  // Convert to decimal hours (e.g., 15:30 = 15.5)
  const currentTimeDecimal = currentHours + (currentMinutes / 60)
  
  // Calculate position: (current - start) / (end - start) * 100
  // Example: 15:30 in range 8:00-22:00
  //   (15.5 - 8) / (22 - 8) * 100 = 7.5 / 14 * 100 = 53.57%
  const position = ((currentTimeDecimal - startHour) / (endHour - startHour)) * 100
  
  // Only show if within visible range
  if (position < 0 || position > 100) {
    return null
  }
  
  return Math.max(0, Math.min(100, position))
}

