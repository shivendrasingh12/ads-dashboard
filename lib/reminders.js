/**
 * Reminder storage
 *
 * On Vercel free tier we can't write to the filesystem between requests.
 * This module uses Vercel KV (free tier: 30k requests/month, 256MB storage)
 * if KV_REST_API_URL env is set, otherwise falls back to in-memory storage
 * (data persists per server instance — fine for dev/testing).
 *
 * To enable persistent storage on Vercel:
 * 1. Go to your Vercel project → Storage → Create Database → KV
 * 2. Connect to your project (Vercel auto-adds the env vars)
 * That's it — no code change needed.
 */

// In-memory fallback store
const memoryStore = { reminders: [] }

async function kvGet(key) {
  if (!process.env.KV_REST_API_URL) return memoryStore[key] || null
  const res = await fetch(`${process.env.KV_REST_API_URL}/get/${key}`, {
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
  })
  const json = await res.json()
  return json.result ? JSON.parse(json.result) : null
}

async function kvSet(key, value) {
  if (!process.env.KV_REST_API_URL) {
    memoryStore[key] = value
    return
  }
  await fetch(`${process.env.KV_REST_API_URL}/set/${key}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(JSON.stringify(value)),
  })
}

export async function getReminders() {
  const data = await kvGet('reminders')
  return data || getDefaultReminders()
}

export async function saveReminders(reminders) {
  await kvSet('reminders', reminders)
}

export async function addReminder(reminder) {
  const reminders = await getReminders()
  const newReminder = {
    ...reminder,
    id: `rem_${Date.now()}`,
    createdAt: new Date().toISOString(),
  }
  reminders.push(newReminder)
  await saveReminders(reminders)
  return newReminder
}

export async function deleteReminder(id) {
  const reminders = await getReminders()
  const filtered = reminders.filter(r => r.id !== id)
  await saveReminders(filtered)
  return filtered
}

export async function updateReminder(id, updates) {
  const reminders = await getReminders()
  const updated = reminders.map(r => r.id === id ? { ...r, ...updates } : r)
  await saveReminders(updated)
  return updated
}

// Default reminders to show on first load (replace with your actual data)
function getDefaultReminders() {
  const today = new Date()
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
  return [
    {
      id: 'rem_default_1',
      camp: 'Holi Sale - Brand Search',
      action: 'pause',
      plat: 'Google',
      date: addDays(today, 1).toISOString(),
      reason: 'Promo HOLI25 expires Apr 5',
      notes: 'Also pause Meta variant',
      createdAt: today.toISOString(),
    },
    {
      id: 'rem_default_2',
      camp: 'Holi Sale - Retargeting',
      action: 'pause',
      plat: 'Meta',
      date: addDays(today, 1).toISOString(),
      reason: 'Promo HOLI25 expires Apr 5',
      notes: '',
      createdAt: today.toISOString(),
    },
  ]
}
