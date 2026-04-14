/**
 * Meta Funnel API — reads Meta_raw + ProcessedDataMeta tabs
 * Meta_raw: 0:Date 1:Campaign 2:Adset 3:Impressions 4:Clicks 5:Spend 6:Installs 7:Reg 8:Acq 9:City
 * ProcessedDataMeta: 0:GEO_ID 1:CITY 2:FREQ 3:CHANNEL 4:DATE 5:Regs 6:Custs 7:2W 8:LCV 9:HCV 10:MicroLCV 11:Out 12:SME 13:Retail
 */
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
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) { const [d,m,y] = str.split('-'); return new Date(`${y}-${m}-${d}`) }
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) { const [d,m,y] = str.split('/'); return new Date(`${y}-${m}-${d}`) }
  return new Date(str)
}

function toNum(v) { if (!v && v !== 0) return 0; const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? 0 : n }
function isoDate(d) { return d.toISOString().split('T')[0] }

function computeMetrics(r) {
  const spends = r.spends||0, spendsGst = parseFloat((spends*GST).toFixed(2))
  const impr = r.impressions||0, clicks = r.clicks||0, installs = r.installs||0
  const regs = r.registrations||0, custs = r.customers||0, smeReg = r.smeReg||0
  const cust2W = r.customers2W||0, custLCV = r.customersLCV||0, custHCV = r.customersHCV||0
  const custMLCV = r.customersMicroLCV||0, custOut = r.customersOutstation||0, custSME = r.customersSME||0
  return {
    spends: Math.round(spends), spendsGst: Math.round(spendsGst),
    impressions: Math.round(impr), cpm: impr > 0 ? parseFloat((spends/impr*1000).toFixed(2)) : 0,
    clicks: Math.round(clicks), ctr: impr > 0 ? parseFloat((clicks/impr*100).toFixed(2)) : 0,
    installs: Math.round(installs), iRate: clicks > 0 ? parseFloat((installs/clicks*100).toFixed(2)) : 0,
    registrations: Math.round(regs), cpr: regs > 0 ? Math.round(spends/regs) : 0,
    smeReg: Math.round(smeReg), retailReg: Math.round(regs - smeReg),
    customers: Math.round(custs), cac: custs > 0 ? Math.round(spends/custs) : 0,
    cacGst: custs > 0 ? Math.round(spendsGst/custs) : 0,
    r2c: regs > 0 ? parseFloat((custs/regs*100).toFixed(2)) : 0,
    smeRetails: Math.round(custSME), smePct: custs > 0 ? parseFloat((custSME/custs*100).toFixed(1)) : 0,
    twoW: Math.round(cust2W), twoWPct: custs > 0 ? parseFloat((cust2W/custs*100).toFixed(1)) : 0,
    lcvOutstation: Math.round(custLCV + custOut), hcv: Math.round(custHCV), microLCV: Math.round(custMLCV),
  }
}

function pctChange(c, p) { if (!p || p === 0) return null; return parseFloat(((c-p)/p*100).toFixed(1)) }

function getRating(val, all, lower = false) {
  const v = all.filter(x => x > 0); if (v.length < 2) return 'avg'
  const avg = v.reduce((a,b) => a+b, 0) / v.length; if (avg === 0) return 'avg'
  const r = val / avg
  if (lower) { if (r < 0.85) return 'good'; if (r > 1.2) return 'bad' }
  else { if (r > 1.15) return 'good'; if (r < 0.8) return 'bad' }
  return 'avg'
}

function addToAgg(agg, key, raw, proc) {
  if (!agg[key]) agg[key] = { spends:0, impressions:0, clicks:0, installs:0, registrations:0, customers:0, smeReg:0, customers2W:0, customersLCV:0, customersHCV:0, customersMicroLCV:0, customersOutstation:0, customersSME:0, customersRetail:0 }
  if (raw) { agg[key].spends += toNum(raw.cost); agg[key].impressions += toNum(raw.impressions); agg[key].clicks += toNum(raw.clicks); agg[key].installs += toNum(raw.installs) }
  if (proc) {
    agg[key].registrations += toNum(proc.registrations); agg[key].customers += toNum(proc.customers)
    agg[key].customers2W += toNum(proc.customers2W); agg[key].customersLCV += toNum(proc.customersLCV)
    agg[key].customersHCV += toNum(proc.customersHCV); agg[key].customersMicroLCV += toNum(proc.customersMicroLCV)
    agg[key].customersOutstation += toNum(proc.customersOutstation); agg[key].customersSME += toNum(proc.customersSME)
    agg[key].customersRetail += toNum(proc.customersRetail)
    if (proc.freqType === 'SME') agg[key].smeReg += toNum(proc.registrations)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const { dateFrom, dateTo } = req.query
  if (!dateFrom || !dateTo) return res.status(400).json({ error: 'dateFrom and dateTo required' })

  try {
    const SHEET_ID = req.query.sheetId || DEFAULT_SHEET_ID
    const accessToken = await getAccessToken()
    const [rawRows, procRows] = await Promise.all([
      fetchSheet(accessToken, SHEET_ID, 'Meta_raw!A:L'),
      fetchSheet(accessToken, SHEET_ID, 'ProcessedDataMeta!A:N'),
    ])

    const fromDate = new Date(dateFrom), toDate = new Date(dateTo)
    toDate.setHours(23, 59, 59)
    const duration = toDate - fromDate
    const priorToDate = new Date(fromDate - 1), priorFromDate = new Date(priorToDate - duration)

    const cityData = {}

    // Meta_raw: 0:Date 1:Campaign 2:Adset 3:Impressions 4:Clicks 5:Spend 6:Installs 9:City
    for (const row of rawRows.slice(1)) {
      if (row.length < 10) continue
      const date = parseDate(row[0]); if (!date) continue
      const city = (row[9] || '').trim(); if (!city) continue
      const isCurr = date >= fromDate && date <= toDate
      const isPrior = date >= priorFromDate && date <= priorToDate
      if (!isCurr && !isPrior) continue

      const adset = (row[2] || '').trim()
      if (!cityData[city]) cityData[city] = { current: { totals: {}, byAdgroup: {} }, prior: { totals: {}, byAdgroup: {} } }
      const period = isCurr ? 'current' : 'prior'
      const raw = { cost: row[5], impressions: row[3], clicks: row[4], installs: row[6] }
      addToAgg(cityData[city][period].totals, 'all', raw, null)
      addToAgg(cityData[city][period].byAdgroup, adset, raw, null)
    }

    // ProcessedDataMeta: 1:CITY 2:FREQ 3:CHANNEL 4:DATE 5:Regs 6:Custs 7-13:vehicle/segment
    for (const row of procRows.slice(1)) {
      if (row.length < 7) continue
      const date = parseDate(row[4]); if (!date) continue
      const city = (row[1] || '').trim(); if (!city) continue
      const isCurr = date >= fromDate && date <= toDate
      const isPrior = date >= priorFromDate && date <= priorToDate
      if (!isCurr && !isPrior) continue

      const freqType = (row[2] || '').trim()
      if (!cityData[city]) cityData[city] = { current: { totals: {}, byAdgroup: {} }, prior: { totals: {}, byAdgroup: {} } }
      const period = isCurr ? 'current' : 'prior'
      const proc = {
        registrations: row[5], customers: row[6], customers2W: row[7], customersLCV: row[8],
        customersHCV: row[9], customersMicroLCV: row[10], customersOutstation: row[11],
        customersSME: row[12], customersRetail: row[13], freqType,
      }
      addToAgg(cityData[city][period].totals, 'all', null, proc)
    }

    const result = []
    for (const city of Object.keys(cityData)) {
      const curr = cityData[city].current, prior = cityData[city].prior
      const currTotals = computeMetrics(curr.totals['all'] || {}), priorTotals = computeMetrics(prior.totals['all'] || {})
      if (currTotals.spends === 0 && currTotals.registrations === 0) continue
      const changes = {}; for (const k of Object.keys(currTotals)) changes[k] = pctChange(currTotals[k], priorTotals[k])

      const adgroupBreakdown = Object.entries(curr.byAdgroup).map(([name, raw]) => {
        const currM = computeMetrics(raw), priorM = computeMetrics(prior.byAdgroup[name] || {})
        const agCh = {}; for (const k of Object.keys(currM)) agCh[k] = pctChange(currM[k], priorM[k])
        return { adGroupId: name, adGroupName: name, metrics: currM, priorMetrics: priorM, changes: agCh }
      }).sort((a, b) => b.metrics.spends - a.metrics.spends)

      const agCtrs = adgroupBreakdown.map(a => a.metrics.ctr)
      const agIRates = adgroupBreakdown.map(a => a.metrics.iRate)
      const agCprs = adgroupBreakdown.map(a => a.metrics.cpr)
      const agCacs = adgroupBreakdown.map(a => a.metrics.cac)
      const rated = adgroupBreakdown.map(a => ({ ...a, ratings: {
        ctr: getRating(a.metrics.ctr, agCtrs, false), iRate: getRating(a.metrics.iRate, agIRates, false),
        cpr: getRating(a.metrics.cpr, agCprs, true), cac: getRating(a.metrics.cac, agCacs, true),
      }}))

      result.push({ city, current: currTotals, prior: priorTotals, changes, networkBreakdown: [], adgroupBreakdown: rated })
    }

    result.sort((a, b) => b.current.spends - a.current.spends)
    const allCurr = result.map(r => r.current)
    const finalResult = result.map(r => ({ ...r, ratings: {
      ctr: getRating(r.current.ctr, allCurr.map(m => m.ctr), false),
      iRate: getRating(r.current.iRate, allCurr.map(m => m.iRate), false),
      cpr: getRating(r.current.cpr, allCurr.map(m => m.cpr), true),
      cac: getRating(r.current.cac, allCurr.map(m => m.cac), true),
      r2c: getRating(r.current.r2c, allCurr.map(m => m.r2c), false),
      cpm: getRating(r.current.cpm, allCurr.map(m => m.cpm), true),
    }}))

    return res.status(200).json({
      data: finalResult, availableCities: finalResult.map(r => r.city),
      period: { dateFrom, dateTo, priorFrom: isoDate(priorFromDate), priorTo: isoDate(priorToDate) }
    })
  } catch (e) {
    console.error('Meta Funnel error:', e)
    return res.status(500).json({ error: e.message })
  }
}
