import { isGoogleConfigured, fetchGoogleCampaigns } from '../../lib/googleAds'
import { isMetaConfigured, fetchMetaCampaigns } from '../../lib/metaAds'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { dateFrom, dateTo, platform } = req.query
  if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom and dateTo are required' })

  const results = { campaigns: [], errors: [] }

  if (platform !== 'meta') {
    if (isGoogleConfigured()) {
      try {
        const google = await fetchGoogleCampaigns(dateFrom, dateTo)
        // Only include campaigns that had spend OR impressions in the date range
        results.campaigns.push(...google.filter(c => c.spend > 0 || c.impressions > 0))
      } catch (e) {
        results.errors.push({ platform: 'google', message: e.message })
      }
    }
  }

  if (platform !== 'google') {
    if (isMetaConfigured()) {
      try {
        const meta = await fetchMetaCampaigns(dateFrom, dateTo)
        results.campaigns.push(...meta.filter(c => c.spend > 0 || c.impressions > 0))
      } catch (e) {
        results.errors.push({ platform: 'meta', message: e.message })
      }
    }
  }

  results.campaigns.sort((a, b) => b.spend - a.spend)
  results.summary = computeSummary(results.campaigns)
  return res.status(200).json(results)
}

function computeSummary(campaigns) {
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
  const totalImpr = campaigns.reduce((s, c) => s + c.impressions, 0)
  const totalConv = campaigns.reduce((s, c) => s + c.conversions, 0)
  return {
    totalSpend, totalClicks, totalImpressions: totalImpr, totalConversions: totalConv,
    avgCtr: totalImpr > 0 ? parseFloat(((totalClicks / totalImpr) * 100).toFixed(2)) : 0,
    avgCpc: totalClicks > 0 ? Math.round(totalSpend / totalClicks) : 0,
    avgCpa: totalConv > 0 ? Math.round(totalSpend / totalConv) : 0,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalCampaigns: campaigns.length,
  }
}
