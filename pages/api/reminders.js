import { getReminders, addReminder, deleteReminder, updateReminder } from '../../lib/reminders'

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const reminders = await getReminders()
      return res.status(200).json({ reminders })
    }

    if (req.method === 'POST') {
      const { camp, action, plat, date, reason, notes } = req.body
      if (!camp || !action || !date) {
        return res.status(400).json({ error: 'camp, action, and date are required' })
      }
      const reminder = await addReminder({ camp, action, plat, date, reason, notes })
      return res.status(201).json({ reminder })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id required' })
      const reminders = await deleteReminder(id)
      return res.status(200).json({ reminders })
    }

    if (req.method === 'PATCH') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id required' })
      const reminders = await updateReminder(id, req.body)
      return res.status(200).json({ reminders })
    }

    return res.status(405).end()
  } catch (e) {
    console.error('Reminders API error:', e)
    return res.status(500).json({ error: e.message })
  }
}
