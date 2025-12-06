/**
 * Google Calendar API utility functions
 * These functions are used on the server-side (API routes)
 */

export interface GoogleCalendarTokens {
  access_token: string
  refresh_token: string
  expiry_date: number
  token_type: string
  scope: string
}

export interface GoogleCalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  colorId?: string
  location?: string
}

/**
 * Get a valid access token, refreshing if necessary
 */
export async function getValidAccessToken(
  tokens: GoogleCalendarTokens
): Promise<string> {
  const now = Date.now()
  
  // If token expires in less than 5 minutes, refresh it
  if (tokens.expiry_date - now < 5 * 60 * 1000) {
    return await refreshAccessToken(tokens.refresh_token)
  }
  
  return tokens.access_token
}

/**
 * Refresh the access token using refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(`Failed to refresh token: ${JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.access_token
}

/**
 * Map colorId (1-11) to Google Calendar colorId (1-11)
 * Google Calendar uses the same color IDs
 */
export function mapColorIdToGoogle(colorId: string | number | null | undefined): string | undefined {
  if (!colorId) return undefined
  return String(colorId)
}

/**
 * Convert Google Calendar event to our CalendarEvent format
 */
export function convertGoogleEventToCalendarEvent(
  googleEvent: GoogleCalendarEvent
): {
  id: string
  summary: string
  description?: string
  start: string
  end: string
  color?: string
  colorId?: string
  location?: string
} {
  const start = googleEvent.start.dateTime || googleEvent.start.date || ''
  const end = googleEvent.end.dateTime || googleEvent.end.date || ''

  return {
    id: googleEvent.id,
    summary: googleEvent.summary,
    description: googleEvent.description,
    start,
    end,
    colorId: googleEvent.colorId,
    location: googleEvent.location,
  }
}

