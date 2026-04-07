import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const isoDate = d => d.toISOString().split('T')[0]
const today = new Date()
const DEFAULT_FROM = isoDate(addDays(today, -30))
const DEFAULT_TO = isoDate(today)

const NETWORKS = ['Search', 'YouTube', 'Display', 'Search Partner']

const RATING_CLS = { good: 'rat-good', avg: 'rat-avg', bad: 'rat-bad' }
const RATING_LABEL = { good: 'Good', avg: 'Avg', bad: 'Low' }

function fmt(val, type) {
  if (val === undefined || val === null || val === 0) return '—'
  if (type === 'currency') return '₹' + Number(val).toLocaleString('en-IN')
  if (type === 'pct') return Number(val).toFixed(2) + '%'
  if (type === 'int') return Number(val).toLocaleString('en-IN')
  if (type === 'decimal') return Number(val).toFixed(1) + '%'
  return val
}

function Delta({ val }) {
  if (val === null || val === undefined) return <span style={{ color: 'var(--text3)', fontSize: 10 }}>—</span>
  const color = val > 0 ? '#3B6D11' : val < 0 ? '#A32D2D' : '#888780'
  const arrow = val > 0 ? '↑' : val < 0 ? '↓' : '→'
  return (
    <span style={{ color, fontSize: 10, fontWeight: 500 }}>
      {arrow}{Math.abs(val).toFixed(1)}%
    </span>
  )
}

function MetricCell({ value, type, delta, rating, highlight }) {
  return (
    <td style={{ padding: '8px 10px', verticalAlign: 'middle', background: highlight ? 'rgba(58,107,17,0.04)' : 'transparent' }}>
      <div style={{ fontVariantNumeric: 'tabular-nums', fontSize: 13, fontWeight: 500 }}>{fmt(value, type)}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
        {delta !== undefined && <Delta val={delta} />}
        {rating && <span className={`rat-badge ${RATING_CLS[rating]}`} style={{ fontSize: 9 }}>{RATING_LABEL[rating]}</span>}
      </div>
    </td>
  )
}

function InsightPanel({ data }) {
  if (!data || data.length === 0) return null

  const insights = []

  // Find cities with dropping CTR
  const ctrDroppers = data.filter(r => r.changes.ctr !== null && r.changes.ctr < -15)
  if (ctrDroppers.length > 0) {
    insights.push({
      type: 'warn',
      text: `CTR drop ${'>'}15% vs prior period: <strong>${ctrDroppers.map(r => r.city).join(', ')}</strong>. Check creative fatigue or audience overlap.`
    })
  }

  // Find cities with dropping install rate
  const iRateDroppers = data.filter(r => r.changes.iRate !== null && r.changes.iRate < -15)
  if (iRateDroppers.length > 0) {
    insights.push({
      type: 'warn',
      text: `Install rate dropped ${'>'}15% in <strong>${iRateDroppers.map(r => r.city).join(', ')}</strong>. Check store listing, landing page, or app issues.`
    })
  }

  // Find cities with dropping R2C
  const r2cDroppers = data.filter(r => r.changes.r2c !== null && r.changes.r2c < -10)
  if (r2cDroppers.length > 0) {
    insights.push({
      type: 'warn',
      text: `R2C dropped ${'>'}10% in <strong>${r2cDroppers.map(r => r.city).join(', ')}</strong>. Registration-to-customer conversion weakening — check onboarding flow.`
    })
  }

  // Find cities with rising CAC
  const cacRisers = data.filter(r => r.changes.cac !== null && r.changes.cac > 20)
  if (cacRisers.length > 0) {
    insights.push({
      type: 'warn',
      text: `CAC increased ${'>'}20% in <strong>${cacRisers.map(r => r.city).join(', ')}</strong>. Either CPR rose or R2C dropped — check both.`
    })
  }

  // Best performers
  const bestR2C = [...data].filter(r => r.current.r2c > 0).sort((a, b) => b.current.r2c - a.current.r2c)[0]
  if (bestR2C) {
    insights.push({
      type: 'good',
      text: `Best R2C: <strong>${bestR2C.city}</strong> at ${bestR2C.current.r2c.toFixed(1)}% — study what's working here and replicate to other cities.`
    })
  }

  // Low performers by CAC
  const badRating = data.filter(r => r.ratings.cac === 'bad' && r.current.cac > 0)
  if (badRating.length > 0) {
    insights.push({
      type: 'warn',
      text: `High CAC vs peers: <strong>${badRating.map(r => `${r.city} (₹${r.current.cac})`).join(', ')}</strong>. Review bidding strategy and audience quality.`
    })
  }

  if (insights.length === 0) {
    insights.push({ type: 'good', text: 'All cities performing within normal range vs prior period.' })
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
        Auto insights · vs prior period
      </div>
      {insights.map((ins, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 10px', background: ins.type === 'warn' ? '#FAEEDA' : '#EAF3DE', borderRadius: 6, marginBottom: 6, fontSize: 12, lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, fontWeight: 700, color: ins.type === 'warn' ? '#BA7517' : '#3B6D11' }}>{ins.type === 'warn' ? '⚠' : '✓'}</span>
          <span style={{ color: ins.type === 'warn' ? '#633806' : '#27500A' }} dangerouslySetInnerHTML={{ __html: ins.text }} />
        </div>
      ))}
    </div>
  )
}

export default function UACFunnel() {
  const [dateFrom, setDateFrom] = useState(DEFAULT_FROM)
  const [dateTo, setDateTo] = useState(DEFAULT_TO)
  const [selectedNetworks, setSelectedNetworks] = useState([])
  const [cityFilter, setCityFilter] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(null)
  const [sortKey, setSortKey] = useState('spends')
  const [sortDir, setSortDir] = useState('desc')
  const [view, setView] = useState('funnel') // funnel | network | vehicle

  function load() {
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({
      dateFrom, dateTo,
      ...(selectedNetworks.length > 0 ? { networks: selectedNetworks.join(',') } : {}),
    }).toString()
    fetch(`/api/uac-funnel?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d.data || [])
        setPeriod(d.period)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  function toggleNetwork(n) {
    setSelectedNetworks(prev =>
      prev.includes(n) ? prev.filter(x => x !== n) : [...prev, n]
    )
  }

  function handleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = (data || []).filter(r =>
    !cityFilter || r.city.toLowerCase().includes(cityFilter.toLowerCase())
  ).sort((a, b) => {
    const av = a.current[sortKey] || 0
    const bv = b.current[sortKey] || 0
    return sortDir === 'desc' ? bv - av : av - bv
  })

  function SortTh({ label, k }) {
    const active = sortKey === k
    return (
      <th onClick={() => handleSort(k)} style={{ cursor: 'pointer', whiteSpace: 'nowrap', userSelect: 'none', background: active ? 'rgba(55,138,221,0.08)' : 'var(--bg2)' }}>
        {label} {active ? (sortDir === 'desc' ? '↓' : '↑') : ''}
      </th>
    )
  }

  // Totals row
  const totals = filtered.reduce((acc, r) => {
    const m = r.current
    Object.keys(m).forEach(k => { acc[k] = (acc[k] || 0) + m[k] })
    return acc
  }, {})
  if (totals.impressions > 0) {
    totals.ctr = parseFloat((totals.clicks / totals.impressions * 100).toFixed(2))
    totals.cpm = parseFloat((totals.spends / totals.impressions * 1000).toFixed(2))
  }
  if (totals.clicks > 0) totals.iRate = parseFloat((totals.installs / totals.clicks * 100).toFixed(2))
  if (totals.registrations > 0) {
    totals.cpr = Math.round(totals.spends / totals.registrations)
    totals.r2c = parseFloat((totals.customers / totals.registrations * 100).toFixed(2))
    totals.smePct = parseFloat((totals.smeReg / totals.registrations * 100).toFixed(1))
  }
  if (totals.customers > 0) {
    totals.cac = Math.round(totals.spends / totals.customers)
    totals.twoWPct = parseFloat((totals.twoW / totals.customers * 100).toFixed(1))
    totals.smePct = parseFloat(((totals.smeRetails || 0) / totals.customers * 100).toFixed(1))
  }

  return (
    <>
      <Head><title>UAC Full Funnel — Ads Command</title></Head>
      <div style={{ minHeight: '100vh', background: 'var(--bg3)', fontFamily: 'system-ui, sans-serif', color: 'var(--color-text-primary, #1a1a18)' }}>

        {/* Header */}
        <div style={{ background: 'var(--bg, #fff)', borderBottom: '0.5px solid var(--border, rgba(0,0,0,0.1))', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ fontSize: 12, color: '#378ADD', textDecoration: 'none' }}>← Dashboard</a>
          <span style={{ color: 'var(--border, rgba(0,0,0,0.2))' }}>|</span>
          <span style={{ fontWeight: 500, fontSize: 15 }}>UAC Full Funnel Analyser</span>
          <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>
            {period && `vs prior: ${period.priorFrom} → ${period.priorTo}`}
          </span>
        </div>

        {/* Controls */}
        <div style={{ background: 'var(--bg, #fff)', borderBottom: '0.5px solid var(--border, rgba(0,0,0,0.1))', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8f7f5', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 6, padding: '4px 8px' }}>
            <span style={{ fontSize: 11, color: '#888' }}>From</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: 12, outline: 'none', cursor: 'pointer' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8f7f5', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 6, padding: '4px 8px' }}>
            <span style={{ fontSize: 11, color: '#888' }}>To</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontSize: 12, outline: 'none', cursor: 'pointer' }} />
          </div>

          {/* Network filter */}
          <div style={{ display: 'flex', gap: 5 }}>
            {NETWORKS.map(n => (
              <div key={n}
                onClick={() => toggleNetwork(n)}
                style={{ fontSize: 11, padding: '4px 9px', borderRadius: 5, cursor: 'pointer', border: '0.5px solid', borderColor: selectedNetworks.includes(n) ? '#378ADD' : 'rgba(0,0,0,0.12)', background: selectedNetworks.includes(n) ? '#E6F1FB' : 'transparent', color: selectedNetworks.includes(n) ? '#0C447C' : '#888' }}>
                {n}
              </div>
            ))}
          </div>

          {/* City search */}
          <input
            style={{ fontSize: 12, padding: '5px 10px', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 6, background: '#f8f7f5', outline: 'none', width: 140 }}
            placeholder="Filter city..."
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
          />

          <button onClick={load}
            style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
            {loading ? 'Loading...' : 'Apply'}
          </button>

          {/* View toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', border: '0.5px solid rgba(0,0,0,0.1)', borderRadius: 6, overflow: 'hidden' }}>
            {[['funnel', 'Full Funnel'], ['vehicle', 'Vehicle Mix']].map(([v, l]) => (
              <div key={v} onClick={() => setView(v)}
                style={{ fontSize: 11, padding: '5px 10px', cursor: 'pointer', background: view === v ? '#E6F1FB' : 'transparent', color: view === v ? '#0C447C' : '#888', fontWeight: view === v ? 500 : 400 }}>
                {l}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px' }}>
          {error && (
            <div style={{ background: '#FCEBEB', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 13, color: '#501313' }}>
              Error: {error}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: 40, color: '#888', fontSize: 13 }}>
              Loading funnel data from Google Sheets...
            </div>
          )}

          {!loading && data && (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0,1fr))', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Total Spend', value: fmt(totals.spends, 'currency') },
                  { label: 'Impressions', value: fmt(totals.impressions, 'int') },
                  { label: 'Avg CTR', value: fmt(totals.ctr, 'pct') },
                  { label: 'Installs', value: fmt(totals.installs, 'int') },
                  { label: 'Registrations', value: fmt(totals.registrations, 'int') },
                  { label: 'Customers', value: fmt(totals.customers, 'int') },
                  { label: 'Avg CAC', value: fmt(totals.cac, 'currency') },
                ].map(m => (
                  <div key={m.label} style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', border: '0.5px solid rgba(0,0,0,0.08)' }}>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{m.label}</div>
                    <div style={{ fontSize: 17, fontWeight: 500 }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <InsightPanel data={filtered} />

              {/* Main table */}
              <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  {view === 'funnel' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8f7f5', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                          {/* Section headers */}
                          <th rowSpan={2} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: '#888', minWidth: 100 }}>City</th>
                          <th colSpan={3} style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10, color: '#185FA5', background: '#E6F1FB', borderBottom: '0.5px solid #B5D4F4' }}>MEDIA</th>
                          <th colSpan={3} style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10, color: '#534AB7', background: '#EEEDFE', borderBottom: '0.5px solid #CECBF6' }}>APP FUNNEL</th>
                          <th colSpan={4} style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10, color: '#0F6E56', background: '#E1F5EE', borderBottom: '0.5px solid #9FE1CB' }}>BUSINESS</th>
                          <th colSpan={2} style={{ padding: '4px 8px', textAlign: 'center', fontSize: 10, color: '#993C1D', background: '#FAECE7', borderBottom: '0.5px solid #F5C4B3' }}>MIX</th>
                        </tr>
                        <tr style={{ background: '#f8f7f5', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                          <SortTh label="Spends" k="spends" />
                          <SortTh label="CPM" k="cpm" />
                          <SortTh label="CTR" k="ctr" />
                          <SortTh label="Installs" k="installs" />
                          <SortTh label="I Rate" k="iRate" />
                          <SortTh label="CPR" k="cpr" />
                          <SortTh label="Regs" k="registrations" />
                          <SortTh label="Custs" k="customers" />
                          <SortTh label="CAC" k="cac" />
                          <SortTh label="R2C" k="r2c" />
                          <SortTh label="SME%" k="smePct" />
                          <SortTh label="2W%" k="twoWPct" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.length === 0 && (
                          <tr><td colSpan={13} style={{ textAlign: 'center', padding: 32, color: '#888', fontSize: 13 }}>No data found for selected filters</td></tr>
                        )}
                        {filtered.map((r, i) => {
                          const m = r.current
                          const ch = r.changes
                          const rt = r.ratings
                          return (
                            <tr key={r.city} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: i % 2 === 0 ? '#fff' : '#fafaf9' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 500, fontSize: 13 }}>{r.city}</td>
                              <MetricCell value={m.spends} type="currency" delta={ch.spends} />
                              <MetricCell value={m.cpm} type="currency" delta={ch.cpm} rating={rt.cpm} />
                              <MetricCell value={m.ctr} type="pct" delta={ch.ctr} rating={rt.ctr} />
                              <MetricCell value={m.installs} type="int" delta={ch.installs} />
                              <MetricCell value={m.iRate} type="pct" delta={ch.iRate} rating={rt.iRate} />
                              <MetricCell value={m.cpr} type="currency" delta={ch.cpr} rating={rt.cpr} />
                              <MetricCell value={m.registrations} type="int" delta={ch.registrations} />
                              <MetricCell value={m.customers} type="int" delta={ch.customers} />
                              <MetricCell value={m.cac} type="currency" delta={ch.cac} rating={rt.cac} />
                              <MetricCell value={m.r2c} type="pct" delta={ch.r2c} rating={rt.r2c} />
                              <MetricCell value={m.smePct} type="decimal" delta={ch.smePct} />
                              <MetricCell value={m.twoWPct} type="decimal" delta={ch.twoWPct} />
                            </tr>
                          )
                        })}
                        {/* Totals row */}
                        <tr style={{ borderTop: '2px solid rgba(0,0,0,0.1)', background: '#f8f7f5', fontWeight: 500 }}>
                          <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600 }}>Total ({filtered.length} cities)</td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13, fontWeight: 600 }}>{fmt(totals.spends, 'currency')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.cpm, 'currency')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.ctr, 'pct')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.installs, 'int')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.iRate, 'pct')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.cpr, 'currency')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.registrations, 'int')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.customers, 'int')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.cac, 'currency')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.r2c, 'pct')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.smePct, 'decimal')}</span></td>
                          <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 13 }}>{fmt(totals.twoWPct, 'decimal')}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  )}

                  {view === 'vehicle' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8f7f5', borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                          <th style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 500, fontSize: 11, color: '#888' }}>City</th>
                          <SortTh label="Spends" k="spends" />
                          <SortTh label="Customers" k="customers" />
                          <SortTh label="CAC" k="cac" />
                          <SortTh label="2W" k="twoW" />
                          <SortTh label="2W %" k="twoWPct" />
                          <SortTh label="LCV+Out" k="lcvOutstation" />
                          <SortTh label="HCV" k="hcv" />
                          <SortTh label="Micro LCV" k="microLCV" />
                          <SortTh label="SME" k="smeRetails" />
                          <SortTh label="SME %" k="smePct" />
                          <SortTh label="R2C" k="r2c" />
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r, i) => {
                          const m = r.current
                          const ch = r.changes
                          return (
                            <tr key={r.city} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.06)', background: i % 2 === 0 ? '#fff' : '#fafaf9' }}>
                              <td style={{ padding: '8px 10px', fontWeight: 500 }}>{r.city}</td>
                              <MetricCell value={m.spends} type="currency" delta={ch.spends} />
                              <MetricCell value={m.customers} type="int" delta={ch.customers} />
                              <MetricCell value={m.cac} type="currency" delta={ch.cac} />
                              <MetricCell value={m.twoW} type="int" delta={ch.twoW} />
                              <MetricCell value={m.twoWPct} type="decimal" delta={ch.twoWPct} />
                              <MetricCell value={m.lcvOutstation} type="int" delta={ch.lcvOutstation} />
                              <MetricCell value={m.hcv} type="int" delta={ch.hcv} />
                              <MetricCell value={m.microLCV} type="int" delta={ch.microLCV} />
                              <MetricCell value={m.smeRetails} type="int" delta={ch.smeRetails} />
                              <MetricCell value={m.smePct} type="decimal" delta={ch.smePct} />
                              <MetricCell value={m.r2c} type="pct" delta={ch.r2c} />
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#aaa', marginTop: 10, textAlign: 'center' }}>
                Data from Google Sheets · ↑↓ arrows show % change vs prior period · ratings are relative to peers in same view
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
        .rat-badge { font-size: 10px; padding: 1px 5px; border-radius: 3px; font-weight: 500; white-space: nowrap; }
        .rat-good { background: #EAF3DE; color: #27500A; }
        .rat-avg { background: #F1EFE8; color: #444441; }
        .rat-bad { background: #FCEBEB; color: #501313; }
        thead th { font-weight: 500; color: #888; padding: 6px 10px; text-align: left; font-size: 11px; white-space: nowrap; }
        tbody tr:hover { background: #f5f5f3 !important; }
      `}</style>
    </>
  )
}
