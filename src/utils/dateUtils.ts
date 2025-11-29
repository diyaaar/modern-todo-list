import { format, addDays, addWeeks, nextDay, parseISO, isToday, isThisWeek, isPast } from 'date-fns'
import tr from 'date-fns/locale/tr'
import { enUS } from 'date-fns/locale'

/**
 * Get current date, time, and day of week
 */
export function getCurrentDateTime() {
  const now = new Date()
  return {
    date: format(now, 'yyyy-MM-dd'),
    time: format(now, 'HH:mm'),
    dayOfWeek: format(now, 'EEEE', { locale: enUS }), // English day name
    dayOfWeekTurkish: format(now, 'EEEE', { locale: tr }), // Turkish day name
    dayOfWeekShort: format(now, 'EEE', { locale: enUS }), // Short form (Mon, Tue, etc.)
    dayOfWeekNumber: now.getDay(), // 0 = Sunday, 1 = Monday, etc.
    fullDateTime: now.toISOString(),
  }
}

/**
 * Parse relative date expressions (Turkish and English)
 */
export function parseRelativeDate(expression: string, referenceDate: Date = new Date()): Date | null {
  const lowerExpr = expression.toLowerCase().trim()
  const today = new Date(referenceDate)
  today.setHours(0, 0, 0, 0)

  // Turkish expressions
  if (lowerExpr === 'yarın' || lowerExpr === 'tomorrow') {
    return addDays(today, 1)
  }

  if (lowerExpr === 'bugün' || lowerExpr === 'today') {
    return today
  }

  if (lowerExpr === 'dün' || lowerExpr === 'yesterday') {
    return addDays(today, -1)
  }

  // "next week today" / "haftaya bugün"
  if (lowerExpr === 'haftaya bugün' || lowerExpr === 'next week today') {
    return addWeeks(today, 1)
  }

  // "next [day]" / "haftaya [day]"
  const nextDayMatch = lowerExpr.match(/^(next|haftaya)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)$/i)
  if (nextDayMatch) {
    const dayName = nextDayMatch[2].toLowerCase()
    
    // Map Turkish day names to English
    const dayMap: Record<string, number> = {
      'pazartesi': 1, 'monday': 1,
      'salı': 2, 'tuesday': 2,
      'çarşamba': 3, 'wednesday': 3,
      'perşembe': 4, 'thursday': 4,
      'cuma': 5, 'friday': 5,
      'cumartesi': 6, 'saturday': 6,
      'pazar': 0, 'sunday': 0,
    }

    const targetDay = dayMap[dayName]
    if (targetDay !== undefined) {
      // Get next occurrence of that day
      const nextOccurrence = nextDay(today, targetDay as 0 | 1 | 2 | 3 | 4 | 5 | 6)
      return nextOccurrence
    }
  }

  // "in X days" / "X gün sonra"
  const daysMatch = lowerExpr.match(/(\d+)\s*(days?|gün|gun)/i)
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10)
    return addDays(today, days)
  }

  // "next week" / "gelecek hafta"
  if (lowerExpr === 'gelecek hafta' || lowerExpr === 'next week') {
    return addWeeks(today, 1)
  }

  return null
}

/**
 * Parse time string (HH:MM format)
 */
export function parseTime(timeStr: string): string | null {
  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})/)
  if (timeMatch) {
    const hours = parseInt(timeMatch[1], 10)
    const minutes = parseInt(timeMatch[2], 10)
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    }
  }
  return null
}

/**
 * Get date color class based on deadline
 */
export function getDeadlineColor(deadline: string | null): string {
  if (!deadline) return 'text-text-tertiary'

  try {
    const deadlineDate = parseISO(deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const deadlineDay = new Date(deadlineDate)
    deadlineDay.setHours(0, 0, 0, 0)

    // Overdue
    if (isPast(deadlineDay) && !isToday(deadlineDay)) {
      return 'text-danger'
    }

    // Today
    if (isToday(deadlineDay)) {
      return 'text-warning'
    }

    // This week
    if (isThisWeek(deadlineDay)) {
      return 'text-warning/80'
    }

    // Future
    return 'text-text-tertiary'
  } catch {
    return 'text-text-tertiary'
  }
}

/**
 * Format deadline for display
 */
export function formatDeadline(deadline: string | null, time: string | null = null): string {
  if (!deadline) return 'No deadline'

  try {
    const deadlineDate = parseISO(deadline)
    const formattedDate = format(deadlineDate, 'MMM d, yyyy', { locale: enUS })
    
    if (time) {
      return `${formattedDate} at ${time}`
    }
    
    return formattedDate
  } catch {
    return deadline
  }
}

/**
 * Combine date and time into ISO string
 */
export function combineDateTime(date: Date, time: string | null): string {
  const combined = new Date(date)
  if (time) {
    const [hours, minutes] = time.split(':').map(Number)
    combined.setHours(hours, minutes, 0, 0)
  } else {
    combined.setHours(23, 59, 59, 999) // End of day if no time specified
  }
  return combined.toISOString()
}

