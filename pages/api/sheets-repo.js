/**
 * Sheets Repository API — Google Sheets backed
 * GET    /api/sheets-repo          → { items: [...] }
 * POST   /api/sheets-repo          → create item
 * PUT    /api/sheets-repo          → update item
 * DELETE /api/sheets-repo?id=xxx   → delete item
 *
 * Sheet tab: SheetsRepo
 * Columns: id | category | title | url | createdAt
 */

const SHEET_ID = process.env.APP_DATA_SHEET_ID
const TAB = 'SheetsRepo'

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
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}!A:E`,
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
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}!A:E:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] }),
    }
  )
}

async function updateRow(token, rowIndex, values) {
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${TAB}!A${rowIndex}:E${rowIndex}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [values] }),
    }
  )
}

async function deleteRow(token, rowIndex) {
  const meta = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  )
  const metaD = await meta.json()
  const sheet = (metaD.sheets || []).find(s => s.properties.title === TAB)
  const sheetId = sheet?.properties?.sheetId || 0
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex } } }]
      }),
    }
  )
}

export default async function handler(req, res) {
  try {
    const token = await getAccessToken()

    if (req.method === 'GET') {
      const rows = await getRows(token)
      const items = rows.map(r => ({ id: r.id, category: r.category, title: r.title, url: r.url, createdAt: r.createdAt }))
      return res.status(200).json({ items })
    }

    if (req.method === 'POST') {
      const { category, title, url } = req.body
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
      await appendRow(token, [id, category || '', title || '', url || '', new Date().toISOString()])
      return res.status(200).json({ ok: true, id })
    }

    if (req.method === 'PUT') {
      const { id, category, title, url } = req.body
      if (!id) return res.status(400).json({ error: 'id required' })
      const rows = await getRows(token)
      const row = rows.find(r => r.id === id)
      if (!row) return res.status(404).json({ error: 'not found' })
      await updateRow(token, row._rowIndex, [id, category || '', title || '', url || '', row.createdAt])
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
    console.error('SheetsRepo error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
