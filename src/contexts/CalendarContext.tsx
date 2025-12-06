import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { Calendar as CalendarType } from '../types/calendar'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: string
  end: string
  color?: string
  colorId?: string
  location?: string
  calendarId?: string // ID of the calendar this event belongs to
}

interface CalendarContextType {
  events: CalendarEvent[]
  calendars: CalendarType[]
  selectedCalendarIds: string[]
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  fetchEvents: (date: Date) => Promise<void>
  fetchCalendars: () => Promise<void>
  toggleCalendar: (calendarId: string) => void
  createEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<CalendarEvent | null>
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  connectGoogleCalendar: () => Promise<void>
  disconnectGoogleCalendar: () => Promise<void>
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined)

export function CalendarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [calendars, setCalendars] = useState<CalendarType[]>([])
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if user is authenticated with Google Calendar
  const checkAuthStatus = useCallback(async () => {
    if (!user) {
      setIsAuthenticated(false)
      return
    }

    try {
      // Check if user has tokens in Supabase
      const supabase = (await import('../lib/supabase')).getSupabaseClient()
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle() // Use maybeSingle() instead of single() to handle no rows gracefully

      // Handle different error cases
      if (error) {
        // PGRST116 means no rows found (which is fine - user just hasn't connected)
        if (error.code === 'PGRST116' || error.message?.includes('No rows')) {
          setIsAuthenticated(false)
          return
        }
        // PGRST301 means table doesn't exist or RLS is blocking
        // For 406 errors, the message usually contains "Not Acceptable"
        if (error.code === 'PGRST301' || error.message?.includes('Not Acceptable') || error.message?.includes('406')) {
          console.warn('Google Calendar tokens table may not exist yet:', error.message)
          setIsAuthenticated(false)
          return
        }
        console.error('Error checking Google Calendar auth status:', error)
        setIsAuthenticated(false)
        return
      }

      setIsAuthenticated(!!data)
    } catch (err) {
      // Handle network errors or other exceptions gracefully
      console.warn('Error checking Google Calendar auth status (table may not exist):', err)
      setIsAuthenticated(false)
    }
  }, [user])

  // Fetch calendars
  const fetchCalendars = useCallback(async () => {
    if (!user) {
      setCalendars([])
      return
    }

    try {
      // First try to sync calendars from Google Calendar
      const syncResponse = await fetch(`/api/calendar/calendars?user_id=${user.id}`, {
        method: 'POST',
      })

      if (syncResponse.ok) {
        const syncData = await syncResponse.json()
        if (syncData.calendars && syncData.calendars.length > 0) {
          setCalendars(syncData.calendars)
          // If no calendars selected yet, select all by default
          if (selectedCalendarIds.length === 0) {
            setSelectedCalendarIds(syncData.calendars.map((c: CalendarType) => c.id))
          }
          return
        }
      }

      // Fallback: fetch from database directly
      const supabase = (await import('../lib/supabase')).getSupabaseClient()
      const { data, error } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', user.id)
        .order('is_primary', { ascending: false })
        .order('name', { ascending: true })

      if (error) {
        // If table doesn't exist yet, that's okay - user just needs to create calendars
        if (error.code === 'PGRST301' || error.message?.includes('Not Acceptable') || error.message?.includes('406')) {
          console.warn('Calendars table may not exist yet:', error.message)
          setCalendars([])
          return
        }
        throw error
      }

      setCalendars(data || [])
      
      // If no calendars selected yet, select all by default
      if (selectedCalendarIds.length === 0 && data && data.length > 0) {
        setSelectedCalendarIds(data.map(c => c.id))
      }
    } catch (err) {
      console.error('Error fetching calendars:', err)
      setCalendars([])
    }
  }, [user, selectedCalendarIds.length])

  // Toggle calendar visibility
  const toggleCalendar = useCallback((calendarId: string) => {
    setSelectedCalendarIds(prev => {
      if (prev.includes(calendarId)) {
        return prev.filter(id => id !== calendarId)
      } else {
        return [...prev, calendarId]
      }
    })
  }, [])

  // Initialize auth check and fetch calendars
  useEffect(() => {
    checkAuthStatus()
    fetchCalendars()
  }, [checkAuthStatus, fetchCalendars])

  const connectGoogleCalendar = useCallback(async () => {
    try {
      if (!user) {
        showToast('Please log in to connect Google Calendar', 'error', 3000)
        return
      }
      // Redirect to OAuth endpoint with user_id
      window.location.href = `/api/calendar/auth/connect?user_id=${user.id}`
    } catch (err) {
      console.error('Error connecting Google Calendar:', err)
      showToast('Failed to connect Google Calendar', 'error', 3000)
    }
  }, [user, showToast])

  const disconnectGoogleCalendar = useCallback(async () => {
    try {
      const response = await fetch('/api/calendar/auth/disconnect', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      setIsAuthenticated(false)
      setEvents([])
      showToast('Google Calendar disconnected', 'success', 2000)
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
      showToast('Failed to disconnect Google Calendar', 'error', 3000)
    }
  }, [showToast])

  const fetchEvents = useCallback(async (date: Date) => {
    if (!isAuthenticated || !user) return

    setLoading(true)
    setError(null)

    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)

      // Get Supabase session token for authentication
      const supabase = (await import('../lib/supabase')).getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Build query with selected calendar IDs
      const calendarIdsParam = selectedCalendarIds.length > 0 
        ? `&calendarIds=${selectedCalendarIds.join(',')}`
        : ''

      const response = await fetch(
        `/api/calendar/events?timeMin=${startOfMonth.toISOString()}&timeMax=${endOfMonth.toISOString()}&user_id=${user.id}${calendarIdsParam}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }

      const data = await response.json()
      setEvents(data.events || [])
    } catch (err) {
      console.error('Error fetching events:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch events')
      showToast('Failed to fetch calendar events', 'error', 3000)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, user, selectedCalendarIds, showToast])

  const createEvent = useCallback(async (event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent | null> => {
    if (!isAuthenticated) return null

    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      const newEvent = await response.json()
      setEvents((prev) => [...prev, newEvent])
      showToast('Event created successfully', 'success', 2000)
      return newEvent
    } catch (err) {
      console.error('Error creating event:', err)
      showToast('Failed to create event', 'error', 3000)
      return null
    }
  }, [isAuthenticated, showToast])

  const updateEvent = useCallback(async (id: string, updates: Partial<CalendarEvent>): Promise<void> => {
    if (!isAuthenticated) return

    try {
      const response = await fetch(`/api/calendar/events/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      const updatedEvent = await response.json()
      setEvents((prev) => prev.map((e) => (e.id === id ? updatedEvent : e)))
      showToast('Event updated successfully', 'success', 2000)
    } catch (err) {
      console.error('Error updating event:', err)
      showToast('Failed to update event', 'error', 3000)
    }
  }, [isAuthenticated, showToast])

  const deleteEvent = useCallback(async (id: string): Promise<void> => {
    if (!isAuthenticated) return

    try {
      const response = await fetch(`/api/calendar/events/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }

      setEvents((prev) => prev.filter((e) => e.id !== id))
      showToast('Event deleted successfully', 'success', 2000)
    } catch (err) {
      console.error('Error deleting event:', err)
      showToast('Failed to delete event', 'error', 3000)
    }
  }, [isAuthenticated, showToast])

  // Filter events by selected calendars
  const filteredEvents = events.filter(event => {
    // If event has no calendarId, show it (for backward compatibility)
    if (!event.calendarId) return true
    // Only show events from selected calendars
    return selectedCalendarIds.includes(event.calendarId)
  })

  const value = {
    events: filteredEvents,
    calendars,
    selectedCalendarIds,
    loading,
    error,
    isAuthenticated,
    fetchEvents,
    fetchCalendars,
    toggleCalendar,
    createEvent,
    updateEvent,
    deleteEvent,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  }

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>
}

export function useCalendar() {
  const context = useContext(CalendarContext)
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider')
  }
  return context
}

