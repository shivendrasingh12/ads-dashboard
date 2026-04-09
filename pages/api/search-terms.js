/**
 * Search Terms API — reads from Google Sheets "Raw Data" tab
 * Written by the Google Ads script (1_google_ads_data_pull.js)
 * Sheet columns: Last Updated, Campaign, Ad Group, Search Term, Theme,
 *                Spend, Clicks, Impressions, Conversions, CPA, CTR
 */

const FLAG_SPEND = 200
const HARDCODED_SHEET_ID = '1XOFTVfx1Jh--W4qenofqWENq9x1EyGAo5_Tkt8jz_8k'

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

async function fetchSheet(accessToken, sheetId, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`
  const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } })
  const data = await res.json()
  if (data.error) throw new Error(`Sheets error: ${data.error.message}`)
  return data.values || []
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { campaign: campaignFilter, theme: themeFilter, flaggedOnly } = req.query

  // Use env var, fall back to hardcoded sheet ID
  const sheetId = process.env.SEARCH_TERMS_SHEET_ID || HARDCODED_SHEET_ID

  try {
    const accessToken = await getAccessToken()
    const rows = await fetchSheet(accessToken, sheetId, 'Raw Data!A:K')

    if (rows.length < 2) {
      return res.status(200).json({
        terms: [], themeSummary: [],
        summary: { totalTerms: 0, totalSpend: 0, totalConversions: 0, avgCpa: 0, flaggedTerms: 0, wastedSpend: 0, wastedPct: 0 },
        lastUpdated: null,
        source: 'google_sheets',
      })
    }

    // Skip header row, parse each row
    // Cols: [0]Last Updated [1]Campaign [2]Ad Group [3]Search Term [4]Theme
    //       [5]Spend [6]Clicks [7]Impressions [8]Conversions [9]CPA [10]CTR
    let terms = rows.slice(1)
      .filter(row => row.length >= 6 && row[3]) // must have search term
      .map(row => ({
        lastUpdated:  row[0] || '',
        campaign:     row[1] || '',
        adGroup:      row[2] || '',
        searchTerm:   row[3] || '',
        theme:        row[4] || 'Other',
        spend:        Math.round(parseFloat(row[5]) || 0),
        clicks:       parseInt(row[6]) || 0,
        impressions:  parseInt(row[7]) || 0,
        conversions:  parseFloat(row[8]) || 0,
        cpa:          Math.round(parseFloat(row[9]) || 0),
        ctr:          parseFloat(row[10]) || 0,
      }))
      .map(t => ({ ...t, isFlagged: t.spend >= FLAG_SPEND && t.conversions === 0 }))

    // Apply filters
    if (campaignFilter) {
      const cf = campaignFilter.toLowerCase()
      terms = terms.filter(t => t.campaign.toLowerCase().includes(cf))
    }
    if (themeFilter && themeFilter !== 'All') {
      terms = terms.filter(t => t.theme === themeFilter)
    }
    if (flaggedOnly === 'true') {
      terms = terms.filter(t => t.isFlagged)
    }

    // Sort: flagged first, then by spend desc
    terms.sort((a, b) => {
      if (b.isFlagged !== a.isFlagged) return b.isFlagged ? 1 : -1
      return b.spend - a.spend
    })

    // Theme summary
    const themeMap = {}
    for (const t of terms) {
      if (!themeMap[t.theme]) themeMap[t.theme] = { theme: t.theme, spend: 0, clicks: 0, impressions: 0, conversions: 0, terms: 0, flagged: 0, wastedSpend: 0 }
      themeMap[t.theme].spend       += t.spend
      themeMap[t.theme].clicks      += t.clicks
      themeMap[t.theme].impressions += t.impressions
      themeMap[t.theme].conversions += t.conversions
      themeMap[t.theme].terms       += 1
      if (t.isFlagged) { themeMap[t.theme].flagged++; themeMap[t.theme].wastedSpend += t.spend }
    }

    const themeSummary = Object.values(themeMap)
      .map(t => ({
        ...t,
        cpa: t.conversions > 0 ? Math.round(t.spend / t.conversions) : 0,
        ctr: t.impressions > 0 ? parseFloat((t.clicks / t.impressions * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.spend - a.spend)

    const totalSpend   = terms.reduce((s, t) => s + t.spend, 0)
    const totalConv    = terms.reduce((s, t) => s + t.conversions, 0)
    const totalFlagged = terms.filter(t => t.isFlagged).length
    const totalWasted  = terms.filter(t => t.isFlagged).reduce((s, t) => s + t.spend, 0)
    const lastUpdated  = rows[1]?.[0] || null

    return res.status(200).json({
      terms: terms.slice(0, 2000),
      themeSummary,
      lastUpdated,
      source: 'google_sheets',
      summary: {
        totalTerms: terms.length,
        totalSpend,
        totalConversions: Math.round(totalConv),
        avgCpa: totalConv > 0 ? Math.round(totalSpend / totalConv) : 0,
        flaggedTerms: totalFlagged,
        wastedSpend: totalWasted,
        wastedPct: totalSpend > 0 ? parseFloat((totalWasted / totalSpend * 100).toFixed(1)) : 0,
      }
    })

  } catch (e) {
    console.error('Search terms error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}

