import { isGoogleConfigured } from '../../lib/googleAds'

const RESOURCE_CATEGORY = {
  adGroupBidModifier: 'Bids', campaignBidModifier: 'Bids', biddingStrategy: 'Bids',
  campaignBudget: 'Budget',
  ad: 'Assets', adGroupAd: 'Assets', asset: 'Assets', campaignAsset: 'Assets', adGroupAsset: 'Assets',
  adGroupCriterion: 'Targeting', campaignCriterion: 'Targeting',
  campaign: 'Status', adGroup: 'Status',
  extensionFeedItem: 'Extensions', campaignExtensionSetting: 'Extensions',
}

const RESOURCE_LABEL = {
  adGroupAd: 'Ad', adGroup: 'Ad Group', campaign: 'Campaign',
  campaignBudget: 'Campaign Budget', asset: 'Asset', campaignAsset: 'Asset',
  adGroupCriterion: 'Keyword', campaignCriterion: 'Criterion',
  adGroupBidModifier: 'Bid Modifier', biddingStrategy: 'Bid Strategy',
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
  const data = await res.json()
  if (data.error) throw new Error('Token error: ' + data.error_description)
  return data.access_token
}

async function queryGoogleAds(accessToken, customerId, query) {
  const loginCustomerId = process.env.GOOGLE_LOGIN_CUSTOMER_ID || customerId
  const res = await fetch(`https://googleads.googleapis.com/v23/customers/${customerId}/googleAds:search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN,
      'login-customer-id': loginCustomerId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  })
  const data = await res.json()
  if (data.error) throw new Error(data.error.message)
  return data.results || []
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { dateFrom, dateTo } = req.query
  if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom and dateTo required' })
  if (!isGoogleConfigured()) return res.status(200).json({ changes: [], errors: [] })

  try {
    const accessToken = await getAccessToken()
    const customerId = process.env.GOOGLE_CUSTOMER_ID

    const query = `
      SELECT
        change_status.last_change_date_time,
        change_status.resource_type,
        change_status.resource_status,
        campaign.id,
        campaign.name
      FROM change_status
      WHERE change_status.last_change_date_time >= '${dateFrom} 00:00:00'
        AND change_status.last_change_date_time <= '${dateTo} 23:59:59'
      ORDER BY change_status.last_change_date_time DESC
      LIMIT 200
    `

    const rows = await queryGoogleAds(accessToken, customerId, query)

    const changes = rows.map(row => {
      const cs = row.changeStatus || {}
      const camp = row.campaign || {}

      const rtype = cs.resourceType || ''
      const status = cs.resourceStatus || ''
      const dt = cs.lastChangeDateTime || ''

      const statusLabel = {
        ADDED: 'Added', MODIFIED: 'Modified', REMOVED: 'Removed',
        RESOURCE_STATUS_UNSPECIFIED: 'Unknown', NONE: 'No change',
      }[status] || status

      const rtypeLabel = RESOURCE_LABEL[rtype] || rtype.replace(/([A-Z])/g, ' $1').trim()
      const category = RESOURCE_CATEGORY[rtype] || 'Other'

      return {
        time: dt,
        who: 'API / UI',
        campaign: camp.name || '',
        adGroup: '',
        resourceType: rtype,
        category,
        operation: statusLabel,
        changedFields: [rtypeLabel],
        changeDetails: [{ field: rtypeLabel, old: '', new: statusLabel }],
        platform: 'google',
      }
    })

    return res.status(200).json({ changes, errors: [] })
  } catch (e) {
    console.error('Changes error:', e.message)
    return res.status(200).json({ changes: [], errors: [{ platform: 'google', message: e.message }] })
  }
}
