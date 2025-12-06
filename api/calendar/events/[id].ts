import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Event ID is required' })
  }

  if (req.method === 'PATCH') {
    // Update event in Google Calendar
    const updates = req.body

    // TODO: Get user's Google Calendar access token from storage
    // TODO: Call Google Calendar API to update event
    // For now, return mock updated event
    
    const updatedEvent = {
      id,
      ...updates,
    }

    return res.status(200).json(updatedEvent)
  }

  if (req.method === 'DELETE') {
    // Delete event from Google Calendar
    // TODO: Get user's Google Calendar access token from storage
    // TODO: Call Google Calendar API to delete event
    
    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

