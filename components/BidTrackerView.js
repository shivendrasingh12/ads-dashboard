import { useState, useEffect, useRef } from 'react'

function fmt(val, type) {
  if (val === null || val === undefined) return '—'
  if (type === 'currency') return '₹' + Number(val).toLocaleString('en-IN')
  if (type === 'pct') return Number(val).toFixed(1) + '%'
  if (type === 'int') return Number(val).toLocaleString('en-IN')
  return val
}

function SpendBar({ util }) {
  if (util === null) return <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
  const color = util > 90 ? 'var(--red)' : util > 70 ? 'var(--amber)' : 'var(--green)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ width: 60, height: 5, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ width: Math.min(util, 100) + '%', height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, color, fontWeight: util > 90 ? 600 : 400 }}>{util.toFixed(0)}%</span>
    </div>
  )
}

function SpendChange({ val }) {
  if (val === null || val === undefined) return <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>
  const color = val > 20 ? 'var(--red-text)' : val < -20 ? 'var(--amber-text)' : 'var(--text3)'
  const bg = val > 20 ? 'var(--red-bg)' : val < -20 ? 'var(--amber-bg)' : 'var(--bg3)'
  return (
    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: bg, color, fontWeight: 500 }}>
      {val > 0 ? '↑' : '↓'}{Math.abs(val).toFixed(1)}%
    </span>
  )
}

function StatusDot({ status }) {
  const color = status === 'ENABLED' ? 'var(--green)' : status === 'PAUSED' ? 'var(--amber)' : 'var(--text3)'
  const label = status === 'ENABLED' ? 'Active' : status === 'PAUSED' ? 'Paused' : status || '—'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  )
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '11px 14px', flex: 1, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 3, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function BidTrackerView({ filters }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [campFilter, setCampFilter] = useState('')
  const [days, setDays] = useState('30')
  const [sortKey, setSortKey] = useState('spend')
  const [sortDir, setSortDir] = useState(-1)
  const debounce = useRef(null)

  function load(camp, d) {
    setLoading(true); setError(null)
    const qs = new URLSearchParams({
      days: d || days,
      ...(camp ? { campaignFilter: camp } : {}),
    }).toString()
    fetch(`/api/bid-changes?${qs}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load('', '30') }, [])

  function handleSearch(val) {
    setCampFilter(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load(val, days), 500)
  }

  function toggleSort(key) {
    if (key === sortKey) setSortDir(d => -d)
    else { setSortKey(key); setSortDir(-1) }
  }

  const campaigns = [...(data?.campaigns || [])].sort((a, b) => {
    const av = a[sortKey] ?? -Infinity
    const bv = b[sortKey] ?? -Infinity
    return (av - bv) * sortDir
  })

  const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0)
  const totalBudget = campaigns.reduce((s, c) => s + (c.budget || 0), 0)
  const highUtil = campaigns.filter(c => c.budgetUtil > 90).length
  const bigIncrease = campaigns.filter(c => c.spendChange > 30).length

  const COLS = [
    { key: 'name',        label: 'Campaign',       w: 220, align: 'left' },
    { key: 'status',      label: 'Status',         w: 90,  align: 'left' },
    { key: 'strategy',    label: 'Bid Strategy',   w: 140, align: 'left' },
    { key: 'budget',      label: 'Daily Budget',   w: 110, align: 'right' },
    { key: 'targetCpa',   label: 'Target CPA',     w: 100, align: 'right' },
    { key: 'targetRoas',  label: 'Target ROAS',    w: 100, align: 'right' },
    { key: 'spend',       label: 'Spend',          w: 100, align: 'right' },
    { key: 'budgetUtil',  label: 'Budget Used',    w: 110, align: 'left'  },
    { key: 'spendChange', label: 'vs Prior',       w: 90,  align: 'center'},
    { key: 'conversions', label: 'Conv',           w: 70,  align: 'right' },
    { key: 'cpa',         label: 'CPA',            w: 80,  align: 'right' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary cards */}
      {data && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SummaryCard label="Total Spend" value={fmt(totalSpend, 'currency')} sub={data.period?.current} />
          <SummaryCard label="Total Budget" value={fmt(totalBudget, 'currency')} sub="daily budget sum" />
          <SummaryCard label="Campaigns" value={campaigns.length} />
          <SummaryCard label="Near Budget Cap" value={highUtil} color={highUtil > 0 ? 'var(--red)' : undefined} sub=">90% utilised" />
          <SummaryCard label="Spend Spike" value={bigIncrease} color={bigIncrease > 0 ? 'var(--amber)' : undefined} sub=">30% vs prior" />
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 260 }}
          placeholder="Campaign name contains... (e.g. UAC, Delhi)"
          value={campFilter}
          onChange={e => handleSearch(e.target.value)}
        />
        <select
          style={{ fontSize: 12, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
          value={days}
          onChange={e => { setDays(e.target.value); load(campFilter, e.target.value) }}>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
        </select>
        <button onClick={() => load(campFilter, days)}
          style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Loading...' : 'Search'}
        </button>
        {data?.period && (
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
            Current: {data.period.current} · Prior: {data.period.prior}
          </span>
        )}
      </div>

      {error && <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red-text)' }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>Fetching campaign bid & budget data...</div>}

      {!loading && campaigns.length > 0 && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {COLS.map(c => (
                    <th key={c.key} onClick={() => toggleSort(c.key)}
                      style={{ padding: '9px 12px', textAlign: c.align, fontSize: 11, color: sortKey === c.key ? 'var(--accent)' : 'var(--text3)', fontWeight: sortKey === c.key ? 600 : 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', minWidth: c.w }}>
                      {c.label} {sortKey === c.key ? (sortDir === -1 ? '↓' : '↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '0.5px solid var(--border)', background: c.budgetUtil > 90 ? 'rgba(220,38,38,0.03)' : 'transparent', transition: 'background .1s' }}
                    onMouseOver={e => { if (c.budgetUtil <= 90) e.currentTarget.style.background = 'var(--bg2)' }}
                    onMouseOut={e => { if (c.budgetUtil <= 90) e.currentTarget.style.background = 'transparent' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                    <td style={{ padding: '10px 12px' }}><StatusDot status={c.status} /></td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{c.strategy || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {c.budget ? fmt(c.budget, 'currency') : '—'}
                      {c.budgetPeriod && c.budgetPeriod !== 'DAILY' && <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 3 }}>{c.budgetPeriod.toLowerCase()}</span>}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {c.targetCpa ? <span style={{ color: 'var(--blue-text)', fontWeight: 500 }}>{fmt(c.targetCpa, 'currency')}</span> : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {c.targetRoas ? <span style={{ color: 'var(--purple-text)', fontWeight: 500 }}>{c.targetRoas}x</span> : '—'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(c.spend, 'currency')}</td>
                    <td style={{ padding: '10px 12px' }}><SpendBar util={c.budgetUtil} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}><SpendChange val={c.spendChange} /></td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>{fmt(c.conversions, 'int')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.cpa ? fmt(c.cpa, 'currency') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '7px 14px', borderTop: '0.5px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>
            Google Ads · "vs Prior" = spend change vs equivalent prior period · 🔴 row = >90% budget utilised · click column headers to sort
          </div>
        </div>
      )}

      {!loading && !error && campaigns.length === 0 && data && (
        <div style={{ textAlign: 'center', padding: '48px 20px', border: '1.5px dashed var(--border2)', borderRadius: 12, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>💰</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>No campaigns found</div>
          <div style={{ fontSize: 13 }}>Try adjusting the campaign filter or date range</div>
        </div>
      )}
    </div>
  )
}
