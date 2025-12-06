import type { VercelRequest, VercelResponse } from '@vercel/node'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Get user ID from Authorization header or session
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Extract user ID from token (simplified - in production, verify JWT)
  // TODO: Properly verify Supabase JWT token
  let userId: string | null = null
  try {
    // For now, we'll need to get user_id from the request
    // In production, verify the JWT token from Supabase
    userId = req.query.user_id as string || null
  } catch (err) {
    return res.status(401).json({ error: 'Invalid authentication' })
  }

  if (req.method === 'GET') {
    try {
      // Fetch events from Google Calendar
      const { timeMin, timeMax, calendarIds } = req.query

      if (!timeMin || !timeMax) {
        return res.status(400).json({ error: 'timeMin and timeMax are required' })
      }

      // Parse calendar IDs (comma-separated)
      const requestedCalendarIds = calendarIds 
        ? (calendarIds as string).split(',').filter(Boolean)
        : []

      // Get user's tokens from Supabase
      if (!userId) {
        return res.status(401).json({ error: 'User ID required' })
      }

      // Initialize Supabase client
      // In Vercel, use SUPABASE_URL (not VITE_SUPABASE_URL which is client-side only)
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables in events GET endpoint')
        return res.status(500).json({ error: 'Supabase configuration missing' })
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      const { data: tokens, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (tokenError || !tokens) {
        return res.status(401).json({ error: 'Google Calendar not connected' })
      }

      // Refresh token if needed
      const now = Date.now()
      let accessToken = tokens.access_token
      
      if (tokens.expiry_date - now < 5 * 60 * 1000) {
        // Token expires soon, refresh it
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: tokens.refresh_token,
            grant_type: 'refresh_token',
          }),
        })

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          accessToken = refreshData.access_token
          
          // Update stored token
          await supabase
            .from('google_calendar_tokens')
            .update({
              access_token: refreshData.access_token,
              expiry_date: Date.now() + (refreshData.expires_in * 1000),
            })
            .eq('user_id', userId)
        }
      }

      // Initialize Google Calendar API
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )
      oauth2Client.setCredentials({ access_token: accessToken })

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      // Get user's calendars from database
      const { data: userCalendars } = await supabase
        .from('calendars')
        .select('*')
        .eq('user_id', userId)

      // Determine which calendars to fetch from
      let calendarsToFetch: Array<{ id: string; googleId: string; color: string; name: string }> = []
      
      if (userCalendars && userCalendars.length > 0) {
        // Filter by requested calendar IDs, or use all if none specified
        const calendars = requestedCalendarIds.length > 0
          ? userCalendars.filter(c => requestedCalendarIds.includes(c.id))
          : userCalendars

        calendarsToFetch = calendars
          .filter(c => c.google_calendar_id) // Only calendars with Google Calendar IDs
          .map(c => ({
            id: c.id,
            googleId: c.google_calendar_id!,
            color: c.color,
            name: c.name,
          }))
      }

      // If no calendars found, fall back to primary calendar
      if (calendarsToFetch.length === 0) {
        calendarsToFetch = [{
          id: 'primary',
          googleId: 'primary',
          color: '#3b82f6',
          name: 'Primary',
        }]
      }

      // Fetch events from all calendars
      const allEvents: Array<{
        id: string
        summary: string
        description?: string
        start: string
        end: string
        colorId?: string
        location?: string
        calendarId: string
        color?: string
      }> = []

      for (const cal of calendarsToFetch) {
        try {
          const response = await calendar.events.list({
            calendarId: cal.googleId,
            timeMin: timeMin as string,
            timeMax: timeMax as string,
            maxResults: 2500,
            singleEvents: true,
            orderBy: 'startTime',
          })

          const calendarEvents = (response.data.items || [])
            .filter((item): item is NonNullable<typeof item> => item?.id != null)
            .map((item) => {
              const start = item.start?.dateTime || item.start?.date || ''
              const end = item.end?.dateTime || item.end?.date || ''
              
              return {
                id: item.id!,
                summary: item.summary || 'Untitled Event',
                description: item.description,
                start,
                end,
                colorId: item.colorId,
                location: item.location,
                calendarId: cal.id,
                color: cal.color,
              }
            })

          allEvents.push(...calendarEvents)
        } catch (err) {
          console.error(`Error fetching events from calendar ${cal.name}:`, err)
          // Continue with other calendars even if one fails
        }
      }

      // Sort all events by start time
      allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

      return res.status(200).json({ events: allEvents })
    } catch (err) {
      console.error('Error fetching events:', err)
      return res.status(500).json({ error: 'Failed to fetch events' })
    }
  }

  if (req.method === 'POST') {
    try {
      // Create new event in Google Calendar
      const { summary, description, start, end, color, colorId, location } = req.body

      if (!summary || !start || !end) {
        return res.status(400).json({ error: 'summary, start, and end are required' })
      }

      if (!userId) {
        return res.status(401).json({ error: 'User ID required' })
      }

      // Initialize Supabase client
      // In Vercel, use SUPABASE_URL (not VITE_SUPABASE_URL which is client-side only)
      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

      if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase environment variables in events POST endpoint')
        return res.status(500).json({ error: 'Supabase configuration missing' })
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })

      // Get user's tokens
      const { data: tokens, error: tokenError } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (tokenError || !tokens) {
        return res.status(401).json({ error: 'Google Calendar not connected' })
      }

      // Initialize Google Calendar API
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )
      oauth2Client.setCredentials({ access_token: tokens.access_token })

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

      // Create event
      const event = {
        summary,
        description: description || '',
        start: {
          dateTime: start,
          timeZone: 'UTC',
        },
        end: {
          dateTime: end,
          timeZone: 'UTC',
        },
        colorId: colorId ? String(colorId) : undefined,
        location: location || undefined,
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      })

      const eventData = response.data
      const eventStart = eventData.start?.dateTime || eventData.start?.date || ''
      const eventEnd = eventData.end?.dateTime || eventData.end?.date || ''
      
      const newEvent = {
        id: eventData.id || '',
        summary: eventData.summary || 'Untitled Event',
        description: eventData.description,
        start: eventStart,
        end: eventEnd,
        colorId: eventData.colorId,
        location: eventData.location,
      }

      return res.status(200).json(newEvent)
    } catch (err) {
      console.error('Error creating event:', err)
      return res.status(500).json({ error: 'Failed to create event' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

