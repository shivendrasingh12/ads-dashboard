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
  const color = val > 20 ? 'var(--red-text)' : val < -20 ? 'var(--amber-text)' : 'var(--green-text)'
  const bg = val > 20 ? 'var(--red-bg)' : val < -20 ? 'var(--amber-bg)' : 'var(--green-bg)'
  return (
    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: bg, color, fontWeight: 500 }}>
      {val > 0 ? '↑' : '↓'}{Math.abs(val).toFixed(1)}%
    </span>
  )
}

function CampaignDetail({ camp }) {
  const [open, setOpen] = useState(false)
  const gadsChangeHistoryUrl = `https://ads.google.com/aw/changehistory`
  return (
    <div style={{ borderTop: '0.5px solid var(--border)', background: 'var(--bg2)' }}>
      <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        onClick={() => setOpen(!open)}>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--accent)' }}>
          {open ? '▾ Hide' : '▸ View'} bid & budget details
        </span>
        {camp.hasChanges && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--amber-bg)', color: 'var(--amber-text)', fontWeight: 500 }}>changes detected</span>}
        <a href={gadsChangeHistoryUrl} target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--blue-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          View in Google Ads Change History ↗
        </a>
      </div>

      {open && (
        <div style={{ padding: '0 16px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Current settings */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Current settings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'Daily budget', value: camp.budget ? '₹' + camp.budget.toLocaleString('en-IN') : '—' },
                { label: 'Bid strategy', value: camp.strategy || '—' },
                { label: 'Target CPA', value: camp.targetCpa ? '₹' + camp.targetCpa.toLocaleString('en-IN') : '—' },
                { label: 'Target ROAS', value: camp.targetRoas ? camp.targetRoas + 'x' : '—' },
                { label: 'Current spend', value: '₹' + camp.spend.toLocaleString('en-IN') },
                { label: 'Budget utilised', value: camp.budgetUtil !== null ? camp.budgetUtil.toFixed(1) + '%' : '—' },
                { label: 'Prior period spend', value: camp.priorSpend > 0 ? '₹' + camp.priorSpend.toLocaleString('en-IN') : '—' },
                { label: 'Spend change', value: camp.spendChange !== null ? (camp.spendChange > 0 ? '↑' : '↓') + Math.abs(camp.spendChange).toFixed(1) + '%' : '—' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '0.5px solid var(--border)' }}>
                  <span style={{ color: 'var(--text3)' }}>{r.label}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent changes */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Recent changes detected</div>
            {camp.recentChanges?.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {camp.recentChanges.map((ch, i) => {
                  const dt = ch.changedAt ? new Date(ch.changedAt) : null
                  const timeStr = dt ? dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
                  return (
                    <div key={i} style={{ background: 'var(--bg)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)', marginBottom: 3 }}>{ch.resourceType}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{timeStr}</div>
                      {ch.status && <div style={{ fontSize: 10, marginTop: 2, color: 'var(--text2)' }}>Status: {ch.status}</div>}
                    </div>
                  )
                })}
                <div style={{ fontSize: 11, color: 'var(--amber-text)', background: 'var(--amber-bg)', padding: '8px 10px', borderRadius: 6, marginTop: 4, lineHeight: 1.5 }}>
                  ⚠ Google Ads API does not expose the username who made changes for MCC-managed accounts. To see who changed what and the exact old→new values, click <strong>"View in Google Ads Change History"</strong> above — it shows the full audit trail including user names.
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>No changes detected in this period</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function BidTrackerView({ filters }) {
  const [allCampaigns, setAllCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [period, setPeriod] = useState(null)
  const [campFilter, setCampFilter] = useState('')
  const [days, setDays] = useState('30')
  const [selectedIds, setSelectedIds] = useState([])
  const [showActive, setShowActive] = useState(true)
  const [sortKey, setSortKey] = useState('spend')
  const [sortDir, setSortDir] = useState(-1)
  const debounce = useRef(null)

  function load(camp, d) {
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ days: d || days, ...(camp ? { campaignFilter: camp } : {}) }).toString()
    fetch(`/api/bid-changes?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setAllCampaigns(d.campaigns || [])
        setPeriod(d.period)
        setLoading(false)
      })
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

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function selectAll() {
    const visible = filtered.map(c => c.id)
    setSelectedIds(prev => prev.length === visible.length ? [] : visible)
  }

  const filtered = allCampaigns
    .filter(c => !showActive || c.status === 'ENABLED')
    .sort((a, b) => {
      const av = a[sortKey] ?? -Infinity
      const bv = b[sortKey] ?? -Infinity
      return (av - bv) * sortDir
    })

  // Campaigns to show in detail view = selected ones (or all if none selected)
  const detailCampaigns = selectedIds.length > 0
    ? allCampaigns.filter(c => selectedIds.includes(c.id))
    : []

  const totalSpend = filtered.reduce((s, c) => s + (c.spend || 0), 0)
  const totalBudget = filtered.reduce((s, c) => s + (c.budget || 0), 0)
  const highUtil = filtered.filter(c => c.budgetUtil > 90).length
  const bigSpike = filtered.filter(c => c.spendChange > 30).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary cards */}
      {!loading && allCampaigns.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Spend', value: fmt(totalSpend, 'currency'), sub: period?.current },
            { label: 'Total Budget', value: fmt(totalBudget, 'currency'), sub: 'daily sum' },
            { label: 'Campaigns', value: filtered.length },
            { label: 'Near Cap', value: highUtil, color: highUtil > 0 ? 'var(--red)' : undefined, sub: '>90% budget used' },
            { label: 'Spend Spike', value: bigSpike, color: bigSpike > 0 ? 'var(--amber)' : undefined, sub: '>30% vs prior' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', flex: 1, minWidth: 110 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, fontWeight: 500 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.color || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{m.value}</div>
              {m.sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 260 }}
          placeholder="Campaign name contains... (e.g. Delhi, UAC)"
          value={campFilter} onChange={e => handleSearch(e.target.value)} />
        <select style={{ fontSize: 12, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
          value={days} onChange={e => { setDays(e.target.value); load(campFilter, e.target.value) }}>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', cursor: 'pointer', userSelect: 'none' }}>
          <input type="checkbox" checked={showActive} onChange={e => setShowActive(e.target.checked)} />
          Active only
        </label>
        <button onClick={() => load(campFilter, days)}
          style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Loading...' : 'Search'}
        </button>
        {selectedIds.length > 0 && (
          <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>{selectedIds.length} selected</span>
        )}
        {period && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>vs prior: {period.prior}</span>}
      </div>

      {error && <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red-text)' }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>Fetching campaign data from Google Ads...</div>}

      {/* Instruction */}
      {!loading && filtered.length > 0 && selectedIds.length === 0 && (
        <div style={{ fontSize: 12, color: 'var(--text3)', padding: '6px 12px', background: 'var(--blue-bg)', borderRadius: 8, color: 'var(--blue-text)' }}>
          💡 Select campaigns using the checkboxes to see detailed bid & budget breakdown
        </div>
      )}

      {/* Main table */}
      {!loading && filtered.length > 0 && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: '9px 12px', width: 36 }}>
                    <input type="checkbox"
                      checked={selectedIds.length === filtered.length && filtered.length > 0}
                      onChange={selectAll} />
                  </th>
                  {[
                    { key: 'name',        label: 'Campaign',     align: 'left',   w: 220 },
                    { key: 'strategy',    label: 'Bid Strategy', align: 'left',   w: 150 },
                    { key: 'budget',      label: 'Daily Budget', align: 'right',  w: 110 },
                    { key: 'targetCpa',   label: 'Target CPA',   align: 'right',  w: 100 },
                    { key: 'targetRoas',  label: 'Target ROAS',  align: 'right',  w: 100 },
                    { key: 'spend',       label: 'Spend',        align: 'right',  w: 100 },
                    { key: 'budgetUtil',  label: 'Budget Used',  align: 'left',   w: 110 },
                    { key: 'spendChange', label: 'vs Prior',     align: 'center', w: 90  },
                    { key: 'conversions', label: 'Conv',         align: 'right',  w: 70  },
                    { key: 'cpa',         label: 'CPA',          align: 'right',  w: 80  },
                  ].map(c => (
                    <th key={c.key} onClick={() => toggleSort(c.key)}
                      style={{ padding: '9px 12px', textAlign: c.align, fontSize: 11, color: sortKey === c.key ? 'var(--accent)' : 'var(--text3)', fontWeight: sortKey === c.key ? 600 : 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', minWidth: c.w }}>
                      {c.label} {sortKey === c.key ? (sortDir === -1 ? '↓' : '↑') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <>
                    <tr key={c.id}
                      style={{ borderBottom: selectedIds.includes(c.id) ? 'none' : '0.5px solid var(--border)', background: selectedIds.includes(c.id) ? 'var(--blue-bg)' : c.budgetUtil > 90 ? 'rgba(220,38,38,0.03)' : 'transparent', transition: 'background .1s' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                      </td>
                      <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.name}
                        {c.hasChanges && <span style={{ fontSize: 9, marginLeft: 5, padding: '1px 4px', borderRadius: 3, background: 'var(--amber-bg)', color: 'var(--amber-text)', fontWeight: 600 }}>changed</span>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text2)' }}>{c.strategy || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{c.budget ? fmt(c.budget, 'currency') : '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {c.targetCpa ? <span style={{ color: 'var(--blue-text)', fontWeight: 500 }}>{fmt(c.targetCpa, 'currency')}</span> : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {c.targetRoas ? <span style={{ color: 'var(--purple-text)', fontWeight: 500 }}>{c.targetRoas}x</span> : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(c.spend, 'currency')}</td>
                      <td style={{ padding: '10px 12px' }}><SpendBar util={c.budgetUtil} /></td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}><SpendChange val={c.spendChange} /></td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text2)' }}>{fmt(c.conversions, 'int')}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{c.cpa ? fmt(c.cpa, 'currency') : '—'}</td>
                    </tr>
                    {selectedIds.includes(c.id) && <CampaignDetail camp={c} />}
                  </>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '7px 14px', borderTop: '0.5px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>
            Google Ads · select campaigns to see bid &amp; budget detail · 🔴 = &gt;90% budget used · "changed" badge = setting modified this period · sort by any column
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && allCampaigns.length > 0 && (
        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text3)', fontSize: 13 }}>
          No active campaigns found. Try unchecking "Active only" or adjusting the filter.
        </div>
      )}
    </div>
  )
}
