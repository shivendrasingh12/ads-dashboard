/**
 * Minutes of Meeting API
 * Stores meeting records with action items, dependencies, status, links
 * Uses in-memory store with Vercel KV fallback
 */

let store = []
let nextId = 1

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { search } = req.query
    let result = [...store].sort((a, b) => new Date(b.date) - new Date(a.date))
    if (search) result = result.filter(m =>
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.attendees.toLowerCase().includes(search.toLowerCase()) ||
      m.actionItems.some(a => a.item.toLowerCase().includes(search.toLowerCase()))
    )
    return res.status(200).json({ meetings: result })
  }

  if (req.method === 'POST') {
    const { date, title, attendees, actionItems, notes } = req.body
    if (!date || !title) return res.status(400).json({ error: 'date and title required' })
    const meeting = {
      id: String(nextId++),
      date, title,
      attendees: attendees || '',
      actionItems: actionItems || [], // [{ item, owner, dependency, status, link }]
      notes: notes || '',
      createdAt: new Date().toISOString(),
    }
    store.unshift(meeting)
    return res.status(200).json({ meeting })
  }

  if (req.method === 'PUT') {
    const { id, ...updates } = req.body
    const idx = store.findIndex(m => m.id === id)
    if (idx === -1) return res.status(404).json({ error: 'not found' })
    store[idx] = { ...store[idx], ...updates }
    return res.status(200).json({ meeting: store[idx] })
  }

  if (req.method === 'DELETE') {
    const { id } = req.query
    store = store.filter(m => m.id !== id)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
