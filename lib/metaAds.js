/**
 * Meta (Facebook) Ads API Client
 * Uses the Meta Graph API directly via fetch — no extra package needed.
 * Docs: https://developers.facebook.com/docs/marketing-apis
 */

const META_API_VERSION = 'v19.0'
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`

/**
 * Check if Meta credentials are configured
 */
export function isMetaConfigured() {
  return !!(
    process.env.META_ACCESS_TOKEN &&
    process.env.META_AD_ACCOUNT_ID
  )
}

/**
 * Core fetch helper with error handling
 */
async function metaFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString())
  const json = await res.json()

  if (json.error) {
    throw new Error(`Meta API error ${json.error.code}: ${json.error.message}`)
  }
  return json
}

/**
 * Fetch campaigns with performance metrics
 */
export async function fetchMetaCampaigns(dateFrom, dateTo) {
  const accountId = process.env.META_AD_ACCOUNT_ID
  const timeRange = JSON.stringify({ since: dateFrom, until: dateTo })

  const fields = [
    'id', 'name', 'status', 'effective_status', 'objective',
    'daily_budget', 'lifetime_budget',
    'insights.fields(impressions,clicks,ctr,cpc,spend,actions,cost_per_action_type,reach,frequency,cpm)',
  ].join(',')

  const data = await metaFetch(`/${accountId}/campaigns`, {
    fields,
    time_range: timeRange,
    limit: 100,
  })

  return (data.data || []).map(c => {
    const ins = c.insights?.data?.[0] || {}
    const conversions = getActionValue(ins.actions, 'offsite_conversion.fb_pixel_purchase')
      || getActionValue(ins.actions, 'lead')
      || getActionValue(ins.actions, 'omni_complete_registration')
      || 0
    const spend = parseFloat(ins.spend || 0)
    const budget = parseInt(c.daily_budget || c.lifetime_budget || 0) / 100

    return {
      id: c.id,
      name: c.name,
      platform: 'meta',
      status: mapMetaStatus(c.effective_status),
      objective: c.objective,
      budget,
      spend: Math.round(spend),
      impressions: parseInt(ins.impressions || 0),
      clicks: parseInt(ins.clicks || 0),
      ctr: parseFloat(parseFloat(ins.ctr || 0).toFixed(2)),
      cpc: Math.round(parseFloat(ins.cpc || 0)),
      conversions: Math.round(conversions),
      cpa: conversions > 0 ? Math.round(spend / conversions) : 0,
      reach: parseInt(ins.reach || 0),
      frequency: parseFloat(parseFloat(ins.frequency || 0).toFixed(2)),
      cpm: Math.round(parseFloat(ins.cpm || 0)),
    }
  })
}

/**
 * Fetch adsets with performance metrics
 */
export async function fetchMetaAdsets(dateFrom, dateTo, campaignFilter = '') {
  const accountId = process.env.META_AD_ACCOUNT_ID
  const timeRange = JSON.stringify({ since: dateFrom, until: dateTo })

  const fields = [
    'id', 'name', 'status', 'effective_status', 'campaign_id', 'campaign{name}',
    'daily_budget', 'bid_amount',
    'insights.fields(impressions,clicks,ctr,cpc,spend,actions,cost_per_action_type,reach,frequency,cpm)',
  ].join(',')

  const data = await metaFetch(`/${accountId}/adsets`, {
    fields,
    time_range: timeRange,
    limit: 200,
  })

  let adsets = (data.data || []).map(a => {
    const ins = a.insights?.data?.[0] || {}
    const conversions = getActionValue(ins.actions, 'offsite_conversion.fb_pixel_purchase')
      || getActionValue(ins.actions, 'lead')
      || 0
    const spend = parseFloat(ins.spend || 0)

    return {
      id: a.id,
      name: a.name,
      platform: 'meta',
      status: mapMetaStatus(a.effective_status),
      campaignId: a.campaign_id,
      campaign: a.campaign?.name || '',
      impressions: parseInt(ins.impressions || 0),
      clicks: parseInt(ins.clicks || 0),
      ctr: parseFloat(parseFloat(ins.ctr || 0).toFixed(2)),
      cpc: Math.round(parseFloat(ins.cpc || 0)),
      spend: Math.round(spend),
      conversions: Math.round(conversions),
      cpa: conversions > 0 ? Math.round(spend / conversions) : 0,
      reach: parseInt(ins.reach || 0),
      frequency: parseFloat(parseFloat(ins.frequency || 0).toFixed(2)),
      cpm: Math.round(parseFloat(ins.cpm || 0)),
    }
  })

  if (campaignFilter) {
    adsets = adsets.filter(a =>
      a.campaign.toLowerCase().includes(campaignFilter.toLowerCase()) ||
      a.name.toLowerCase().includes(campaignFilter.toLowerCase())
    )
  }

  return adsets
}

/**
 * Fetch individual ads with performance
 */
export async function fetchMetaAds(dateFrom, dateTo, campaignFilter = '') {
  const accountId = process.env.META_AD_ACCOUNT_ID
  const timeRange = JSON.stringify({ since: dateFrom, until: dateTo })

  const fields = [
    'id', 'name', 'status', 'effective_status',
    'adset_id', 'adset{name}', 'campaign_id', 'campaign{name}',
    'creative{title,body,thumbnail_url}',
    'insights.fields(impressions,clicks,ctr,cpc,spend,actions,reach,frequency,cpm,video_avg_time_watched_actions)',
  ].join(',')

  const data = await metaFetch(`/${accountId}/ads`, {
    fields,
    time_range: timeRange,
    limit: 200,
  })

  let ads = (data.data || []).map(a => {
    const ins = a.insights?.data?.[0] || {}
    const conversions = getActionValue(ins.actions, 'offsite_conversion.fb_pixel_purchase')
      || getActionValue(ins.actions, 'lead')
      || 0
    const spend = parseFloat(ins.spend || 0)

    return {
      id: a.id,
      name: a.name,
      platform: 'meta',
      status: mapMetaStatus(a.effective_status),
      adGroupId: a.adset_id,
      adgroup: a.adset?.name || '',
      campaignId: a.campaign_id,
      campaign: a.campaign?.name || '',
      creative: a.creative,
      impressions: parseInt(ins.impressions || 0),
      clicks: parseInt(ins.clicks || 0),
      ctr: parseFloat(parseFloat(ins.ctr || 0).toFixed(2)),
      cpc: Math.round(parseFloat(ins.cpc || 0)),
      spend: Math.round(spend),
      conversions: Math.round(conversions),
      cpa: conversions > 0 ? Math.round(spend / conversions) : 0,
      reach: parseInt(ins.reach || 0),
      frequency: parseFloat(parseFloat(ins.frequency || 0).toFixed(2)),
      cpm: Math.round(parseFloat(ins.cpm || 0)),
    }
  })

  if (campaignFilter) {
    ads = ads.filter(a =>
      a.campaign.toLowerCase().includes(campaignFilter.toLowerCase()) ||
      a.name.toLowerCase().includes(campaignFilter.toLowerCase())
    )
  }

  return ads
}

function getActionValue(actions, type) {
  if (!actions) return 0
  const found = actions.find(a => a.action_type === type)
  return found ? parseFloat(found.value) : 0
}

function mapMetaStatus(status) {
  const map = {
    ACTIVE: 'active',
    PAUSED: 'paused',
    DELETED: 'removed',
    ARCHIVED: 'removed',
    WITH_ISSUES: 'alert',
  }
  return map[status] || 'unknown'
}
