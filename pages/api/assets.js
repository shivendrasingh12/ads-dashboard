/**
 * Google Ads Asset Performance API
 * Fetches asset-level performance for a given ad group
 * Uses the asset_group_asset and ad_group_ad resource
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

  const { adGroupId, dateFrom, dateTo, campaignId } = req.query
  if (!adGroupId || !dateFrom || !dateTo) {
    return res.status(400).json({ error: 'adGroupId, dateFrom, dateTo required' })
  }

  const customerId = process.env.GOOGLE_CUSTOMER_ID

  try {
    const accessToken = await getAccessToken()

    // Fetch ad-level assets with performance metrics
    // For UAC campaigns, we use ad_group_ad + asset performance
    const query = `
      SELECT
        ad_group_ad.ad.id,
        ad_group_ad.ad.name,
        ad_group_ad.ad.type,
        ad_group_ad.status,
        ad_group_ad.ad.app_ad.images,
        ad_group_ad.ad.app_ad.headlines,
        ad_group_ad.ad.app_ad.descriptions,
        ad_group_ad.ad.app_ad.youtube_videos,
        metrics.impressions,
        metrics.clicks,
        metrics.ctr,
        metrics.average_cpc,
        metrics.cost_micros,
        metrics.conversions,
        metrics.video_views,
        metrics.video_view_rate
      FROM ad_group_ad
      WHERE ad_group.id = ${adGroupId}
        AND segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
        AND ad_group_ad.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 50
    `

    const rows = await queryGoogleAds(accessToken, customerId, query)

    const assets = rows.map(row => {
      const ad = row.adGroupAd?.ad || row.ad_group_ad?.ad || {}
      const metrics = row.metrics || {}
      const spend = Number(metrics.costMicros || metrics.cost_micros || 0) / 1_000_000
      const conv = Number(metrics.conversions || 0)
      const impr = Number(metrics.impressions || 0)
      const clicks = Number(metrics.clicks || 0)

      // Extract asset info
      const appAd = ad.appAd || ad.app_ad || {}
      const headlines = (appAd.headlines || []).map(h => h.text || h).filter(Boolean)
      const descriptions = (appAd.descriptions || []).map(d => d.text || d).filter(Boolean)
      const youtubeVideos = (appAd.youtubeVideos || appAd.youtube_videos || []).map(v => ({
        videoId: v.videoId || v.video_id || '',
        videoTitle: v.videoTitle || v.video_title || '',
        thumbnailUrl: v.videoId ? `https://img.youtube.com/vi/${v.videoId || v.video_id}/mqdefault.jpg` : null,
      })).filter(v => v.videoId)

      return {
        id: String(ad.id || ''),
        name: ad.name || `Ad ${ad.id}`,
        type: ad.type || '',
        status: row.adGroupAd?.status || row.ad_group_ad?.status || 'UNKNOWN',
        headlines: headlines.slice(0, 5),
        descriptions: descriptions.slice(0, 3),
        youtubeVideos,
        metrics: {
          impressions: impr,
          clicks,
          ctr: impr > 0 ? parseFloat((clicks / impr * 100).toFixed(2)) : 0,
          cpc: Math.round(Number(metrics.averageCpc || metrics.average_cpc || 0) / 1_000_000),
          spend: Math.round(spend),
          spendsGst: Math.round(spend * 1.18),
          conversions: Math.round(conv),
          cpa: conv > 0 ? Math.round(spend / conv) : 0,
          videoViews: Number(metrics.videoViews || metrics.video_views || 0),
          videoViewRate: parseFloat((Number(metrics.videoViewRate || metrics.video_view_rate || 0) * 100).toFixed(2)),
        }
      }
    })

    return res.status(200).json({ assets, adGroupId })

  } catch (e) {
    console.error('Assets API error:', e.message)
    // Return empty gracefully — UAC campaigns may not expose ad-level assets
    return res.status(200).json({ assets: [], error: e.message, adGroupId })
  }
}
