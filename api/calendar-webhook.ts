import type { VercelRequest, VercelResponse } from '@vercel/node'

const WEBHOOK_URL = 'https://n8n.alidiyarduran.com/webhook/42c25513-6e59-43cd-b917-677ca5a8bcfc'

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

  try {
    const { title, date, description } = req.body

    if (!title) {
      return res.status(400).json({ error: 'title is required' })
    }

    if (!date) {
      return res.status(400).json({ error: 'date is required' })
    }

    // Forward the request to the webhook
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

