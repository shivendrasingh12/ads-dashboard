import { isGoogleConfigured, fetchGoogleCampaigns, fetchGoogleAdGroups } from '../../lib/googleAds'
import { isMetaConfigured, fetchMetaCampaigns, fetchMetaAdsets } from '../../lib/metaAds'
import { generateInsights } from '../../lib/recommendations'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { dateFrom, dateTo } = req.query
  if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom and dateTo required' })

  let campaigns = [], adGroups = [], ads = []

  if (isGoogleConfigured()) {
    try {
      const [gc, ga] = await Promise.all([
        fetchGoogleCampaigns(dateFrom, dateTo),
        fetchGoogleAdGroups(dateFrom, dateTo),
      ])
      campaigns.push(...gc)
      adGroups.push(...ga)
    } catch (e) { console.error('Google insights error:', e.message) }
  }

  if (isMetaConfigured()) {
    try {
      const [mc, ma] = await Promise.all([
        fetchMetaCampaigns(dateFrom, dateTo),
        fetchMetaAdsets(dateFrom, dateTo),
      ])
      campaigns.push(...mc)
      adGroups.push(...ma)
    } catch (e) { console.error('Meta insights error:', e.message) }
  }

  const insights = generateInsights(campaigns, adGroups, ads)
  return res.status(200).json({ insights, generatedAt: new Date().toISOString() })
}
