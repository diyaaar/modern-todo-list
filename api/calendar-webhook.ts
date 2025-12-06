import type { VercelRequest, VercelResponse } from '@vercel/node'

const WEBHOOK_URL = 'https://n8n.alidiyarduran.com/webhook/42c25513-6e59-43cd-b917-677ca5a8bcfc'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS for all origins
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Validate webhook secret is configured
  if (!WEBHOOK_SECRET) {
    console.error('WEBHOOK_SECRET environment variable is not configured')
    return res.status(500).json({ error: 'Webhook secret is not configured' })
  }

  try {
    // Log incoming request for debugging
    console.log('[Calendar Webhook] Received request body:', JSON.stringify(req.body, null, 2))
    
    const { summary, time, description, colorId } = req.body

    if (!summary) {
      return res.status(400).json({ error: 'summary is required' })
    }

    if (!time) {
      return res.status(400).json({ error: 'time is required' })
    }

    // Prepare headers with authentication
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET,
    }

    // Prepare payload for n8n webhook
    const payload: {
      summary: string
      description: string
      time: string
      colorId?: number
    } = {
      summary,
      time,
      description: description || '',
    }

    // Add colorId if provided (as number, not string)
    if (colorId !== undefined && colorId !== null) {
      payload.colorId = typeof colorId === 'string' ? parseInt(colorId, 10) : colorId
      console.log('[Calendar Webhook] Added colorId to payload:', payload.colorId)
    } else {
      console.warn('[Calendar Webhook] No colorId provided in request')
    }

    console.log('[Calendar Webhook] Forwarding payload to n8n:', JSON.stringify(payload, null, 2))

    // Forward the request to the webhook with authentication header
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      return res.status(response.status).json({ 
        error: `Webhook error: ${response.statusText}`,
        details: errorText
      })
    }

    // Return success response
    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error proxying webhook request:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to send to webhook'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return res.status(500).json({ 
      error: errorMessage,
      details: errorStack || 'Check server logs for more details'
    })
  }
}

