import type { VercelRequest, VercelResponse } from '@vercel/node'
import { supabase } from '../../lib/supabase'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/calendar/auth/callback`
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`${FRONTEND_URL}?calendar_error=${encodeURIComponent(error as string)}`)
  }

  if (!code || !state) {
    return res.redirect(`${FRONTEND_URL}?calendar_error=missing_parameters`)
  }

  // Verify state token (CSRF protection)
  const storedState = req.cookies?.oauth_state
  if (state !== storedState) {
    return res.redirect(`${FRONTEND_URL}?calendar_error=invalid_state`)
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error('Token exchange error:', errorData)
      return res.redirect(`${FRONTEND_URL}?calendar_error=token_exchange_failed`)
    }

    const tokens = await tokenResponse.json()

    // Get user ID from state (we'll encode it in the state parameter)
    // State format: "random_string:user_id"
    const stateParts = (state as string).split(':')
    const userId = stateParts.length > 1 ? stateParts[1] : null

    if (!userId) {
      return res.redirect(`${FRONTEND_URL}?calendar_error=missing_user_id`)
    }

    // Calculate expiry date
    const expiryDate = Date.now() + (tokens.expires_in * 1000)

    // Store tokens in Supabase
    const { error: dbError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        user_id: userId,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: expiryDate,
        token_type: tokens.token_type || 'Bearer',
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (dbError) {
      console.error('Error storing tokens:', dbError)
      return res.redirect(`${FRONTEND_URL}?calendar_error=storage_failed`)
    }

    return res.redirect(`${FRONTEND_URL}?calendar_connected=true`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return res.redirect(`${FRONTEND_URL}?calendar_error=connection_failed`)
  }
}

