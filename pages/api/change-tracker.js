/**
 * Change Tracker API — Bids & Budgets only
 */

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

async function gadsQuery(token, customerId, query) {
  const loginId = process.env.GOOGLE_LOGIN_CUSTOMER_ID || customerId
  const res = await fetch(`https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN,
      'login-customer-id': loginId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const d = await res.json()
  if (d.error) throw new Error(d.error.message)
  return d.results || []
}

const CITY_LIST = ['Agra','Ahmedabad','Aurangabad','Bangalore','Bhopal','Chandigarh','Chennai',
  'Coimbatore','Delhi','Gwalior','Hyderabad','Indore','Jabalpur','Jaipur','Jalandhar','Jodhpur',
  'Kanpur','Kochi','Kolkata','Kozhikode','Lucknow','Ludhiana','Madurai','Meerut','Mumbai',
  'Mysore','Nagpur','Nashik','Prayagraj','Pune','Rajkot','Surat','Thrissur','Tiruppur',
  'Trivandrum','Vadodara','Varanasi','Vijayawada','Vizag']
const CITY_RE = new RegExp('\\b(' + CITY_LIST.join('|') + ')\\b', 'i')
function extractCity(name) { const m = CITY_RE.exec(name || ''); return m ? m[1] : 'Other' }

function microToINR(v) {
  const n = Number(v) / 1e6
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const BIDDING_STRATEGY = {
  '0':'Unspecified','1':'Unknown','2':'Enhanced CPC','3':'Manual CPC','4':'Manual CPM',
  '5':'Manual CPV','6':'Maximize Clicks','7':'Maximize Conversions',
  '8':'Maximize Conv. Value','9':'Target CPA','10':'Target Impression Share',
  '11':'Target ROAS','12':'Target Spend','13':'Percent CPC','14':'Target CPM',
  'ENHANCED_CPC':'Enhanced CPC','MANUAL_CPC':'Manual CPC','MAXIMIZE_CLICKS':'Maximize Clicks',
  'MAXIMIZE_CONVERSIONS':'Maximize Conversions','MAXIMIZE_CONVERSION_VALUE':'Maximize Conv. Value',
  'TARGET_CPA':'Target CPA','TARGET_IMPRESSION_SHARE':'Target Impression Share',
  'TARGET_ROAS':'Target ROAS','TARGET_SPEND':'Target Spend',
}
const STATUS_MAP = { '2':'Enabled','3':'Paused','4':'Removed',
  'ENABLED':'Enabled','PAUSED':'Paused','REMOVED':'Removed' }

function getVal(obj, dotPath) {
  if (!obj || !dotPath) return null
  let curr = obj
  for (const k of dotPath.split('.')) {
    if (curr == null) return null
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    if (curr[k] !== undefined) curr = curr[k]
    else if (curr[camel] !== undefined) curr = curr[camel]
    else return null
  }
  return curr != null ? String(curr) : null
}

const TRACKED = [
  { pat: /amount.?micros/i,          label: 'Daily Budget',  category: 'Budget', decode: microToINR },
  { pat: /target.?cpa.?micros/i,     label: 'Target CPA',    category: 'Bids',   decode: microToINR },
  { pat: /cpc.?bid.?micros/i,        label: 'CPC Bid',       category: 'Bids',   decode: microToINR },
  { pat: /target.?roas$/i,           label: 'Target ROAS',   category: 'Bids',   decode: v => (parseFloat(v)*100).toFixed(1)+'%' },
  { pat: /bidding.?strategy.?type/i, label: 'Bid Strategy',  category: 'Bids',   decode: v => BIDDING_STRATEGY[v]||v },
  { pat: /\.status$/i,               label: 'Status',        category: 'Status', decode: v => STATUS_MAP[v]||v },
  { pat: /bid.?modifier/i,           label: 'Bid Modifier',  category: 'Bids',   decode: v => ((parseFloat(v)-1)*100).toFixed(1)+'%' },
]

function findDef(path) {
  for (const t of TRACKED) { if (t.pat.test(path)) return t }
  return null
}

function snakeToCamel(s) { return s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase()) }

function parseRow(row) {
  const evt = row.changeEvent || {}
  const oldRes = evt.oldResource || {}
  const newRes = evt.newResource || {}
  const rtype = evt.changeResourceType || ''
  const resKey = snakeToCamel(rtype)

  let fields = []
  const raw = evt.changedFields
  if (typeof raw === 'string') fields = raw.split(',').map(s => s.trim()).filter(Boolean)
  else if (raw?.paths) fields = raw.paths

  const oldObj = oldRes[resKey] || oldRes
  const newObj = newRes[resKey] || newRes

  const changes = []
  for (const path of fields) {
    const def = findDef(path)
    if (!def) continue

    const parts = path.split('.')
    const subPath = parts.length > 1 ? parts.slice(1).join('.') : parts[0]

    const oldRaw = getVal(oldObj, subPath)
    const newRaw = getVal(newObj, subPath)
    const oldStr = oldRaw ? def.decode(oldRaw) : '—'
    const newStr = newRaw ? def.decode(newRaw) : '—'
    if (oldStr === newStr) continue

    changes.push({ field: def.label, old: oldStr, new: newStr, category: def.category })
  }
  return changes
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { days = '7', campaignFilter } = req.query
  const customerId = process.env.GOOGLE_CUSTOMER_ID
  // Google Ads change_event max lookback is 30 days, use 29 to avoid boundary error
  const daysBack = Math.min(parseInt(days) || 7, 29)

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const startStr = startDate.toISOString().replace('T', ' ').slice(0, 19)
  const endStr = endDate.toISOString().replace('T', ' ').slice(0, 19)

  const campWhere = campaignFilter
    ? `AND campaign.name LIKE '%${campaignFilter.replace(/'/g, "\\'")}%'`
    : ''

  try {
    const token = await getAccessToken()

    const rows = await gadsQuery(token, customerId, `
      SELECT
        change_event.change_date_time, change_event.user_email,
        change_event.change_resource_type, change_event.changed_fields,
        change_event.old_resource, change_event.new_resource,
        change_event.client_type, campaign.name, campaign.id
      FROM change_event
      WHERE change_event.change_date_time >= '${startStr}'
        AND change_event.change_date_time <= '${endStr}'
        AND change_event.change_resource_type IN (
          'CAMPAIGN_BUDGET','CAMPAIGN','AD_GROUP','AD_GROUP_BID_MODIFIER'
        )
        ${campWhere}
      ORDER BY change_event.change_date_time DESC
      LIMIT 500
    `)

    const changes = []
    for (const row of rows) {
      const evt = row.changeEvent || {}
      const camp = row.campaign || {}
      const parsed = parseRow(row)
      if (parsed.length === 0) continue

      const dtRaw = evt.changeDateTime || evt.changeDatetime || ''
      const dt = new Date(dtRaw.replace(' ', 'T'))

      changes.push({
        date: dt.toISOString().split('T')[0],
        time: dt.toTimeString().slice(0, 5),
        campaign: camp.name || '',
        city: extractCity(camp.name || ''),
        changes: parsed,
        changedBy: evt.userEmail || (evt.clientType || '').replace(/_/g, ' ') || 'Google Ads',
      })
    }

    return res.status(200).json({
      changes,
      source: 'change_event',
      period: { from: startStr.slice(0, 10), to: endStr.slice(0, 10), days: daysBack },
      total: changes.length,
    })

  } catch (e) {
    console.error('Change tracker error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
