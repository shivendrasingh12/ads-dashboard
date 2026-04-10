/**
 * Bid & Budget Changes API
 * Queries Google Ads change_event resource for bid/budget changes
 * Falls back to campaign-level current data if change_event is blocked
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
  if (d.error) throw new Error('Token error: ' + d.error_description)
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

function isoToDate(dt) {
  if (!dt) return ''
  return typeof dt === 'string' ? dt.split('T')[0] : String(dt)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { campaignFilter, days = '60' } = req.query
  const customerId = process.env.GOOGLE_CUSTOMER_ID
  const daysBack = Math.min(parseInt(days) || 60, 90)

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const startStr = startDate.toISOString().split('T')[0]
  const endStr = endDate.toISOString().split('T')[0]

  try {
    const token = await getAccessToken()
    const changes = []

    // Try change_event resource for bid/budget changes
    try {
      const campFilter = campaignFilter
        ? `AND campaign.name LIKE '%${campaignFilter.replace(/'/g, "\\'")}%'`
        : ''

      const query = `
        SELECT
          change_event.change_date_time,
          change_event.user_email,
          change_event.client_type,
          change_event.changed_fields,
          change_event.resource_change_operation,
          change_event.resource_type,
          campaign.name,
          campaign.id,
          change_event.new_resource,
          change_event.old_resource
        FROM change_event
        WHERE change_event.change_date_time >= '${startStr}'
          AND change_event.change_date_time <= '${endStr}'
          AND change_event.resource_type IN ('CAMPAIGN', 'AD_GROUP', 'CAMPAIGN_BUDGET')
          ${campFilter}
        ORDER BY change_event.change_date_time DESC
        LIMIT 500
      `

      const rows = await gadsQuery(token, customerId, query)

      for (const row of rows) {
        const evt = row.changeEvent || row.change_event || {}
        const camp = row.campaign || {}
        const changedFields = evt.changedFields || evt.changed_fields || []
        const fields = Array.isArray(changedFields) ? changedFields : [changedFields]

        // Only include bid/budget related changes
        const bidBudgetFields = fields.filter(f => {
          const fl = (f || '').toLowerCase()
          return fl.includes('bid') || fl.includes('budget') || fl.includes('cpc') ||
                 fl.includes('cpa') || fl.includes('target') || fl.includes('amount')
        })
        if (bidBudgetFields.length === 0) continue

        const newRes = evt.newResource || evt.new_resource || {}
        const oldRes = evt.oldResource || evt.old_resource || {}

        // Extract old/new values for budget and bids
        const extractBid = (r) => {
          if (r.campaign?.manualCpc?.enhancedCpcEnabled !== undefined) return null
          const tcpa = r.campaign?.targetCpa?.targetCpaMicros || r.adGroup?.targetCpaMicros
          const tRoas = r.campaign?.targetRoas?.targetRoas
          const maxCpc = r.adGroup?.cpcBidMicros || r.campaign?.manualCpv?.cpvBidMicros
          const budget = r.campaignBudget?.amountMicros
          return { tcpa, tRoas, maxCpc, budget }
        }

        const oldVals = extractBid(oldRes)
        const newVals = extractBid(newRes)

        const formatMicros = v => v ? '₹' + Math.round(Number(v) / 1e6).toLocaleString('en-IN') : null

        // Build readable change description
        const descriptions = []
        for (const f of bidBudgetFields) {
          const fl = f.toLowerCase()
          if (fl.includes('budget') || fl.includes('amount')) {
            const oldB = formatMicros(oldVals?.budget)
            const newB = formatMicros(newVals?.budget)
            if (oldB || newB) descriptions.push(`Budget: ${oldB || '?'} → ${newB || '?'}`)
            else descriptions.push(`Budget changed`)
          } else if (fl.includes('target_cpa') || fl.includes('targetcpa')) {
            const oldV = formatMicros(oldVals?.tcpa)
            const newV = formatMicros(newVals?.tcpa)
            if (oldV || newV) descriptions.push(`Target CPA: ${oldV || '?'} → ${newV || '?'}`)
            else descriptions.push(`Target CPA changed`)
          } else if (fl.includes('target_roas') || fl.includes('targetroas')) {
            descriptions.push(`Target ROAS changed`)
          } else if (fl.includes('cpc') || fl.includes('bid')) {
            const oldV = formatMicros(oldVals?.maxCpc)
            const newV = formatMicros(newVals?.maxCpc)
            if (oldV || newV) descriptions.push(`Max CPC: ${oldV || '?'} → ${newV || '?'}`)
            else descriptions.push(`Bid changed`)
          } else {
            descriptions.push(f.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim())
          }
        }

        const user = evt.userEmail || evt.user_email || 'Google Ads'
        const dt = evt.changeDatetime || evt.change_date_time || ''

        changes.push({
          id: `${dt}-${camp.id}-${Math.random()}`,
          dateTime: dt,
          date: isoToDate(dt),
          campaign: camp.name || '',
          campaignId: String(camp.id || ''),
          resourceType: evt.resourceType || evt.resource_type || '',
          operation: evt.resourceChangeOperation || evt.resource_change_operation || '',
          changedFields: bidBudgetFields,
          descriptions,
          user: user.split('@')[0],
          userEmail: user,
          clientType: evt.clientType || evt.client_type || '',
        })
      }

      return res.status(200).json({
        changes,
        source: 'change_event',
        period: { from: startStr, to: endStr, days: daysBack },
        total: changes.length,
      })

    } catch (changeEventErr) {
      // change_event blocked for this account — return helpful message
      console.log('change_event error:', changeEventErr.message)

      // Fall back to fetching current campaign bid/budget data
      const campFilter = campaignFilter
        ? `AND campaign.name LIKE '%${campaignFilter.replace(/'/g, "\\'")}%'`
        : ''

      const query = `
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.bidding_strategy_type,
          campaign_budget.amount_micros,
          campaign.target_cpa.target_cpa_micros,
          campaign.target_roas.target_roas,
          campaign.maximize_conversions.target_cpa_micros,
          campaign.manual_cpc.enhanced_cpc_enabled
        FROM campaign
        WHERE campaign.status != 'REMOVED'
          ${campFilter}
        ORDER BY campaign.name
        LIMIT 200
      `

      const rows = await gadsQuery(token, customerId, query)

      const currentData = rows.map(row => {
        const c = row.campaign || {}
        const b = row.campaignBudget || row.campaign_budget || {}
        const budget = Number(b.amountMicros || b.amount_micros || 0) / 1e6
        const tcpa = Number(c.targetCpa?.targetCpaMicros || c.target_cpa?.target_cpa_micros || c.maximizeConversions?.targetCpaMicros || 0) / 1e6
        const troas = c.targetRoas?.targetRoas || c.target_roas?.target_roas || 0
        return {
          campaignId: String(c.id || ''),
          campaign: c.name || '',
          status: c.status || '',
          biddingStrategy: c.biddingStrategyType || c.bidding_strategy_type || '',
          budget: budget > 0 ? Math.round(budget) : null,
          targetCpa: tcpa > 0 ? Math.round(tcpa) : null,
          targetRoas: troas > 0 ? parseFloat(troas.toFixed(2)) : null,
        }
      })

      return res.status(200).json({
        changes: [],
        currentBidsBudgets: currentData,
        source: 'current_snapshot',
        error: 'change_event API not available for this account. Showing current bid/budget snapshot instead.',
        period: { from: startStr, to: endStr, days: daysBack },
      })
    }

  } catch (e) {
    console.error('Bid changes error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
