import { CalendarEvent } from '../contexts/CalendarContext'

export interface PositionedEvent {
  event: CalendarEvent
  top: number
  height: number
  left: number
  width: number
  zIndex: number
}

export interface OverlapGroup {
  events: CalendarEvent[]
  startTime: number
  endTime: number
}

/**
 * Detects overlapping events and groups them
 */
export function detectOverlaps(events: CalendarEvent[]): OverlapGroup[] {
  if (events.length === 0) return []

  // Sort events by start time
  const sorted = [...events].sort((a, b) => {
    const startA = new Date(a.start).getTime()
    const startB = new Date(b.start).getTime()
    return startA - startB
  })

  const groups: OverlapGroup[] = []
  let currentGroup: CalendarEvent[] = []
  let groupEndTime = 0

  for (const event of sorted) {
    const eventStart = new Date(event.start).getTime()
    const eventEnd = new Date(event.end).getTime()

    if (currentGroup.length === 0) {
      // Start new group
      currentGroup = [event]
      groupEndTime = eventEnd
    } else if (eventStart < groupEndTime) {
      // Event overlaps with current group
      currentGroup.push(event)
      groupEndTime = Math.max(groupEndTime, eventEnd)
    } else {
      // No overlap, save current group and start new one
      if (currentGroup.length > 1) {
        groups.push({
          events: currentGroup,
          startTime: new Date(currentGroup[0].start).getTime(),
          endTime: groupEndTime,
        })
      }
      currentGroup = [event]
      groupEndTime = eventEnd
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 1) {
    groups.push({
      events: currentGroup,
      startTime: new Date(currentGroup[0].start).getTime(),
      endTime: groupEndTime,
    })
  }

  return groups
}

/**
 * Calculates positions for events, handling overlaps intelligently
 */
export function calculateEventPositions(
  events: CalendarEvent[],
  dayStartHour: number = 8
): PositionedEvent[] {
  if (events.length === 0) return []

  const dayStart = new Date(events[0].start)
  dayStart.setHours(dayStartHour, 0, 0, 0)
  const dayStartTime = dayStart.getTime()
  const dayEndTime = dayStartTime + 16 * 60 * 60 * 1000 // 16 hours (8 AM to 12 AM)

  // Calculate positions for each event
  const positioned: PositionedEvent[] = []
  const overlapGroups = detectOverlaps(events)

  // Create a map of event IDs to their overlap groups
  const eventToGroup = new Map<string, OverlapGroup>()
  overlapGroups.forEach(group => {
    group.events.forEach(event => {
      eventToGroup.set(event.id, group)
    })
  })

  events.forEach((event) => {
    const startTime = new Date(event.start).getTime()
    const endTime = new Date(event.end).getTime()

    // Calculate top and height as percentage
    const top = ((startTime - dayStartTime) / (dayEndTime - dayStartTime)) * 100
    const height = ((endTime - startTime) / (dayEndTime - dayStartTime)) * 100

    const group = eventToGroup.get(event.id)
    if (group && group.events.length > 1) {
      // Event is part of an overlap group
      const groupEvents = group.events
      const eventIndex = groupEvents.findIndex(e => e.id === event.id)

      if (groupEvents.length === 2) {
        // Two events: split 50-50
        const width = 48 // Leave 2% gap
        const left = eventIndex === 0 ? 1 : 51
        positioned.push({
          event,
          top,
          height,
          left,
          width,
          zIndex: 10 + eventIndex,
        })
      } else {
        // Three or more events: show first 2, hide rest
        if (eventIndex < 2) {
          const width = 48
          const left = eventIndex === 0 ? 1 : 51
          positioned.push({
            event,
            top,
            height,
            left,
            width,
            zIndex: 10 + eventIndex,
          })
        }
        // Events beyond index 1 are hidden (will be shown in "+X more" modal)
      }
    } else {
      // No overlap, full width
      positioned.push({
        event,
        top,
        height,
        left: 1,
        width: 98,
        zIndex: 5,
      })
    }
  })

  return positioned
}

