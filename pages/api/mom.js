/**
 * Minutes of Meeting API — Google Sheets backed
 * Sheet columns: id | date | title | attendees | notes | actionItems (JSON) | createdAt | category
 */

const SHEET_ID = process.env.APP_DATA_SHEET_ID
const TAB = 'MOM'

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  })
  const d = await res.json()
  if (d.error) throw new Error('Token: ' + d.error_description)
  return d.access_token
}

async function getRows(token) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}!A:H`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  const d = await res.json()
  const rows = d.values || []
  if (rows.length <= 1) return []
  const headers = rows[0]
  return rows.slice(1).map((r, i) => {
    const obj = {}
    headers.forEach((h, j) => { obj[h] = r[j] || '' })
    obj._rowIndex = i + 2
    return obj
  })
}

async function appendRow(token, values) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}!A:H:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] }),
    }
  )
}

async function updateRow(token, rowIndex, values) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}!A${rowIndex}:H${rowIndex}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] }),
    }
  )
}

async function getSheetGid(token) {
  const meta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  const metaD = await meta.json()
  const sheet = (metaD.sheets || []).find(s => s.properties.title === TAB)
  return sheet?.properties?.sheetId || 0
}

async function deleteRow(token, rowIndex) {
  const sheetId = await getSheetGid(token)
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex }
          }
        }]
      }),
    }
  )
}

function rowToMeeting(r) {
  let actionItems = []
  try { actionItems = JSON.parse(r.actionItems || '[]') } catch { actionItems = [] }
  return {
    id: r.id,
    date: r.date,
    title: r.title,
    attendees: r.attendees,
    notes: r.notes,
    actionItems,
    createdAt: r.createdAt,
    category: r.category || 'General',
  }
}

function meetingToRow(m, createdAt) {
  return [
    m.id || '',
    m.date || '',
    m.title || '',
    m.attendees || '',
    m.notes || '',
    JSON.stringify(m.actionItems || []),
    createdAt || new Date().toISOString(),
    m.category || 'General',
  ]
}

export default async function handler(req, res) {
  try {
    const token = await getAccessToken()

    if (req.method === 'GET') {
      const rows = await getRows(token)
      let meetings = rows.map(rowToMeeting)
      const { search } = req.query
      if (search) {
        const s = search.toLowerCase()
        meetings = meetings.filter(m =>
          [m.title, m.attendees, m.notes, m.category, ...(m.actionItems || []).map(a => a.item + ' ' + a.owner)]
            .some(v => (v || '').toLowerCase().includes(s))
        )
      }
      meetings.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      return res.status(200).json({ meetings })
    }

    if (req.method === 'POST') {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      const meeting = { ...req.body, id }
      await appendRow(token, meetingToRow(meeting))
      return res.status(200).json({ ok: true, id })
    }

    if (req.method === 'PUT') {
      const { id } = req.body
      if (!id) return res.status(400).json({ error: 'id required' })
      const rows = await getRows(token)
      const row = rows.find(r => r.id === id)
      if (!row) return res.status(404).json({ error: 'not found' })
      await updateRow(token, row._rowIndex, meetingToRow(req.body, row.createdAt))
      return res.status(200).json({ ok: true })
    }

    if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id) return res.status(400).json({ error: 'id required' })
      const rows = await getRows(token)
      const row = rows.find(r => r.id === id)
      if (row) await deleteRow(token, row._rowIndex)
      return res.status(200).json({ ok: true })
    }

    return res.status(405).end()
  } catch (e) {
    console.error('MOM error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
// force rebuild
