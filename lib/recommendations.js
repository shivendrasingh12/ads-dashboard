/**
 * Auto-generates performance recommendations based on metrics.
 * No AI API needed — pure rule-based logic your team can tune.
 */

/**
 * Score and recommend action for an ad group or ad
 * Returns: 'scale' | 'review' | 'pause' | 'kill'
 */
export function getRecommendation(row, accountAverageCpa = null) {
  const { ctr, cpa, conversions, spend, impressions } = row

  // Not enough data to judge
  if (impressions < 500) return 'review'
  if (spend === 0) return 'review'

  // Has conversions — check efficiency
  if (conversions > 0) {
    const cpaBenchmark = accountAverageCpa || 300
    if (cpa <= cpaBenchmark * 0.8 && ctr >= 2) return 'scale'
    if (cpa <= cpaBenchmark * 1.2) return 'review'
    if (cpa > cpaBenchmark * 2) return 'pause'
    return 'review'
  }

  // No conversions — check if spend is significant
  if (spend > 2000 && conversions === 0) return 'kill'
  if (spend > 500 && conversions === 0) return 'pause'
  return 'review'
}

/**
 * Generate plain-English insights for the insights tab
 */
export function generateInsights(campaigns, adGroups, ads) {
  const insights = []
  const today = new Date()

  // Find campaigns nearing budget
  const nearBudget = campaigns.filter(c =>
    c.budget > 0 && (c.spend / c.budget) > 0.9 && c.status === 'active'
  )
  if (nearBudget.length > 0) {
    insights.push({
      type: 'warn',
      text: `<strong>${nearBudget.length} campaign${nearBudget.length > 1 ? 's' : ''} above 90% budget utilisation</strong>: ${nearBudget.map(c => c.name).join(', ')}. Monitor closely or increase budgets.`,
    })
  }

  // Find highest CPA adgroups vs average
  const withConv = adGroups.filter(a => a.conversions > 0 && a.cpa > 0)
  if (withConv.length > 1) {
    const avgCpa = Math.round(withConv.reduce((s, a) => s + a.cpa, 0) / withConv.length)
    const highCpa = withConv.filter(a => a.cpa > avgCpa * 1.8)
    if (highCpa.length > 0) {
      insights.push({
        type: 'warn',
        text: `<strong>${highCpa.length} ad group${highCpa.length > 1 ? 's' : ''} with CPA ${'>'}1.8x account average</strong> (₹${avgCpa}): ${highCpa.map(a => a.name).join(', ')}. Consider pausing or restructuring.`,
      })
    }
  }

  // Find best performers
  const topCampaign = [...campaigns].filter(c => c.conversions > 0).sort((a, b) => a.cpa - b.cpa)[0]
  if (topCampaign && topCampaign.budget > 0) {
    const utilisation = Math.round((topCampaign.spend / topCampaign.budget) * 100)
    if (utilisation < 75) {
      insights.push({
        type: 'good',
        text: `<strong>${topCampaign.name}</strong> has the lowest CPA (₹${topCampaign.cpa}) and is only at ${utilisation}% budget utilisation — room to scale spend.`,
      })
    }
  }

  // Zero conversion spenders
  const noConvHighSpend = campaigns.filter(c =>
    c.conversions === 0 && c.spend > 1000 && c.status === 'active'
  )
  if (noConvHighSpend.length > 0) {
    insights.push({
      type: 'warn',
      text: `<strong>${noConvHighSpend.length} active campaign${noConvHighSpend.length > 1 ? 's' : ''} with zero conversions</strong> despite significant spend: ${noConvHighSpend.map(c => c.name).join(', ')}. Review targeting and landing pages.`,
    })
  }

  // Low CTR on Google search
  const lowCtrSearch = campaigns.filter(c =>
    c.platform === 'google' && c.ctr > 0 && c.ctr < 1.5 && c.impressions > 2000
  )
  if (lowCtrSearch.length > 0) {
    insights.push({
      type: 'info',
      text: `<strong>Low CTR ({'<'}1.5%) on Google search</strong>: ${lowCtrSearch.map(c => c.name).join(', ')}. Consider testing new headlines or improving ad relevance.`,
    })
  }

  // High frequency on Meta
  const highFreq = campaigns.filter(c =>
    c.platform === 'meta' && c.frequency > 3
  )
  if (highFreq.length > 0) {
    insights.push({
      type: 'warn',
      text: `<strong>Ad fatigue risk</strong>: ${highFreq.map(c => c.name).join(', ')} showing frequency ${'>'}3. Rotate creatives or expand audience.`,
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: 'good',
      text: 'No critical issues detected in the selected date range. All campaigns appear to be running within normal parameters.',
    })
  }

  return insights
}
