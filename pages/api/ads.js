import { isGoogleConfigured, fetchGoogleAds } from '../../lib/googleAds'
import { isMetaConfigured, fetchMetaAds } from '../../lib/metaAds'
import { getRecommendation } from '../../lib/recommendations'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { dateFrom, dateTo, platform, campaignFilter } = req.query

  if (!dateFrom || !dateTo) {
    return res.status(400).json({ error: 'dateFrom and dateTo are required' })
  }

  const results = { ads: [], errors: [] }

  if (platform !== 'meta') {
    if (isGoogleConfigured()) {
      try {
        const data = await fetchGoogleAds(dateFrom, dateTo, campaignFilter)
        results.ads.push(...data)
      } catch (e) {
        results.errors.push({ platform: 'google', message: e.message })
      }
    }
  }

  if (platform !== 'google') {
    if (isMetaConfigured()) {
      try {
        const data = await fetchMetaAds(dateFrom, dateTo, campaignFilter)
        results.ads.push(...data)
      } catch (e) {
        results.errors.push({ platform: 'meta', message: e.message })
      }
    }
  }

  const withConv = results.ads.filter(a => a.conversions > 0)
  const avgCpa = withConv.length > 0
    ? Math.round(withConv.reduce((s, a) => s + a.cpa, 0) / withConv.length)
    : null

  results.ads = results.ads.map(a => ({
    ...a,
    rec: getRecommendation(a, avgCpa),
  }))

  results.ads.sort((a, b) => b.spend - a.spend)

  return res.status(200).json(results)
}
