import https from 'https'

function graphGet(path, token) {
  const url = `https://graph.facebook.com/v21.0${path}${path.includes('?') ? '&' : '?'}access_token=${token}`
  return new Promise((resolve, reject) => {
    const u = new URL(url)
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search,
      method: 'GET'
    }, res => {
      let b = ''; res.on('data', d => b += d)
      res.on('end', () => {
        try { resolve(JSON.parse(b)) } catch { resolve(b) }
      })
    })
    req.on('error', reject)
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('timeout')) })
    req.end()
  })
}

function metaError(res, err) {
  const code = err?.error?.code || err?.code || 0
  const msg = err?.error?.message || err?.message || 'Unknown Meta error'
  const isTokenErr = code === 190 || msg.includes('access token') || msg.includes('Session has expired')

  return res.status(200).json({
    error: msg,
    errorCode: code,
    isTokenError: isTokenErr,
    setupInstructions: isTokenErr ? [
      '1. Go to https://developers.facebook.com/tools/explorer/',
      '2. Select your app from the dropdown',
      '3. Click "Generate Access Token"',
      '4. Grant permissions: ads_read, ads_management, read_insights',
      '5. Copy the new token',
      '6. Exchange for long-lived token: run `cd ~/Downloads/ads-dashboard && node --env-file=.env.local /tmp/meta-token.js`',
      '7. Update META_ACCESS_TOKEN in .env.local and Vercel env vars',
      '8. Redeploy'
    ] : [
      `Meta API error ${code}: ${msg}`,
      'Check your Meta Ad Account ID and permissions',
      'Ensure the app has ads_read permission'
    ]
  })
}

export default async function handler(req, res) {
  const { dateFrom, dateTo, level = 'campaigns', campaignId, adsetId } = req.query
  const token = process.env.META_ACCESS_TOKEN
  const accountId = process.env.META_AD_ACCOUNT_ID

  if (!token || !accountId) {
    return res.status(200).json({
      error: 'Meta credentials not configured',
      setupInstructions: [
        'Set META_ACCESS_TOKEN and META_AD_ACCOUNT_ID in .env.local',
        'META_AD_ACCOUNT_ID should include the "act_" prefix'
      ]
    })
  }

  const acctId = accountId.startsWith('act_') ? accountId : `act_${accountId}`
  const from = dateFrom || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const to = dateTo || new Date().toISOString().slice(0, 10)
  const timeRange = encodeURIComponent(JSON.stringify({ since: from, until: to }))

  try {
    if (level === 'campaigns') {
      const fields = 'id,name,status,objective,buying_type'
      const insightFields = 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,reach,frequency,actions'
      
      // Get campaigns
      const campData = await graphGet(
        `/${acctId}/campaigns?fields=${fields}&filtering=${encodeURIComponent(JSON.stringify([{field:'effective_status',operator:'IN',value:['ACTIVE']}]))}&limit=200`,
        token
      )
      if (campData.error) return metaError(res, campData)

      // Get campaign-level insights
      const insightData = await graphGet(
        `/${acctId}/insights?fields=${insightFields}&time_range=${timeRange}&level=campaign&limit=500`,
        token
      )

      const insightMap = {}
      if (insightData.data) {
        for (const row of insightData.data) {
          insightMap[row.campaign_id] = row
        }
      }

      const campaigns = (campData.data || []).map(c => {
        const ins = insightMap[c.id] || {}
        const installs = (ins.actions || []).find(a => a.action_type === 'app_install' || a.action_type === 'omni_app_install')
        const leads = (ins.actions || []).find(a => a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped')
        return {
          id: c.id, name: c.name, status: c.status,
          objective: c.objective || '',
          spend: Number(ins.spend || 0),
          impressions: Number(ins.impressions || 0),
          clicks: Number(ins.clicks || 0),
          ctr: Number(ins.ctr || 0),
          reach: Number(ins.reach || 0),
          installs: Number(installs?.value || 0),
          leads: Number(leads?.value || 0)
        }
      }).filter(c => c.spend > 0 || c.impressions > 0)
      
      campaigns.sort((a, b) => b.spend - a.spend)
      return res.status(200).json({ campaigns })
    }

    if (level === 'adsets') {
      if (!campaignId) return res.status(400).json({ error: 'campaignId required' })

      const fields = 'id,name,status,targeting,optimization_goal'
      const adsetData = await graphGet(
        `/${campaignId}/adsets?fields=${fields}&filtering=${encodeURIComponent(JSON.stringify([{field:'effective_status',operator:'IN',value:['ACTIVE']}]))}&limit=200`,
        token
      )
      if (adsetData.error) return metaError(res, adsetData)

      // Get adset insights
      const insightFields = 'adset_id,adset_name,spend,impressions,clicks,ctr,cpc,reach,frequency,actions'
      const insightData = await graphGet(
        `/${campaignId}/insights?fields=${insightFields}&time_range=${timeRange}&level=adset&limit=500`,
        token
      )

      const insightMap = {}
      if (insightData.data) {
        for (const row of insightData.data) {
          insightMap[row.adset_id] = row
        }
      }

      const adsets = (adsetData.data || []).map(a => {
        const ins = insightMap[a.id] || {}
        const installs = (ins.actions || []).find(act => act.action_type === 'app_install' || act.action_type === 'omni_app_install')
        return {
          id: a.id, name: a.name, status: a.status,
          optimizationGoal: a.optimization_goal || '',
          spend: Number(ins.spend || 0),
          impressions: Number(ins.impressions || 0),
          clicks: Number(ins.clicks || 0),
          ctr: Number(ins.ctr || 0),
          reach: Number(ins.reach || 0),
          installs: Number(installs?.value || 0)
        }
      })
      adsets.sort((a, b) => b.spend - a.spend)
      return res.status(200).json({ adsets })
    }

    if (level === 'ads') {
      if (!adsetId) return res.status(400).json({ error: 'adsetId required' })

      // Get ads with creative details
      const fields = 'id,name,status,creative{id,name,title,body,image_url,image_hash,thumbnail_url,video_id,object_story_spec,asset_feed_spec,effective_object_story_id}'
      const adData = await graphGet(
        `/${adsetId}/ads?fields=${fields}&filtering=${encodeURIComponent(JSON.stringify([{field:'effective_status',operator:'IN',value:['ACTIVE']}]))}&limit=200`,
        token
      )
      if (adData.error) return metaError(res, adData)

      // Get ad-level insights
      const insightFields = 'ad_id,ad_name,spend,impressions,clicks,ctr,cpc,reach,frequency,actions,cost_per_action_type,video_avg_time_watched_actions,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions'
      const insightData = await graphGet(
        `/${adsetId}/insights?fields=${insightFields}&time_range=${timeRange}&level=ad&limit=500`,
        token
      )

      const insightMap = {}
      if (insightData.data) {
        for (const row of insightData.data) {
          insightMap[row.ad_id] = row
        }
      }

      const ads = await Promise.all((adData.data || []).map(async (ad) => {
        const ins = insightMap[ad.id] || {}
        const creative = ad.creative || {}
        const installs = (ins.actions || []).find(a => a.action_type === 'app_install' || a.action_type === 'omni_app_install')
        const leads = (ins.actions || []).find(a => a.action_type === 'lead')
        const videoP25 = (ins.video_p25_watched_actions || [])[0]?.value || 0
        const videoP50 = (ins.video_p50_watched_actions || [])[0]?.value || 0
        const videoP75 = (ins.video_p75_watched_actions || [])[0]?.value || 0
        const videoP100 = (ins.video_p100_watched_actions || [])[0]?.value || 0

        // Try to get image/video URLs
        let imageUrl = creative.image_url || creative.thumbnail_url || null
        let videoId = creative.video_id || null
        let videoThumb = null
        let assetFeedImages = []
        let assetFeedVideos = []

        // Check asset_feed_spec for carousel/dynamic ads
        if (creative.asset_feed_spec) {
          const spec = creative.asset_feed_spec
          if (spec.images) assetFeedImages = spec.images.map(i => i.url || i.hash).filter(Boolean)
          if (spec.videos) assetFeedVideos = spec.videos.map(v => ({ id: v.video_id, thumbnail: v.thumbnail_url })).filter(v => v.id)
        }

        // Check object_story_spec
        if (!imageUrl && creative.object_story_spec) {
          const story = creative.object_story_spec
          if (story.video_data) {
            videoId = videoId || story.video_data.video_id
            imageUrl = imageUrl || story.video_data.image_url
          }
          if (story.link_data) {
            imageUrl = imageUrl || story.link_data.image_hash || story.link_data.picture
          }
        }

        // Fetch video thumbnail if we have a video_id
        if (videoId && !videoThumb) {
          try {
            const vidData = await graphGet(`/${videoId}?fields=thumbnails,source,title`, token)
            if (vidData.thumbnails?.data?.[0]) {
              videoThumb = vidData.thumbnails.data[0].uri
            }
            if (!imageUrl) imageUrl = videoThumb
          } catch {}
        }

        return {
          id: ad.id, name: ad.name, status: ad.status,
          creativeId: creative.id,
          creativeName: creative.name || '',
          title: creative.title || '',
          body: creative.body || '',
          imageUrl,
          videoId,
          videoThumb,
          assetFeedImages,
          assetFeedVideos,
          isVideo: !!videoId,
          spend: Number(ins.spend || 0),
          impressions: Number(ins.impressions || 0),
          clicks: Number(ins.clicks || 0),
          ctr: Number(ins.ctr || 0),
          reach: Number(ins.reach || 0),
          installs: Number(installs?.value || 0),
          leads: Number(leads?.value || 0),
          videoP25: Number(videoP25),
          videoP50: Number(videoP50),
          videoP75: Number(videoP75),
          videoP100: Number(videoP100),
          hookRate: ins.impressions > 0 ? ((Number(videoP25) / Number(ins.impressions)) * 100).toFixed(2) : 0,
          holdRate: Number(videoP25) > 0 ? ((Number(videoP100) / Number(videoP25)) * 100).toFixed(2) : 0
        }
      }))

      ads.sort((a, b) => b.spend - a.spend)
      return res.status(200).json({ ads })
    }

    return res.status(400).json({ error: 'Invalid level. Use: campaigns, adsets, ads' })
  } catch (e) {
    console.error('Meta assets error:', e.message)
    if (e.message?.includes('token') || e.message?.includes('OAuthException')) {
      return metaError(res, { error: { code: 190, message: e.message } })
    }
    return res.status(500).json({ error: e.message })
  }
}
