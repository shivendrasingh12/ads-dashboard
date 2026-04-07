/**
 * Chat API — Powers the dashboard chatbot
 * Fetches live campaign data and passes it as context to Claude
 */

import { isGoogleConfigured, fetchGoogleCampaigns, fetchGoogleAdGroups } from '../../lib/googleAds'
import { isMetaConfigured, fetchMetaCampaigns, fetchMetaAdsets } from '../../lib/metaAds'

async function getLiveData(dateFrom, dateTo) {
  const data = { campaigns: [], adgroups: [], errors: [] }

  if (isGoogleConfigured()) {
    try {
      const [camps, ags] = await Promise.all([
        fetchGoogleCampaigns(dateFrom, dateTo),
        fetchGoogleAdGroups(dateFrom, dateTo),
      ])
      data.campaigns.push(...camps)
      data.adgroups.push(...ags)
    } catch (e) { data.errors.push('Google: ' + e.message) }
  }

  if (isMetaConfigured()) {
    try {
      const [camps, ags] = await Promise.all([
        fetchMetaCampaigns(dateFrom, dateTo),
        fetchMetaAdsets(dateFrom, dateTo),
      ])
      data.campaigns.push(...camps)
      data.adgroups.push(...ags)
    } catch (e) { data.errors.push('Meta: ' + e.message) }
  }

  return data
}

function buildSystemPrompt(liveData, dateFrom, dateTo) {
  const totalSpend = liveData.campaigns.reduce((s, c) => s + (c.spend || 0), 0)
  const totalConv = liveData.campaigns.reduce((s, c) => s + (c.conversions || 0), 0)
  const avgCac = totalConv > 0 ? Math.round(totalSpend / totalConv) : 0

  const campSummary = liveData.campaigns
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 30)
    .map(c => `- ${c.name} [${c.platform.toUpperCase()}] | Status: ${c.status} | Spend: ₹${c.spend.toLocaleString('en-IN')} | CTR: ${c.ctr}% | CPC: ₹${c.cpc} | Conv: ${c.conversions} | CPA: ₹${c.cpa}`)
    .join('\n')

  const agSummary = liveData.adgroups
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 40)
    .map(a => `- [${a.campaign}] ${a.name} | Spend: ₹${a.spend.toLocaleString('en-IN')} | CTR: ${a.ctr}% | CPC: ₹${a.cpc} | Conv: ${a.conversions} | CPA: ₹${a.cpa}`)
    .join('\n')

  return `You are a senior performance marketing analyst embedded inside Porter's unified ads dashboard (Ads Command). Porter is a B2B logistics app in India — it connects businesses with truck drivers for intracity and intercity freight.

You have access to live campaign data from Google Ads and Meta Ads for the period ${dateFrom} to ${dateTo}.

ACCOUNT OVERVIEW (${dateFrom} to ${dateTo}):
- Total campaigns: ${liveData.campaigns.length} (Google: ${liveData.campaigns.filter(c => c.platform === 'google').length}, Meta: ${liveData.campaigns.filter(c => c.platform === 'meta').length})
- Total spend: ₹${totalSpend.toLocaleString('en-IN')}
- Total conversions: ${totalConv.toLocaleString('en-IN')}
- Avg CAC: ₹${avgCac}
- Active campaigns: ${liveData.campaigns.filter(c => c.status === 'active').length}
- Paused campaigns: ${liveData.campaigns.filter(c => c.status === 'paused').length}

TOP CAMPAIGNS BY SPEND:
${campSummary || 'No campaign data available'}

TOP AD GROUPS BY SPEND:
${agSummary || 'No adgroup data available'}

${liveData.errors.length > 0 ? 'DATA ERRORS: ' + liveData.errors.join(', ') : ''}

CONTEXT ABOUT PORTER'S MARKETING:
- UAC (Universal App Campaigns) on Google are the primary acquisition channel
- Funnel: Spend → Impressions → Clicks → Installs → Registrations → Customers
- Key metrics: CTR (click quality), Install Rate (store/creative quality), R2C (registration to customer conversion), CPR (cost per reg), CAC (cost per customer)
- Vehicle segments: 2W (two-wheelers), LCV, HCV, Micro LCV, Outstation
- Customer segments: SME (recurring business customers) vs Retail (one-time)
- Cities are tier-based (T1: Delhi, Mumbai, Bangalore; T2: smaller cities)
- Campaigns are often named by city: UAC_T1_Delhi_TCPA_CFO, UAC_ROI_Kochi_TCPA_CFO etc.

DASHBOARD FEATURES:
- Change Alerts: shows campaign changes and paused campaigns
- Schedule Reminders: set reminders for pausing/resuming campaigns
- Ads Analyser: drill into adsets and ads for any campaign
- UAC Funnel - ROI Cities: full funnel view (Media → App → Business) from Google Sheets
- UAC Funnel - Type 1: same view for Type 1 city campaigns

Your role: Answer questions about campaign performance, diagnose issues, suggest optimisations, explain metrics, and help the team make better decisions. Be concise but specific. Use ₹ for currency. When referencing campaigns, use their actual names from the data above. If asked about something not in the data, say so clearly.`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { messages, dateFrom, dateTo } = req.body
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' })

  const from = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const to = dateTo || new Date().toISOString().split('T')[0]

  try {
    // Fetch live data
    const liveData = await getLiveData(from, to)
    const systemPrompt = buildSystemPrompt(liveData, from, to)

    // Call Claude
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: systemPrompt,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)

    return res.status(200).json({
      reply: data.content[0].text,
      dataSnapshot: {
        campaigns: liveData.campaigns.length,
        adgroups: liveData.adgroups.length,
        totalSpend: liveData.campaigns.reduce((s, c) => s + (c.spend || 0), 0),
        period: `${from} → ${to}`,
      }
    })
  } catch (e) {
    console.error('Chat error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
