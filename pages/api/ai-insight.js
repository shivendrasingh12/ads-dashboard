export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  const { cityData } = req.body
  if (!cityData) return res.status(400).json({ error: 'cityData required' })

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are a senior performance marketing analyst for Porter, a B2B logistics and trucking app in India. Porter runs UAC (Universal App Campaigns) on Google to acquire customers — small business owners and individuals who book trucks/vehicles through the app.

The funnel is: Spend → Impressions → Clicks → Installs → Registrations → Customers
Key metrics: CTR (click quality from ads), Install Rate (store/creative quality), R2C (registration to customer conversion — measures onboarding quality), CPR (cost per registration), CAC (cost per customer acquisition).
Vehicle types: 2W (two-wheelers), LCV (light commercial vehicle), HCV (heavy), Micro LCV, Outstation.
Customer segments: SME (small business, recurring) vs Retail (one-time/low-frequency).

${cityData}

Write a sharp, analyst-level performance review with exactly these 3 sections. Be specific with numbers. No bullet points.

**Performance summary** (3-4 sentences): State the period, total spend with GST, customers acquired, and CAC with GST. Was performance better or worse vs prior period and by how much? Identify the single most important metric that changed and quantify it. If there's a positive story, lead with that.

**Root cause analysis** (3-4 sentences): Trace exactly where in the funnel the performance shifted. Did CTR change (ad/audience issue)? Did Install Rate change (store listing/creative)? Did R2C change (onboarding/product)? Name the specific networks and adgroups responsible with their actual numbers. Explain what this means.

**Way forward** (2-3 sentences): Give 2-3 specific, actionable recommendations. Name exact adgroups to pause or scale. Name which network to shift budget toward. If R2C dropped, call out the onboarding issue. Be direct.

Total: 180-220 words. Use ₹. Write as if presenting to a marketing director.`
        }]
      })
    })

    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    return res.status(200).json({ insight: data.content[0].text })
  } catch (e) {
    console.error('AI insight error:', e.message)
    return res.status(500).json({ error: e.message })
  }
}
