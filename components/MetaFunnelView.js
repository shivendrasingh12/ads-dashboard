import { useState, useEffect, useRef } from 'react'

// Meta has no network breakdown

const ALL_COLS = [
  { key: 'spends',        label: 'Spends',       type: 'currency', s: 'media', rev: false, default: true  },
  { key: 'spendsGst',     label: 'Spends+GST',   type: 'currency', s: 'media', rev: false, default: true  },
  { key: 'customers',     label: 'Customers',    type: 'int',      s: 'biz',   rev: false, default: true  },
  { key: 'cacGst',        label: 'CAC+GST',      type: 'currency', s: 'biz',   r: 'cac',  rev: true,  default: true  },
  { key: 'cpm',           label: 'CPM',          type: 'currency', s: 'media', r: 'cpm',  rev: true,  default: false },
  { key: 'impressions',   label: 'Impressions',  type: 'int',      s: 'media', rev: false, default: false },
  { key: 'clicks',        label: 'Clicks',       type: 'int',      s: 'media', rev: false, default: false },
  { key: 'ctr',           label: 'CTR',          type: 'pct',      s: 'media', r: 'ctr',  rev: false, default: false },
  { key: 'installs',      label: 'Installs',     type: 'int',      s: 'app',   rev: false, default: false },
  { key: 'iRate',         label: 'Install Rate', type: 'pct',      s: 'app',   r: 'iRate',rev: false, default: false },
  { key: 'cpr',           label: 'CPR',          type: 'currency', s: 'app',   r: 'cpr',  rev: true,  default: false },
  { key: 'registrations', label: 'Registrations',type: 'int',      s: 'biz',   rev: false, default: false },
  { key: 'smeReg',        label: 'SME Reg',      type: 'int',      s: 'biz',   rev: false, default: false },
  { key: 'retailReg',     label: 'Retail Reg',   type: 'int',      s: 'biz',   rev: false, default: false },
  { key: 'cac',           label: 'CAC',          type: 'currency', s: 'biz',   r: 'cac',  rev: true,  default: false },
  { key: 'r2c',           label: 'R2C',          type: 'pct',      s: 'biz',   r: 'r2c',  rev: false, default: false },
  { key: 'smePct',        label: 'SME%',         type: 'decimal',  s: 'mix',   rev: false, default: false },
  { key: 'twoWPct',       label: '2W%',          type: 'decimal',  s: 'mix',   rev: false, default: false },
]

const CHART_METRICS = ALL_COLS.filter(c => ['spends','spendsGst','customers','cacGst','ctr','iRate','registrations','r2c','cpr','cac'].includes(c.key))

const SECTIONS = {
  media: { label: 'Media',      color: '#0C447C' },
  app:   { label: 'App Funnel', color: '#3C3489' },
  biz:   { label: 'Business',   color: '#085041' },
  mix:   { label: 'Mix',        color: '#4A1B0C' },
}

function fmt(val, type) {
  if (!val && val !== 0) return '—'
  if (val === 0) return '—'
  if (type === 'currency') return '₹' + Number(val).toLocaleString('en-IN')
  if (type === 'pct') return Number(val).toFixed(2) + '%'
  if (type === 'int') return Number(val).toLocaleString('en-IN')
  if (type === 'decimal') return Number(val).toFixed(1) + '%'
  return val
}

function Delta({ val, rev }) {
  if (val === null || val === undefined) return null
  const good = rev ? val < 0 : val > 0
  const color = val === 0 ? '#888' : good ? '#3B6D11' : '#A32D2D'
  return <span style={{ color, fontSize: 10, fontWeight: 500 }}>{val > 0 ? '↑' : '↓'}{Math.abs(val).toFixed(1)}%</span>
}

function RatBadge({ rating }) {
  if (!rating || rating === 'avg') return null
  return rating === 'good'
    ? <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--green-bg)', color: 'var(--green-text)', fontWeight: 600, marginLeft: 3 }}>▲</span>
    : <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--red-bg)', color: 'var(--red-text)', fontWeight: 600, marginLeft: 3 }}>▼</span>
}

// Column picker dropdown
function ColPicker({ activeCols, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const extras = ALL_COLS.filter(c => !c.default)
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(!open)}
        style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: '0.5px solid var(--border)', background: open ? '#E6F1FB' : 'var(--bg)', color: open ? '#0C447C' : 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
        + Columns
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 8, padding: 8, marginTop: 4, minWidth: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          {Object.keys(SECTIONS).map(s => {
            const cols = extras.filter(c => c.s === s)
            if (!cols.length) return null
            return (
              <div key={s} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: SECTIONS[s].color, textTransform: 'uppercase', letterSpacing: '.05em', padding: '2px 4px', marginBottom: 4 }}>{SECTIONS[s].label}</div>
                {cols.map(c => (
                  <div key={c.key} onClick={() => onChange(c.key)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 6px', borderRadius: 5, cursor: 'pointer', background: activeCols.includes(c.key) ? '#E6F1FB' : 'transparent', marginBottom: 1 }}
                    onMouseOver={e => { if (!activeCols.includes(c.key)) e.currentTarget.style.background = 'var(--bg2)' }}
                    onMouseOut={e => { if (!activeCols.includes(c.key)) e.currentTarget.style.background = 'transparent' }}>
                    <div style={{ width: 14, height: 14, border: `1.5px solid ${activeCols.includes(c.key) ? '#378ADD' : 'var(--border)'}`, borderRadius: 3, background: activeCols.includes(c.key) ? '#378ADD' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {activeCols.includes(c.key) && <span style={{ color: '#fff', fontSize: 9, lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text)' }}>{c.label}</span>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Bar chart: current vs prior for selected metrics
function CompareChart({ current, prior, chartMetrics }) {
  if (!current || !prior) return null
  const metrics = CHART_METRICS.filter(m => chartMetrics.includes(m.key))
  if (!metrics.length) return null

  return (
    <div style={{ padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Current vs prior period</div>
      {metrics.map(m => {
        const curr = current[m.key] || 0
        const prev = prior[m.key] || 0
        const maxVal = Math.max(curr, prev, 1)
        const currPct = Math.round((curr / maxVal) * 100)
        const prevPct = Math.round((prev / maxVal) * 100)
        const change = prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : null
        const goodChange = m.rev ? parseFloat(change) < 0 : parseFloat(change) > 0
        return (
          <div key={m.key} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text2)' }}>{m.label}</span>
              {change !== null && (
                <span style={{ fontSize: 11, fontWeight: 500, color: goodChange ? '#3B6D11' : '#A32D2D' }}>
                  {parseFloat(change) > 0 ? '↑' : '↓'}{Math.abs(parseFloat(change))}%
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)', width: 40, flexShrink: 0 }}>Current</span>
                <div style={{ flex: 1, height: 14, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: currPct + '%', height: '100%', background: '#378ADD', borderRadius: 3, transition: 'width .4s ease' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right', color: 'var(--text)' }}>{fmt(curr, m.type)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--text3)', width: 40, flexShrink: 0 }}>Prior</span>
                <div style={{ flex: 1, height: 14, background: 'var(--bg3)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: prevPct + '%', height: '100%', background: '#B4B2A9', borderRadius: 3 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'right', color: 'var(--text3)' }}>{fmt(prev, m.type)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Metric picker for chart
function ChartMetricPicker({ selected, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '8px 14px', borderBottom: '0.5px solid var(--border)' }}>
      <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginRight: 2 }}>Chart:</span>
      {CHART_METRICS.map(m => (
        <div key={m.key} onClick={() => onChange(m.key)}
          style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', border: '0.5px solid', borderColor: selected.includes(m.key) ? '#378ADD' : 'var(--border)', background: selected.includes(m.key) ? '#E6F1FB' : 'transparent', color: selected.includes(m.key) ? '#0C447C' : 'var(--text3)', userSelect: 'none' }}>
          {m.label}
        </div>
      ))}
    </div>
  )
}

// AI insight panel
function InsightPanel({ row, period }) {
  const [insight, setInsight] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    const curr = row.current; const prior = row.prior; const ch = row.changes
    const funnelIssues = []
    if (ch.ctr !== null && ch.ctr < -10) funnelIssues.push(`CTR dropped ${Math.abs(ch.ctr).toFixed(1)}% to ${curr.ctr}%`)
    if (ch.iRate !== null && ch.iRate < -10) funnelIssues.push(`Install Rate dropped ${Math.abs(ch.iRate).toFixed(1)}% to ${curr.iRate}%`)
    if (ch.r2c !== null && ch.r2c < -10) funnelIssues.push(`R2C dropped ${Math.abs(ch.r2c).toFixed(1)}% to ${curr.r2c}%`)
    if (ch.cac !== null && ch.cac > 15) funnelIssues.push(`CAC rose ${ch.cac.toFixed(1)}% to ₹${curr.cac}`)

    const dataContext = `CITY: ${row.city} | PERIOD: ${period.dateFrom} to ${period.dateTo} | PRIOR: ${period.priorFrom} to ${period.priorTo}
CURRENT: Spend ₹${curr.spends} (GST: ₹${curr.spendsGst}) | CTR ${curr.ctr}% | I Rate ${curr.iRate}% | Regs ${curr.registrations} | Custs ${curr.customers} | CAC ₹${curr.cac} (GST: ₹${curr.cacGst}) | R2C ${curr.r2c}% | CPR ₹${curr.cpr}
PRIOR: Spend ₹${prior.spends} | CTR ${prior.ctr}% | I Rate ${prior.iRate}% | Custs ${prior.customers} | CAC ₹${prior.cac} | R2C ${prior.r2c}%
CHANGES: Spend ${ch.spends}% | CTR ${ch.ctr}% | IRate ${ch.iRate}% | Regs ${ch.registrations}% | Custs ${ch.customers}% | CAC ${ch.cac}% | R2C ${ch.r2c}%
FUNNEL ISSUES: ${funnelIssues.length ? funnelIssues.join(', ') : 'None significant'}
ADSETS (top 6 by spend): ${row.adgroupBreakdown.filter(a => a.metrics.spends > 0).slice(0, 6).map(a => `${a.adGroupName}: ₹${a.metrics.spends}, CTR ${a.metrics.ctr}%, IRate ${a.metrics.iRate}%, Custs ${a.metrics.customers}, Rating(CTR:${a.ratings.ctr},IRate:${a.ratings.iRate},CAC:${a.ratings.cac})`).join(' | ')}`

    try {
      const r = await fetch('/api/ai-insight', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cityData: dataContext }) })
      const d = await r.json()
      if (d.error) throw new Error(d.error)
      setInsight(d.insight)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  if (!insight && !loading && !error) {
    return (
      <div style={{ padding: '10px 14px' }}>
        <button onClick={generate} style={{ fontSize: 11, padding: '5px 12px', borderRadius: 5, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          Generate AI insight
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '10px 14px' }}>
      {loading && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Analysing {row.city}...</div>}
      {error && <div style={{ fontSize: 12, color: '#A32D2D' }}>{error}</div>}
      {insight && (
        <>
          <div style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text)' }}
            dangerouslySetInnerHTML={{ __html: insight.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n\n/g, '</p><p style="margin-top:8px">').replace(/\n/g, '<br/>') }} />
          <button onClick={() => { setInsight(null); generate() }}
            style={{ marginTop: 8, fontSize: 10, padding: '3px 8px', borderRadius: 4, border: '0.5px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
            Regenerate
          </button>
        </>
      )}
    </div>
  )
}

// Expanded city detail — Option C split view
function CityDetail({ row, period, chartMetrics, onChartMetricToggle }) {
  const agRows = row.adgroupBreakdown.filter(a => a.metrics.spends > 0)
  const netRows = row.networkBreakdown.filter(n => n.metrics.spends > 0)

  return (
    <tr>
      <td colSpan={100} style={{ padding: 0 }}>
        <div style={{ border: '0.5px solid var(--border)', borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden', background: 'var(--bg)' }}>
          <ChartMetricPicker selected={chartMetrics} onChange={onChartMetricToggle} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', borderTop: '0.5px solid var(--border)' }}>
            {/* LEFT: Insight + chart + prior */}
            <div style={{ borderRight: '0.5px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '0.5px solid var(--border)' }}>AI Insight</div>
              <InsightPanel row={row} period={period} />

              <div style={{ borderTop: '0.5px solid var(--border)' }}>
                <CompareChart current={row.current} prior={row.prior} chartMetrics={chartMetrics} />
              </div>

              <div style={{ borderTop: '0.5px solid var(--border)', padding: '10px 14px', background: 'var(--bg2)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Prior period · {period.priorFrom} → {period.priorTo}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Spends+GST', key: 'spendsGst', type: 'currency' },
                    { label: 'CTR', key: 'ctr', type: 'pct' },
                    { label: 'Install Rate', key: 'iRate', type: 'pct' },
                    { label: 'Customers', key: 'customers', type: 'int' },
                    { label: 'CAC+GST', key: 'cacGst', type: 'currency' },
                    { label: 'R2C', key: 'r2c', type: 'pct' },
                  ].map(m => (
                    <div key={m.key} style={{ background: 'var(--bg)', borderRadius: 6, padding: '7px 9px', border: '0.5px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{m.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums', opacity: 0.7 }}>{fmt(row.prior[m.key], m.type)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Network cards + adgroup table */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 600, color: '#0C447C', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '0.5px solid var(--border)' }}>
                Network breakdown · current vs prior period
              </div>
              <div style={{ padding: '10px 14px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, borderBottom: '0.5px solid var(--border)' }}>
                {netRows.map(n => {
                  const NET_METRICS = [
                    { label: 'Spend+GST', key: 'spendsGst', type: 'currency', rev: false },
                    { label: 'I Rate', key: 'iRate', type: 'pct', rev: false },
                    { label: 'CAC+GST', key: 'cacGst', type: 'currency', rev: true },
                    { label: 'CTR', key: 'ctr', type: 'pct', rev: false },
                    { label: 'Custs', key: 'customers', type: 'int', rev: false },
                    { label: 'R2C', key: 'r2c', type: 'pct', rev: false },
                  ]
                  return (
                    <div key={n.network} style={{ background: 'var(--bg2)', borderRadius: 6, padding: '9px 11px', border: '0.5px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>{n.network}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                        {NET_METRICS.map(m => {
                          const curr = n.metrics[m.key]
                          const prev = n.priorMetrics?.[m.key]
                          const chg = n.changes?.[m.key]
                          const good = chg !== null && chg !== undefined ? (m.rev ? chg < 0 : chg > 0) : null
                          return (
                            <div key={m.key}>
                              <div style={{ fontSize: 9, color: 'var(--text3)', marginBottom: 1 }}>{m.label}</div>
                              <div style={{ fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(curr, m.type)}</div>
                              {prev > 0 && (
                                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                                  <span>{fmt(prev, m.type)}</span>
                                  {chg !== null && chg !== undefined && (
                                    <span style={{ fontWeight: 500, color: good ? 'var(--green)' : 'var(--red)' }}>
                                      {chg > 0 ? '↑' : '↓'}{Math.abs(chg).toFixed(1)}%
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {netRows.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', gridColumn: '1/-1' }}>No network data</div>}
              </div>

              <div style={{ padding: '8px 14px 4px', fontSize: 10, fontWeight: 600, color: '#534AB7', textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: '0.5px solid var(--border)' }}>
                Adsets · {agRows.length} active
              </div>
              <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg2)' }}>
                      {['Adset','Spend+GST','CTR','I Rate','Regs','Custs','CAC+GST','R2C'].map(h => (
                        <th key={h} style={{ padding: '5px 9px', textAlign: h === 'Adgroup' ? 'left' : 'right', fontSize: 10, color: 'var(--text3)', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '0.5px solid var(--border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agRows.length === 0 && <tr><td colSpan={8} style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text3)' }}>No adset data</td></tr>}
                    {agRows.map(a => {
                      const bad = a.ratings.ctr === 'bad' || a.ratings.iRate === 'bad' || a.ratings.cac === 'bad'
                      const AG_COLS = [
                        { key: 'spendsGst', type: 'currency', r: null, rev: false },
                        { key: 'ctr', type: 'pct', r: 'ctr', rev: false },
                        { key: 'iRate', type: 'pct', r: 'iRate', rev: false },
                        { key: 'registrations', type: 'int', r: null, rev: false },
                        { key: 'customers', type: 'int', r: null, rev: false },
                        { key: 'cacGst', type: 'currency', r: 'cac', rev: true },
                        { key: 'r2c', type: 'pct', r: 'r2c', rev: false },
                      ]
                      return (
                        <tr key={a.adGroupId} style={{ borderBottom: '0.5px solid var(--border)', background: bad ? 'rgba(162,45,45,0.04)' : 'transparent' }}>
                          <td style={{ padding: '6px 9px', fontWeight: 500, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {a.adGroupName}
                            {bad && <span style={{ fontSize: 9, marginLeft: 5, color: '#A32D2D', background: 'var(--red-bg)', padding: '1px 4px', borderRadius: 3 }}>⚠</span>}
                          </td>
                          {AG_COLS.map(col => {
                            const curr = a.metrics[col.key]
                            const prev = a.priorMetrics?.[col.key]
                            const chg = a.changes?.[col.key]
                            const good = chg !== null && chg !== undefined ? (col.rev ? chg < 0 : chg > 0) : null
                            return (
                              <td key={col.key} style={{ padding: '6px 9px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                                  <span style={{ fontSize: 12, fontWeight: 600 }}>{fmt(curr, col.type)}</span>
                                  {col.r && a.ratings[col.r] !== 'avg' && (
                                    <span style={{ fontSize: 9, padding: '1px 3px', borderRadius: 3, background: a.ratings[col.r] === 'good' ? 'var(--green-bg)' : 'var(--red-bg)', color: a.ratings[col.r] === 'good' ? 'var(--green-text)' : 'var(--red-text)', fontWeight: 600 }}>
                                      {a.ratings[col.r] === 'good' ? '▲' : '▼'}
                                    </span>
                                  )}
                                </div>
                                {prev > 0 && (
                                  <div style={{ fontSize: 10, textAlign: 'right', marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}>
                                    <span style={{ color: 'var(--text3)' }}>{fmt(prev, col.type)}</span>
                                    {chg !== null && chg !== undefined && (
                                      <span style={{ fontWeight: 500, color: good ? 'var(--green)' : 'var(--red)' }}>
                                        {chg > 0 ? '↑' : '↓'}{Math.abs(chg).toFixed(1)}%
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

// Main city row
function CityRow({ row, period, activeCols, chartMetrics, onChartMetricToggle }) {
  const [expanded, setExpanded] = useState(false)
  const cols = ALL_COLS.filter(c => activeCols.includes(c.key))

  return (
    <>
      <tr style={{ borderBottom: '0.5px solid var(--border)', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <td style={{ padding: '9px 12px', fontWeight: 500, fontSize: 13, position: 'sticky', left: 0, background: 'var(--bg)', zIndex: 1, whiteSpace: 'nowrap', borderBottom: '0.5px solid var(--border)' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', marginRight: 6, display: 'inline-block', transition: 'transform .15s', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>
          {row.city}
        </td>
        {cols.map(c => {
          const val = row.current[c.key]
          const delta = row.changes[c.key]
          const rating = c.r ? row.ratings[c.r] : undefined
          return (
            <td key={c.key} style={{ padding: '9px 10px', whiteSpace: 'nowrap', borderBottom: '0.5px solid var(--border)' }}>
              <div style={{ fontSize: 13, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fmt(val, c.type)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                {delta !== null && delta !== undefined && <Delta val={delta} rev={c.rev} />}
                {rating && <RatBadge rating={rating} />}
              </div>
            </td>
          )
        })}
      </tr>
      {expanded && <CityDetail row={row} period={period} chartMetrics={chartMetrics} onChartMetricToggle={onChartMetricToggle} />}
    </>
  )
}

export default function MetaFunnelView({ filters, sheetId, title }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(null)
  const [citySearch, setCitySearch] = useState('')
  const [activeCols, setActiveCols] = useState(ALL_COLS.filter(c => c.default).map(c => c.key))
  const [chartMetrics, setChartMetrics] = useState(['spendsGst', 'customers', 'cacGst'])

  function load() {
    setLoading(true); setError(null)
    const qs = new URLSearchParams({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      ...(sheetId ? { sheetId } : {}),
    }).toString()
    fetch(`/api/meta-funnel?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d.data || []); setPeriod(d.period); setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load() }, [filters.dateFrom, filters.dateTo, sheetId])

  function toggleCol(key) {
    const isDefault = ALL_COLS.find(c => c.key === key)?.default
    if (isDefault) return
    setActiveCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function toggleChartMetric(key) {
    setChartMetrics(prev => {
      if (prev.includes(key)) return prev.length > 1 ? prev.filter(k => k !== key) : prev
      if (prev.length >= 4) return prev
      return [...prev, key]
    })
  }


  const filtered = (data || []).filter(r => {
    const cm = !citySearch || r.city.toLowerCase().includes(citySearch.toLowerCase())
    const cf = !filters.campaign || r.city.toLowerCase().includes(filters.campaign)
    return cm && cf
  })

  const T = filtered.reduce((acc, r) => {
    Object.keys(r.current).forEach(k => { acc[k] = (acc[k] || 0) + (r.current[k] || 0) })
    return acc
  }, {})
  if (T.impressions > 0) { T.ctr = parseFloat((T.clicks / T.impressions * 100).toFixed(2)); T.cpm = parseFloat((T.spends / T.impressions * 1000).toFixed(2)) }
  if (T.clicks > 0) T.iRate = parseFloat((T.installs / T.clicks * 100).toFixed(2))
  if (T.registrations > 0) { T.cpr = Math.round(T.spends / T.registrations); T.r2c = parseFloat((T.customers / T.registrations * 100).toFixed(2)) }
  if (T.customers > 0) { T.cac = Math.round(T.spends / T.customers); T.cacGst = Math.round(T.spends * 1.18 / T.customers); T.spendsGst = Math.round(T.spends * 1.18) }

  const displayCols = ALL_COLS.filter(c => activeCols.includes(c.key))

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input style={{ fontSize: 12, padding: '5px 9px', border: '0.5px solid var(--border)', borderRadius: 6, background: 'var(--bg2)', color: 'var(--text)', outline: 'none', width: 120 }}
          placeholder="Filter city..." value={citySearch} onChange={e => setCitySearch(e.target.value)} />
        <button onClick={load}
          style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: 'none', background: '#378ADD', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Loading...' : 'Apply'}
        </button>
        <ColPicker activeCols={activeCols} onChange={toggleCol} />
        {period && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>vs prior: {period.priorFrom} → {period.priorTo}</span>}
      </div>

      {/* Summary cards */}
      {data && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Spends+GST', key: 'spendsGst', type: 'currency' },
            { label: 'Customers', key: 'customers', type: 'int' },
            { label: 'CAC+GST', key: 'cacGst', type: 'currency' },
            { label: 'Install Rate', key: 'iRate', type: 'pct' },
          ].map(m => (
            <div key={m.key} style={{ background: 'var(--bg2)', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3 }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 500 }}>{fmt(T[m.key], m.type)}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div style={{ background: 'var(--red-bg)', border: '0.5px solid #F7C1C1', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12, color: 'var(--red-text)' }}>Error: {error}</div>}
      {loading && <div style={{ padding: 32, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading {title || 'Meta funnel'}...</div>}

      {!loading && data && (
        <div style={{ border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, position: 'sticky', left: 0, background: 'var(--bg2)', zIndex: 2, borderBottom: '0.5px solid var(--border)', minWidth: 140 }}>City</th>
                  {displayCols.map(c => (
                    <th key={c.key} style={{ padding: '8px 10px', fontSize: 11, color: c.default ? 'var(--text3)' : '#534AB7', fontWeight: 500, whiteSpace: 'nowrap', borderBottom: '0.5px solid var(--border)', textAlign: 'left' }}>
                      {c.label}
                      {!c.default && <span style={{ fontSize: 9, marginLeft: 3, cursor: 'pointer', color: '#A32D2D' }} onClick={(e) => { e.stopPropagation(); toggleCol(c.key) }}>×</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={displayCols.length + 1} style={{ textAlign: 'center', padding: 28, color: 'var(--text3)', fontSize: 13 }}>No data. Adjust date range or filters.</td></tr>
                )}
                {filtered.map(row => (
                  <CityRow key={row.city} row={row} period={period} activeCols={activeCols} chartMetrics={chartMetrics} onChartMetricToggle={toggleChartMetric} />
                ))}
                {filtered.length > 0 && (
                  <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg2)' }}>
                    <td style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, position: 'sticky', left: 0, background: 'var(--bg2)' }}>Total ({filtered.length} cities)</td>
                    {displayCols.map(c => (
                      <td key={c.key} style={{ padding: '8px 10px', fontSize: 12, fontWeight: 500, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmt(T[c.key], c.type)}</td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '7px 14px', fontSize: 10, color: 'var(--text3)', borderTop: '0.5px solid var(--border)' }}>
            Google Sheets (Meta) · ↑↓ = % vs prior · click city to expand · zero-spend adsets hidden · ▲▼ = relative to peers
          </div>
        </div>
      )}
    </div>
  )
}
