/**
 * Bids & Budgets API
 * Shows current bids/budgets per campaign + spend comparison vs prior period
 * Also queries change_status for recent changes (what changed, but not who)
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

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { campaignFilter, days = '30', mode = 'snapshot' } = req.query
  const customerId = process.env.GOOGLE_CUSTOMER_ID

  const daysBack = parseInt(days) || 30
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - daysBack)
  const priorEnd = new Date(startDate)
  priorEnd.setDate(priorEnd.getDate() - 1)
  const priorStart = new Date(priorEnd)
  priorStart.setDate(priorStart.getDate() - daysBack)

  const fmt = d => d.toISOString().split('T')[0]
  const campWhere = campaignFilter
    ? `AND campaign.name LIKE '%${campaignFilter.replace(/'/g, "\\'")}%'`
    : ''

  try {
    const token = await getAccessToken()

    // Current period campaign data
    const currentRows = await gadsQuery(token, customerId, `
      SELECT
        campaign.id, campaign.name, campaign.status,
        campaign.bidding_strategy_type,
        campaign.target_cpa.target_cpa_micros,
        campaign.target_roas.target_roas,
        campaign.maximize_conversions.target_cpa_micros,
        campaign.maximize_conversion_value.target_roas,
        campaign_budget.amount_micros,
        campaign_budget.period,
        metrics.cost_micros, metrics.conversions,
        metrics.clicks, metrics.impressions
      FROM campaign
      WHERE campaign.status != 'REMOVED'
        AND segments.date BETWEEN '${fmt(startDate)}' AND '${fmt(endDate)}'
        ${campWhere}
      ORDER BY metrics.cost_micros DESC
      LIMIT 300
    `)

    // Prior period spend for comparison
    const priorRows = await gadsQuery(token, customerId, `
      SELECT campaign.id, metrics.cost_micros, metrics.conversions
      FROM campaign
      WHERE campaign.status != 'REMOVED'
        AND segments.date BETWEEN '${fmt(priorStart)}' AND '${fmt(priorEnd)}'
        ${campWhere}
      ORDER BY metrics.cost_micros DESC
      LIMIT 300
    `)

    const priorMap = {}
    for (const r of priorRows) {
      const id = String(r.campaign?.id || '')
      priorMap[id] = {
        spend: Number(r.metrics?.costMicros || 0) / 1e6,
        conversions: Number(r.metrics?.conversions || 0),
      }
    }

    // Try change_status for recent changes (limited — no user info, but gives what fields changed)
    let changes = []
    try {
      const changeRows = await gadsQuery(token, customerId, `
        SELECT
          campaign.id,
          campaign.name,
          campaign_criterion_change_event.change_date_time,
          change_status.resource_status,
          change_status.resource_type,
          change_status.campaign,
          change_status.last_change_date_time
        FROM change_status
        WHERE change_status.last_change_date_time >= '${fmt(startDate)}'
          AND change_status.resource_type IN ('CAMPAIGN', 'CAMPAIGN_BUDGET', 'AD_GROUP_BID_MODIFIER')
          ${campWhere}
        ORDER BY change_status.last_change_date_time DESC
        LIMIT 200
      `)

      changes = changeRows.map(r => {
        const cs = r.changeStatus || r.change_status || {}
        const camp = r.campaign || {}
        return {
          campaign: camp.name || '',
          campaignId: String(camp.id || ''),
          changedAt: cs.lastChangeDateTime || cs.last_change_date_time || '',
          resourceType: (cs.resourceType || cs.resource_type || '').replace(/_/g, ' '),
          status: cs.resourceStatus || cs.resource_status || '',
        }
      }).filter(c => c.changedAt)
    } catch (e) {
      // change_status not available — that's ok
    }

    const campaigns = currentRows.map(row => {
      const c = row.campaign || {}
      const b = row.campaignBudget || row.campaign_budget || {}
      const m = row.metrics || {}

      const budget = Number(b.amountMicros || b.amount_micros || 0) / 1e6
      const spend = Number(m.costMicros || m.cost_micros || 0) / 1e6
      const conversions = Number(m.conversions || 0)
      const clicks = Number(m.clicks || 0)
      const impressions = Number(m.impressions || 0)

      const tcpa = Number(
        c.targetCpa?.targetCpaMicros ||
        c.target_cpa?.target_cpa_micros ||
        c.maximizeConversions?.targetCpaMicros ||
        c.maximize_conversions?.target_cpa_micros || 0
      ) / 1e6

      const troas = Number(
        c.targetRoas?.targetRoas ||
        c.target_roas?.target_roas ||
        c.maximizeConversionValue?.targetRoas ||
        c.maximize_conversion_value?.target_roas || 0
      )

      const id = String(c.id || '')
      const prior = priorMap[id] || { spend: 0, conversions: 0 }
      const spendChange = prior.spend > 0 ? ((spend - prior.spend) / prior.spend * 100) : null
      const budgetUtil = budget > 0 ? (spend / budget * 100) : null

      const strategy = (c.biddingStrategyType || c.bidding_strategy_type || '')
        .replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())

      // Find any changes for this campaign
      const campChanges = changes.filter(ch => ch.campaignId === id || ch.campaign.includes(c.name || ''))

      return {
        id,
        name: c.name || '',
        status: c.status || '',
        strategy,
        budget: budget > 0 ? Math.round(budget) : null,
        budgetPeriod: b.period || 'DAILY',
        targetCpa: tcpa > 0 ? Math.round(tcpa) : null,
        targetRoas: troas > 0 ? parseFloat(troas.toFixed(2)) : null,
        spend: Math.round(spend),
        conversions: Math.round(conversions),
        clicks: Math.round(clicks),
        cpa: conversions > 0 ? Math.round(spend / conversions) : null,
        ctr: impressions > 0 ? parseFloat((clicks / impressions * 100).toFixed(2)) : null,
        budgetUtil: budgetUtil !== null ? parseFloat(budgetUtil.toFixed(1)) : null,
        priorSpend: Math.round(prior.spend),
        spendChange: spendChange !== null ? parseFloat(spendChange.toFixed(1)) : null,
        recentChanges: campChanges.slice(0, 5),
        hasChanges: campChanges.length > 0,
      }
    })

    return res.status(200).json({
      campaigns,
      period: {
        current: `${fmt(startDate)} → ${fmt(endDate)}`,
        prior: `${fmt(priorStart)} → ${fmt(priorEnd)}`,
        days: daysBack,
      },
      total: campaigns.length,
    })

  } catch (e) {
    console.error('Bid changes error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
