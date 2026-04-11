/**
 * Change Tracker API
 * Replicates the Python change_tracker.py logic via REST
 * Queries change_event for full history including user_email and old/new values
 * Falls back to change_status if change_event is blocked
 */

const RESOURCE_CATEGORY_MAP = {
  'AD_GROUP_BID_MODIFIER': 'Bids', 'CAMPAIGN_BID_MODIFIER': 'Bids', 'BIDDING_STRATEGY': 'Bids',
  'CAMPAIGN_BUDGET': 'Budget',
  'AD': 'Assets', 'AD_GROUP_AD': 'Assets', 'ASSET': 'Assets', 'CAMPAIGN_ASSET': 'Assets', 'AD_GROUP_ASSET': 'Assets',
  'AD_GROUP_CRITERION': 'Targeting', 'CAMPAIGN_CRITERION': 'Targeting',
  'CAMPAIGN': 'Status', 'AD_GROUP': 'Status',
  'EXTENSION_FEED_ITEM': 'Extensions', 'CAMPAIGN_EXTENSION_SETTING': 'Extensions',
  'AD_SCHEDULE': 'Schedule',
}

const BIDDING_STRATEGY = {
  '0':'Unspecified','1':'Unknown','2':'Enhanced CPC','3':'Manual CPC','4':'Manual CPM',
  '5':'Manual CPV','6':'Maximize Clicks','7':'Maximize Conversions',
  '8':'Maximize Conv. Value','9':'Target CPA','10':'Target Impression Share',
  '11':'Target ROAS','12':'Target Spend','13':'Percent CPC','14':'Target CPM',
}
const STATUS_MAP = { '0':'Unspecified','1':'Unknown','2':'Enabled','3':'Paused','4':'Removed' }
const MATCH_TYPE = { '0':'Unspecified','1':'Unknown','2':'Broad','3':'Phrase','4':'Exact' }

const CITY_LIST = ['Agra','Ahmedabad','Aurangabad','Bangalore','Bhopal','Chandigarh','Chennai',
  'Coimbatore','Delhi','Gwalior','Hyderabad','Indore','Jabalpur','Jaipur','Jalandhar','Jodhpur',
  'Kanpur','Kochi','Kolkata','Kozhikode','Lucknow','Ludhiana','Madurai','Meerut','Mumbai',
  'Mysore','Nagpur','Nashik','Prayagraj','Pune','Rajkot','Surat','Thrissur','Tiruppur',
  'Trivandrum','Vadodara','Varanasi','Vijayawada','Vizag']
const CITY_RE = new RegExp('\\b(' + CITY_LIST.join('|') + ')\\b', 'i')

function extractCity(name) {
  const m = CITY_RE.exec(name || '')
  return m ? m[1] : 'Other'
}

function microToINR(v) {
  const n = Number(v) / 1e6
  return n > 0 ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''
}

function decodeField(path, value) {
  const v = String(value || '').trim()
  if (!v || v === '0' || v === 'UNSPECIFIED' || v === 'false') return null

  if (path.includes('micros')) return microToINR(v)
  if (path.includes('bidding_strategy_type')) return BIDDING_STRATEGY[v] || v
  if (path.includes('status')) return STATUS_MAP[v] || v
  if (path.includes('match_type')) return MATCH_TYPE[v] || v
  if (path.includes('target_roas') && !path.includes('micros')) {
    const n = parseFloat(v)
    return n > 0 ? (n * 100).toFixed(2) + '%' : null
  }
  if (path.includes('bid_modifier')) {
    const n = parseFloat(v)
    return n > 0 ? `${((n - 1) * 100).toFixed(1)}%` : null
  }
  return v.length > 120 ? v.slice(0, 120) + '…' : v
}

const FIELD_LABELS = {
  'campaign.status': 'Campaign Status',
  'campaign.name': 'Campaign Name',
  'campaign.bidding_strategy_type': 'Bid Strategy',
  'campaign.target_cpa.target_cpa_micros': 'Target CPA',
  'campaign.target_roas.target_roas': 'Target ROAS',
  'campaign.maximize_conversions.target_cpa_micros': 'Max Conv Target CPA',
  'campaign_budget.amount_micros': 'Daily Budget',
  'campaign_budget.delivery_method': 'Delivery Method',
  'ad_group.status': 'Ad Group Status',
  'ad_group.name': 'Ad Group Name',
  'ad_group.cpc_bid_micros': 'Ad Group CPC Bid',
  'ad_group.target_cpa_micros': 'Ad Group Target CPA',
  'ad_group_ad.status': 'Ad Status',
  'ad_group_criterion.status': 'Keyword Status',
  'ad_group_criterion.cpc_bid_micros': 'Keyword Bid',
  'campaign_criterion.bid_modifier': 'Bid Modifier',
}

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

function parseChangedFields(row) {
  const evt = row.changeEvent || row.change_event || {}
  const oldRes = evt.oldResource || evt.old_resource || {}
  const newRes = evt.newResource || evt.new_resource || {}
  const changedFields = evt.changedFields?.paths || evt.changed_fields?.paths || []

  const changes = []

  for (const path of changedFields) {
    // Skip noisy fields
    const p = path.toLowerCase()
    if (['added_by_google_ads','auto_tagging','tracking_url','url_custom','final_mobile',
         'video_brand','selective_opt','vanity','hotel','local_campaign','discovery',
         'dynamic_search','frequency_caps'].some(skip => p.includes(skip))) continue

    const label = FIELD_LABELS[path] || path.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Extract old/new values from resource objects
    const getVal = (obj, path) => {
      try {
        let curr = obj
        for (const k of path.split('.')) {
          if (curr === null || curr === undefined) return null
          // Handle camelCase conversion
          const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
          curr = curr[k] !== undefined ? curr[k] : curr[camel]
        }
        return curr !== null && curr !== undefined ? String(curr) : null
      } catch { return null }
    }

    // Try to get values from old/new resource
    const rtype = (evt.changeResourceType || evt.change_resource_type || '').toLowerCase()
    const oldVal = getVal(oldRes[rtype] || oldRes, path.replace(rtype + '.', ''))
    const newVal = getVal(newRes[rtype] || newRes, path.replace(rtype + '.', ''))

    const oldDecoded = oldVal ? decodeField(path, oldVal) : null
    const newDecoded = newVal ? decodeField(path, newVal) : null

    if (oldDecoded === newDecoded) continue
    if (!oldDecoded && !newDecoded) continue

    changes.push({
      field: label,
      old: oldDecoded || '',
      new: newDecoded || '',
    })
  }

  return changes.length > 0 ? changes : [{ field: 'Modified', old: '', new: 'Change recorded' }]
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { days = '7', campaignFilter } = req.query
  const customerId = process.env.GOOGLE_CUSTOMER_ID
  const daysBack = Math.min(parseInt(days) || 7, 30)

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

    // Try change_event first (full history with user_email and old/new values)
    try {
      const rows = await gadsQuery(token, customerId, `
        SELECT
          change_event.change_date_time,
          change_event.user_email,
          change_event.change_resource_type,
          change_event.change_resource_name,
          change_event.client_type,
          change_event.changed_fields,
          change_event.old_resource,
          change_event.new_resource,
          campaign.name,
          campaign.id
        FROM change_event
        WHERE change_event.change_date_time >= '${startStr}'
          AND change_event.change_date_time <= '${endStr}'
          ${campWhere}
        ORDER BY change_event.change_date_time DESC
        LIMIT 10000
      `)

      const changes = []
      for (const row of rows) {
        const evt = row.changeEvent || row.change_event || {}
        const camp = row.campaign || {}
        const rtype = evt.changeResourceType || evt.change_resource_type || ''
        const dt = new Date(evt.changeDatetime || evt.change_date_time || '')
        const userEmail = evt.userEmail || evt.user_email || ''
        const clientType = evt.clientType || evt.client_type || ''

        const parsedChanges = parseChangedFields(row)

        changes.push({
          date: dt.toISOString().split('T')[0],
          time: dt.toTimeString().slice(0, 8),
          city: extractCity(camp.name || ''),
          campaign: camp.name || '',
          campId: String(camp.id || ''),
          accountId: customerId,
          category: RESOURCE_CATEGORY_MAP[rtype] || 'Other',
          note: 'Modified',
          changes: parsedChanges,
          changedBy: userEmail || clientType.replace(/_/g, ' ') || 'Google Ads',
        })
      }

      return res.status(200).json({
        changes,
        source: 'change_event',
        period: { from: startStr.slice(0, 10), to: endStr.slice(0, 10), days: daysBack },
        total: changes.length,
      })

    } catch (changeEventErr) {
      console.log('change_event blocked:', changeEventErr.message)

      // Fallback: change_status (no user, no old/new values but gives resource type + timestamp)
      const rows = await gadsQuery(token, customerId, `
        SELECT
          change_status.last_change_date_time,
          change_status.resource_type,
          change_status.resource_status,
          campaign.name,
          campaign.id
        FROM change_status
        WHERE change_status.last_change_date_time >= '${startStr}'
          AND change_status.last_change_date_time <= '${endStr}'
          ${campWhere}
        ORDER BY change_status.last_change_date_time DESC
        LIMIT 2000
      `)

      const changes = rows.map(row => {
        const cs = row.changeStatus || row.change_status || {}
        const camp = row.campaign || {}
        const rtype = cs.resourceType || cs.resource_type || ''
        const status = cs.resourceStatus || cs.resource_status || ''
        const dt = new Date(cs.lastChangeDateTime || cs.last_change_date_time || '')

        return {
          date: dt.toISOString().split('T')[0],
          time: dt.toTimeString().slice(0, 8),
          city: extractCity(camp.name || ''),
          campaign: camp.name || '',
          campId: String(camp.id || ''),
          accountId: customerId,
          category: RESOURCE_CATEGORY_MAP[rtype] || 'Other',
          note: status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
          changes: [{ field: rtype.replace(/_/g, ' '), old: '', new: status }],
          changedBy: 'API / UI (user info unavailable for this account)',
        }
      })

      return res.status(200).json({
        changes,
        source: 'change_status',
        sourceNote: 'change_event API is not available for this Google Ads account type. Showing change_status data (resource type + timestamp only, no user or old/new values).',
        period: { from: startStr.slice(0, 10), to: endStr.slice(0, 10), days: daysBack },
        total: changes.length,
      })
    }

  } catch (e) {
    console.error('Change tracker error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
