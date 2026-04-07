import { GoogleAdsApi } from 'google-ads-api'

let _client = null

function getClient() {
  if (_client) return _client
  _client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
  })
  return _client
}

function getCustomer() {
  const opts = {
    customer_id: process.env.GOOGLE_CUSTOMER_ID,
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  }
  if (process.env.GOOGLE_LOGIN_CUSTOMER_ID) {
    opts.login_customer_id = process.env.GOOGLE_LOGIN_CUSTOMER_ID
  }
  return getClient().Customer(opts)
}

export function isGoogleConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_DEVELOPER_TOKEN &&
    process.env.GOOGLE_REFRESH_TOKEN &&
    process.env.GOOGLE_CUSTOMER_ID
  )
}

export async function fetchGoogleCampaigns(dateFrom, dateTo) {
  const customer = getCustomer()
  const rows = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign_budget.amount_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 500
  `)

  return rows.map(row => {
    const spend = Number(row.metrics?.cost_micros ?? 0) / 1_000_000
    const conv = Number(row.metrics?.conversions ?? 0)
    const budget = Number(row.campaign_budget?.amount_micros ?? 0) / 1_000_000
    const statusRaw = row.campaign?.status
    return {
      id: String(row.campaign?.id ?? ''),
      name: row.campaign?.name ?? '',
      platform: 'google',
      status: mapStatus(statusRaw),
      budget: Math.round(budget),
      spend: Math.round(spend),
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      ctr: parseFloat((Number(row.metrics?.ctr ?? 0) * 100).toFixed(2)),
      cpc: Math.round(Number(row.metrics?.average_cpc ?? 0) / 1_000_000),
      conversions: Math.round(conv),
      cpa: conv > 0 ? Math.round(spend / conv) : 0,
    }
  })
}

export async function fetchGoogleAdGroups(dateFrom, dateTo, campaignFilter = '') {
  const customer = getCustomer()
  const where = campaignFilter ? `AND campaign.name LIKE '%${campaignFilter.replace(/'/g, "\\'")}%'` : ''
  const rows = await customer.query(`
    SELECT
      ad_group.id,
      ad_group.name,
      ad_group.status,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND ad_group.status != 'REMOVED'
      ${where}
    ORDER BY metrics.cost_micros DESC
    LIMIT 500
  `)

  return rows.map(row => {
    const spend = Number(row.metrics?.cost_micros ?? 0) / 1_000_000
    const conv = Number(row.metrics?.conversions ?? 0)
    return {
      id: String(row.ad_group?.id ?? ''),
      name: row.ad_group?.name ?? '',
      platform: 'google',
      status: mapStatus(row.ad_group?.status),
      campaignId: String(row.campaign?.id ?? ''),
      campaign: row.campaign?.name ?? '',
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      ctr: parseFloat((Number(row.metrics?.ctr ?? 0) * 100).toFixed(2)),
      cpc: Math.round(Number(row.metrics?.average_cpc ?? 0) / 1_000_000),
      spend: Math.round(spend),
      conversions: Math.round(conv),
      cpa: conv > 0 ? Math.round(spend / conv) : 0,
      reach: 0,
      frequency: 0,
      cpm: 0,
    }
  })
}

export async function fetchGoogleAds(dateFrom, dateTo, campaignFilter = '') {
  const customer = getCustomer()
  const where = campaignFilter ? `AND campaign.name LIKE '%${campaignFilter.replace(/'/g, "\\'")}%'` : ''
  const rows = await customer.query(`
    SELECT
      ad_group_ad.ad.id,
      ad_group_ad.ad.name,
      ad_group_ad.status,
      ad_group.id,
      ad_group.name,
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.cost_micros,
      metrics.conversions
    FROM ad_group_ad
    WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      AND ad_group_ad.status != 'REMOVED'
      ${where}
    ORDER BY metrics.cost_micros DESC
    LIMIT 500
  `)

  return rows.map(row => {
    const spend = Number(row.metrics?.cost_micros ?? 0) / 1_000_000
    const conv = Number(row.metrics?.conversions ?? 0)
    return {
      id: String(row.ad_group_ad?.ad?.id ?? Math.random()),
      name: row.ad_group_ad?.ad?.name || `Ad ${row.ad_group_ad?.ad?.id}`,
      platform: 'google',
      status: mapStatus(row.ad_group_ad?.status),
      adGroupId: String(row.ad_group?.id ?? ''),
      adgroup: row.ad_group?.name ?? '',
      campaignId: String(row.campaign?.id ?? ''),
      campaign: row.campaign?.name ?? '',
      impressions: Number(row.metrics?.impressions ?? 0),
      clicks: Number(row.metrics?.clicks ?? 0),
      ctr: parseFloat((Number(row.metrics?.ctr ?? 0) * 100).toFixed(2)),
      cpc: Math.round(Number(row.metrics?.average_cpc ?? 0) / 1_000_000),
      spend: Math.round(spend),
      conversions: Math.round(conv),
      cpa: conv > 0 ? Math.round(spend / conv) : 0,
      reach: 0,
      frequency: 0,
      cpm: 0,
    }
  })
}

export async function fetchGoogleChangeHistory(dateFrom, dateTo) {
  const customer = getCustomer()
  try {
    const rows = await customer.query(`
      SELECT
        change_event.change_date_time,
        change_event.resource_change_operation,
        change_event.resource_type,
        change_event.user_email,
        change_event.changed_fields,
        campaign.name,
        ad_group.name
      FROM change_event
      WHERE change_event.change_date_time >= '${dateFrom} 00:00:00'
        AND change_event.change_date_time <= '${dateTo} 23:59:59'
      ORDER BY change_event.change_date_time DESC
      LIMIT 200
    `)
    return rows.map(row => ({
      time: row.change_event?.change_date_time,
      who: row.change_event?.user_email || 'API',
      resourceType: row.change_event?.resource_type,
      operation: row.change_event?.resource_change_operation,
      changedFields: row.change_event?.changed_fields,
      campaign: row.campaign?.name || '',
      adGroup: row.ad_group?.name || '',
      platform: 'google',
    }))
  } catch (e) {
    console.warn('Google change history not available:', e.message)
    return []
  }
}

function mapStatus(status) {
  if (!status) return 'unknown'
  const s = String(status).toUpperCase()
  if (s === 'ENABLED' || s === '2' || s.includes('ENABL')) return 'active'
  if (s === 'PAUSED' || s === '3' || s.includes('PAUS')) return 'paused'
  if (s === 'REMOVED' || s === '4' || s.includes('REMOV')) return 'removed'
  return 'unknown'
}
