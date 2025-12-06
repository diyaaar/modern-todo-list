import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: string
  end: string
  color?: string
  colorId?: string
  location?: string
}

interface CalendarContextType {
  events: CalendarEvent[]
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  fetchEvents: (date: Date) => Promise<void>
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
        .single()

      setIsAuthenticated(!error && !!data)
    } catch (err) {
      console.error('Error checking auth status:', err)
      setIsAuthenticated(false)
    }
  }, [user])

  // Initialize auth check
  useEffect(() => {
    checkAuthStatus()
  }, [checkAuthStatus])

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

      const response = await fetch(
        `/api/calendar/events?timeMin=${startOfMonth.toISOString()}&timeMax=${endOfMonth.toISOString()}&user_id=${user.id}`,
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
  }, [isAuthenticated, user, showToast])

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

  const value = {
    events,
    loading,
    error,
    isAuthenticated,
    fetchEvents,
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

