const DEFAULT_SHEET_ID = process.env.GOOGLE_SHEET_ID || '1JEKQDoQ6ESUFcbLefsHclI2XXOD8xCQBQ1UmlsN6nCo'
const GST = 1.18

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

function parseDate(str) {
  if (!str) return null
  str = str.trim()
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split('-')
    return new Date(`${y}-${m}-${d}`)
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/')
    return new Date(`${y}-${m}-${d}`)
  }
  return new Date(str)
}

function toNum(val) {
  if (!val && val !== 0) return 0
  const n = parseFloat(String(val).replace(/,/g, ''))
  return isNaN(n) ? 0 : n
}

function isoDate(d) { return d.toISOString().split('T')[0] }

function computeMetrics(r) {
  const spends = r.spends || 0
  const spendsGst = parseFloat((spends * GST).toFixed(2))
  const impr = r.impressions || 0
  const clicks = r.clicks || 0
  const installs = r.installs || 0
  const regs = r.registrations || 0
  const custs = r.customers || 0
  const smeReg = r.smeReg || 0
  const cust2W = r.customers2W || 0
  const custLCV = r.customersLCV || 0
  const custHCV = r.customersHCV || 0
  const custMLCV = r.customersMicroLCV || 0
  const custOut = r.customersOutstation || 0
  const custSME = r.customersSME || 0

  return {
    spends: Math.round(spends),
    spendsGst: Math.round(spendsGst),
    impressions: Math.round(impr),
    cpm: impr > 0 ? parseFloat((spends / impr * 1000).toFixed(2)) : 0,
    clicks: Math.round(clicks),
    ctr: impr > 0 ? parseFloat((clicks / impr * 100).toFixed(2)) : 0,
    installs: Math.round(installs),
    iRate: clicks > 0 ? parseFloat((installs / clicks * 100).toFixed(2)) : 0,
    registrations: Math.round(regs),
    cpr: regs > 0 ? Math.round(spends / regs) : 0,
    smeReg: Math.round(smeReg),
    retailReg: Math.round(regs - smeReg),
    customers: Math.round(custs),
    cac: custs > 0 ? Math.round(spends / custs) : 0,
    cacGst: custs > 0 ? Math.round(spendsGst / custs) : 0,
    r2c: regs > 0 ? parseFloat((custs / regs * 100).toFixed(2)) : 0,
    smeRetails: Math.round(custSME),
    smePct: custs > 0 ? parseFloat((custSME / custs * 100).toFixed(1)) : 0,
    twoW: Math.round(cust2W),
    twoWPct: custs > 0 ? parseFloat((cust2W / custs * 100).toFixed(1)) : 0,
    lcvOutstation: Math.round(custLCV + custOut),
    hcv: Math.round(custHCV),
    microLCV: Math.round(custMLCV),
  }
}

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null
  return parseFloat(((curr - prev) / prev * 100).toFixed(1))
}

function getRating(val, allVals, lowerIsBetter = false) {
  const valid = allVals.filter(v => v > 0)
  if (valid.length < 2) return 'avg'
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length
  if (avg === 0) return 'avg'
  const ratio = val / avg
  if (lowerIsBetter) {
    if (ratio < 0.85) return 'good'
    if (ratio > 1.2) return 'bad'
  } else {
    if (ratio > 1.15) return 'good'
    if (ratio < 0.8) return 'bad'
  }
  return 'avg'
}

function addToAgg(agg, key, raw, proc) {
  if (!agg[key]) agg[key] = { spends: 0, impressions: 0, clicks: 0, installs: 0, registrations: 0, customers: 0, smeReg: 0, customers2W: 0, customersLCV: 0, customersHCV: 0, customersMicroLCV: 0, customersOutstation: 0, customersSME: 0, customersRetail: 0 }
  if (raw) {
    agg[key].spends += toNum(raw.cost)
    agg[key].impressions += toNum(raw.impressions)
    agg[key].clicks += toNum(raw.clicks)
    agg[key].installs += toNum(raw.installs)
  }
  if (proc) {
    agg[key].registrations += toNum(proc.registrations)
    agg[key].customers += toNum(proc.customers)
    agg[key].customers2W += toNum(proc.customers2W)
    agg[key].customersLCV += toNum(proc.customersLCV)
    agg[key].customersHCV += toNum(proc.customersHCV)
    agg[key].customersMicroLCV += toNum(proc.customersMicroLCV)
    agg[key].customersOutstation += toNum(proc.customersOutstation)
    agg[key].customersSME += toNum(proc.customersSME)
    agg[key].customersRetail += toNum(proc.customersRetail)
    if (proc.freqType === 'SME') agg[key].smeReg += toNum(proc.registrations)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { dateFrom, dateTo, networks, cities } = req.query
  if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom and dateTo required' })

  try {
    const SHEET_ID = req.query.sheetId || DEFAULT_SHEET_ID
    const accessToken = await getAccessToken()
    const [rawRows, procRows] = await Promise.all([
      fetchSheet(accessToken, SHEET_ID, 'Google_raw!A:W'),
      fetchSheet(accessToken, SHEET_ID, 'ProcessedData!A:S'),
    ])

    const fromDate = new Date(dateFrom)
    const toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59)
    const duration = toDate - fromDate
    const priorToDate = new Date(fromDate - 1)
    const priorFromDate = new Date(priorToDate - duration)

    const networkFilter = networks ? networks.split(',').map(n => n.trim().toLowerCase()) : null

    function matchNet(network) {
      if (!networkFilter || networkFilter.length === 0) return true
      const n = (network || '').toLowerCase()
      return networkFilter.some(f => n.includes(f) || f.includes(n))
    }

    // Build adgroup name lookup from Google_raw: adGroupId -> adGroupName
    const agNameMap = {}

    // Aggregate structures
    // city -> { current/prior -> { totals, byNetwork, byAdgroup } }
    const cityData = {}

    // Process Google_raw rows
    for (const row of rawRows.slice(1)) {
      if (row.length < 13) continue
      const date = parseDate(row[1])
      if (!date) continue
      const city = (row[12] || '').trim()
      if (!city) continue
      const network = row[2] || ''
      if (!matchNet(network)) continue
      const campaignType = (row[11] || '').toUpperCase()
      if (!campaignType.includes('UAC') && !campaignType.includes('APP')) continue

      const isCurr = date >= fromDate && date <= toDate
      const isPrior = date >= priorFromDate && date <= priorToDate
      if (!isCurr && !isPrior) continue

      // Store adgroup name mapping
      const agId = row[5] || ''
      const agName = row[6] || ''
      if (agId && agName) agNameMap[agId] = agName

      if (!cityData[city]) cityData[city] = {
        current: { totals: {}, byNetwork: {}, byAdgroup: {} },
        prior: { totals: {}, byNetwork: {}, byAdgroup: {} }
      }

      const period = isCurr ? 'current' : 'prior'
      const raw = { cost: row[9], impressions: row[7], clicks: row[8], installs: row[10] }

      addToAgg(cityData[city][period].totals, 'all', raw, null)
      addToAgg(cityData[city][period].byNetwork, network, raw, null)
      addToAgg(cityData[city][period].byAdgroup, agId, raw, null)
    }

    // Process ProcessedData rows
    for (const row of procRows.slice(1)) {
      if (row.length < 12) continue
      const date = parseDate(row[7])
      if (!date) continue
      const city = (row[1] || '').trim()
      if (!city) continue
      const network = row[8] || ''
      if (!matchNet(network)) continue

      const isCurr = date >= fromDate && date <= toDate
      const isPrior = date >= priorFromDate && date <= priorToDate
      if (!isCurr && !isPrior) continue

      const agId = row[6] || ''
      const freqType = (row[2] || '').trim()

      if (!cityData[city]) cityData[city] = {
        current: { totals: {}, byNetwork: {}, byAdgroup: {} },
        prior: { totals: {}, byNetwork: {}, byAdgroup: {} }
      }

      const period = isCurr ? 'current' : 'prior'
      const proc = {
        registrations: row[10], customers: row[11],
        customers2W: row[12], customersLCV: row[13],
        customersHCV: row[14], customersMicroLCV: row[15],
        customersOutstation: row[16], customersSME: row[17],
        customersRetail: row[18], freqType,
      }

      addToAgg(cityData[city][period].totals, 'all', null, proc)
      addToAgg(cityData[city][period].byNetwork, network, null, proc)
      addToAgg(cityData[city][period].byAdgroup, agId, null, proc)
    }

    // Build result
    const result = []
    for (const city of Object.keys(cityData)) {
      const curr = cityData[city].current
      const prior = cityData[city].prior

      const currTotals = computeMetrics(curr.totals['all'] || {})
      const priorTotals = computeMetrics(prior.totals['all'] || {})

      if (currTotals.spends === 0 && currTotals.registrations === 0) continue

      const changes = {}
      for (const k of Object.keys(currTotals)) {
        changes[k] = pctChange(currTotals[k], priorTotals[k])
      }

      // Network breakdown current
      const networkBreakdown = Object.entries(curr.byNetwork).map(([net, raw]) => ({
        network: net,
        metrics: computeMetrics(raw),
      })).sort((a, b) => b.metrics.spends - a.metrics.spends)

      // Adgroup breakdown current - match name from agNameMap
      const adgroupBreakdown = Object.entries(curr.byAdgroup).map(([agId, raw]) => ({
        adGroupId: agId,
        adGroupName: agNameMap[agId] || agId,
        metrics: computeMetrics(raw),
      })).sort((a, b) => b.metrics.spends - a.metrics.spends)

      // Adgroup ratings
      const agCtrs = adgroupBreakdown.map(a => a.metrics.ctr)
      const agIRates = adgroupBreakdown.map(a => a.metrics.iRate)
      const agCprs = adgroupBreakdown.map(a => a.metrics.cpr)
      const agCacs = adgroupBreakdown.map(a => a.metrics.cac)

      const adgroupBreakdownRated = adgroupBreakdown.map(a => ({
        ...a,
        ratings: {
          ctr: getRating(a.metrics.ctr, agCtrs, false),
          iRate: getRating(a.metrics.iRate, agIRates, false),
          cpr: getRating(a.metrics.cpr, agCprs, true),
          cac: getRating(a.metrics.cac, agCacs, true),
        }
      }))

      result.push({
        city,
        current: currTotals,
        prior: priorTotals,
        changes,
        networkBreakdown,
        adgroupBreakdown: adgroupBreakdownRated,
      })
    }

    result.sort((a, b) => b.current.spends - a.current.spends)

    // City-level ratings
    const allCurr = result.map(r => r.current)
    const finalResult = result.map(r => ({
      ...r,
      ratings: {
        ctr: getRating(r.current.ctr, allCurr.map(m => m.ctr), false),
        iRate: getRating(r.current.iRate, allCurr.map(m => m.iRate), false),
        cpr: getRating(r.current.cpr, allCurr.map(m => m.cpr), true),
        cac: getRating(r.current.cac, allCurr.map(m => m.cac), true),
        r2c: getRating(r.current.r2c, allCurr.map(m => m.r2c), false),
        cpm: getRating(r.current.cpm, allCurr.map(m => m.cpm), true),
      }
    }))

    return res.status(200).json({
      data: finalResult,
      availableCities: finalResult.map(r => r.city),
      period: { dateFrom, dateTo, priorFrom: isoDate(priorFromDate), priorTo: isoDate(priorToDate) }
    })

  } catch (e) {
    console.error('UAC Funnel error:', e)
    return res.status(500).json({ error: e.message })
  }
}
