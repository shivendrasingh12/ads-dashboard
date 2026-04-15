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

function mapStatus(status) {
  if (!status) return 'unknown'
  const s = String(status).toUpperCase()
  if (s === 'ENABLED' || s === '2' || s.includes('ENABL')) return 'active'
  if (s === 'PAUSED' || s === '3' || s.includes('PAUS')) return 'paused'
  if (s === 'REMOVED' || s === '4' || s.includes('REMOV')) return 'removed'
  return 'unknown'
}

export default async function handler(req, res) {
  const { dateFrom, dateTo, level = 'campaigns', campaignId, adGroupId } = req.query

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_DEVELOPER_TOKEN || !process.env.GOOGLE_CUSTOMER_ID) {
    return res.status(200).json({ error: 'Google Ads not configured. Check env vars.' })
  }

  const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const to = dateTo || new Date().toISOString().slice(0, 10)

  try {
    const customer = getCustomer()

    /* ── CAMPAIGNS ── */
    if (level === 'campaigns') {
      const rows = await customer.query(`
        SELECT
          campaign.id, campaign.name, campaign.status,
          campaign.advertising_channel_type,
          metrics.cost_micros, metrics.impressions, metrics.clicks,
          metrics.conversions, metrics.video_views
        FROM campaign
        WHERE campaign.status != 'REMOVED'
          AND segments.date BETWEEN '${from}' AND '${to}'
        ORDER BY metrics.cost_micros DESC
        LIMIT 500
      `)

      const campaigns = {}
      for (const r of rows) {
        const id = String(r.campaign?.id ?? '')
        if (!id) continue
        if (!campaigns[id]) {
          campaigns[id] = {
            id, name: r.campaign?.name ?? '',
            status: mapStatus(r.campaign?.status),
            type: r.campaign?.advertising_channel_type || 'UNKNOWN',
            spend: 0, impressions: 0, clicks: 0, conversions: 0, videoViews: 0
          }
        }
        const c = campaigns[id]
        c.spend += Number(r.metrics?.cost_micros ?? 0) / 1e6
        c.impressions += Number(r.metrics?.impressions ?? 0)
        c.clicks += Number(r.metrics?.clicks ?? 0)
        c.conversions += Number(r.metrics?.conversions ?? 0)
        c.videoViews += Number(r.metrics?.video_views ?? 0)
      }

      const result = Object.values(campaigns).filter(c => c.spend > 0 || c.impressions > 0)
      result.sort((a, b) => b.spend - a.spend)
      return res.status(200).json({ campaigns: result })
    }

    /* ── AD GROUPS ── */
    if (level === 'adgroups') {
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' })

      const rows = await customer.query(`
        SELECT
          ad_group.id, ad_group.name, ad_group.status,
          metrics.cost_micros, metrics.impressions, metrics.clicks,
          metrics.conversions, metrics.video_views
        FROM ad_group
        WHERE campaign.id = ${campaignId}
          AND ad_group.status != 'REMOVED'
          AND segments.date BETWEEN '${from}' AND '${to}'
        ORDER BY metrics.cost_micros DESC
        LIMIT 200
      `)

      const adgroups = {}
      for (const r of rows) {
        const id = String(r.ad_group?.id ?? '')
        if (!id) continue
        if (!adgroups[id]) {
          adgroups[id] = {
            id, name: r.ad_group?.name ?? '',
            status: mapStatus(r.ad_group?.status),
            spend: 0, impressions: 0, clicks: 0, conversions: 0, videoViews: 0
          }
        }
        const ag = adgroups[id]
        ag.spend += Number(r.metrics?.cost_micros ?? 0) / 1e6
        ag.impressions += Number(r.metrics?.impressions ?? 0)
        ag.clicks += Number(r.metrics?.clicks ?? 0)
        ag.conversions += Number(r.metrics?.conversions ?? 0)
        ag.videoViews += Number(r.metrics?.video_views ?? 0)
      }

      const result = Object.values(adgroups).filter(a => a.spend > 0 || a.impressions > 0)
      result.sort((a, b) => b.spend - a.spend)
      return res.status(200).json({ adgroups: result })
    }

    /* ── ASSETS ── */
    if (level === 'assets') {
      if (!adGroupId) return res.status(400).json({ error: 'adGroupId required' })

      // 1. Get ad group ads with app_ad fields
      let adRows = []
      try {
        adRows = await customer.query(`
          SELECT
            ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type,
            ad_group_ad.ad.app_ad.headlines,
            ad_group_ad.ad.app_ad.descriptions,
            ad_group_ad.ad.app_ad.images,
            ad_group_ad.ad.app_ad.youtube_videos,
            ad_group_ad.status,
            metrics.cost_micros, metrics.impressions, metrics.clicks,
            metrics.conversions, metrics.video_views, metrics.interactions
          FROM ad_group_ad
          WHERE ad_group.id = ${adGroupId}
            AND ad_group_ad.status != 'REMOVED'
            AND segments.date BETWEEN '${from}' AND '${to}'
          ORDER BY metrics.cost_micros DESC
          LIMIT 200
        `)
      } catch (e) {
        console.error('Ad query error:', e.message)
        // Fallback without app_ad fields
        try {
          adRows = await customer.query(`
            SELECT
              ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type,
              ad_group_ad.status,
              metrics.cost_micros, metrics.impressions, metrics.clicks,
              metrics.conversions, metrics.video_views
            FROM ad_group_ad
            WHERE ad_group.id = ${adGroupId}
              AND ad_group_ad.status != 'REMOVED'
              AND segments.date BETWEEN '${from}' AND '${to}'
            ORDER BY metrics.cost_micros DESC
            LIMIT 200
          `)
        } catch (e2) { console.error('Ad fallback error:', e2.message) }
      }

      // 2. Get asset-level performance
      let assetRows = []
      try {
        assetRows = await customer.query(`
          SELECT
            asset.id, asset.name, asset.type,
            asset.image_asset.full_size.url,
            asset.youtube_video_asset.youtube_video_id,
            asset.youtube_video_asset.youtube_video_title,
            ad_group_ad_asset_view.performance_label,
            ad_group_ad_asset_view.field_type,
            metrics.cost_micros, metrics.impressions, metrics.clicks,
            metrics.conversions
          FROM ad_group_ad_asset_view
          WHERE ad_group.id = ${adGroupId}
            AND segments.date BETWEEN '${from}' AND '${to}'
          ORDER BY metrics.impressions DESC
          LIMIT 300
        `)
      } catch (e) {
        console.error('Asset view query error:', e.message)
      }

      // Process ads
      const ads = {}
      for (const r of adRows) {
        const id = String(r.ad_group_ad?.ad?.id ?? '')
        if (!id) continue
        if (!ads[id]) {
          const ad = r.ad_group_ad?.ad || {}
          ads[id] = {
            id, name: ad.name || `Ad ${id}`, type: ad.type || 'UNKNOWN',
            status: mapStatus(r.ad_group_ad?.status),
            headlines: (ad.app_ad?.headlines || []).map(h => h?.text || h).filter(Boolean),
            descriptions: (ad.app_ad?.descriptions || []).map(d => d?.text || d).filter(Boolean),
            images: (ad.app_ad?.images || []).map(img => img?.asset || img).filter(Boolean),
            youtubeVideos: (ad.app_ad?.youtube_videos || []).map(v => {
              const vid = v?.youtube_video_id || v?.asset || null
              return {
                videoId: vid,
                thumbnailUrl: vid ? `https://img.youtube.com/vi/${vid}/mqdefault.jpg` : null
              }
            }).filter(v => v.videoId),
            spend: 0, impressions: 0, clicks: 0, conversions: 0, videoViews: 0, interactions: 0
          }
        }
        const a = ads[id]
        a.spend += Number(r.metrics?.cost_micros ?? 0) / 1e6
        a.impressions += Number(r.metrics?.impressions ?? 0)
        a.clicks += Number(r.metrics?.clicks ?? 0)
        a.conversions += Number(r.metrics?.conversions ?? 0)
        a.videoViews += Number(r.metrics?.video_views ?? 0)
        a.interactions += Number(r.metrics?.interactions ?? 0)
      }

      // Process assets
      const assets = {}
      for (const r of assetRows) {
        const id = String(r.asset?.id ?? '')
        if (!id) continue
        if (!assets[id]) {
          assets[id] = {
            id, name: r.asset?.name || `Asset ${id}`,
            type: r.asset?.type || 'UNKNOWN',
            imageUrl: r.asset?.image_asset?.full_size?.url || null,
            youtubeVideoId: r.asset?.youtube_video_asset?.youtube_video_id || null,
            youtubeVideoTitle: r.asset?.youtube_video_asset?.youtube_video_title || null,
            performanceLabel: r.ad_group_ad_asset_view?.performance_label || 'UNSPECIFIED',
            fieldType: r.ad_group_ad_asset_view?.field_type || 'UNSPECIFIED',
            spend: 0, impressions: 0, clicks: 0, conversions: 0
          }
        }
        const a = assets[id]
        a.spend += Number(r.metrics?.cost_micros ?? 0) / 1e6
        a.impressions += Number(r.metrics?.impressions ?? 0)
        a.clicks += Number(r.metrics?.clicks ?? 0)
        a.conversions += Number(r.metrics?.conversions ?? 0)
      }

      return res.status(200).json({
        ads: Object.values(ads).filter(a => a.impressions > 0),
        assets: Object.values(assets).filter(a => a.impressions > 0)
      })
    }

    return res.status(400).json({ error: 'Invalid level. Use: campaigns, adgroups, assets' })

  } catch (e) {
    console.error('Google assets error:', e.message)
    return res.status(200).json({ error: 'Google Ads error: ' + e.message, campaigns: [], adgroups: [], ads: [], assets: [] })
  }
}
