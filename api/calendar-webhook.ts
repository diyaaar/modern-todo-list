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
    const { title, date, description } = req.body

    if (!title) {
      return res.status(400).json({ error: 'title is required' })
    }

    if (!date) {
      return res.status(400).json({ error: 'date is required' })
    }

    // Prepare headers with authentication
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': WEBHOOK_SECRET,
    }

    // Forward the request to the webhook with authentication header
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        title,
        date,
        description: description || '',
      }),
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

