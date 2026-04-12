import { useState, useEffect, useRef } from 'react'

export default function ChangeTrackerView({ filters }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [days, setDays] = useState('7')
  const [campFilter, setCampFilter] = useState('')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const debounce = useRef(null)

  function load(d, camp) {
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ days: d || days, ...(camp ? { campaignFilter: camp } : {}) })
    fetch(`/api/change-tracker?${qs}`)
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error) } else { setData(d) }; setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load('7', '') }, [])

  function handleCamp(val) {
    setCampFilter(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load(days, val), 600)
  }

  // Flatten: one row per change, attach category
  const all = (data?.changes || []).flatMap(r =>
    (r.changes || []).map(ch => ({ ...r, field: ch.field, old: ch.old, new: ch.new, cat: ch.category || 'Other' }))
  )

  const filtered = all.filter(r => {
    if (catFilter !== 'All' && r.cat !== catFilter) return false
    if (search) {
      const s = search.toLowerCase()
      if (![r.campaign, r.city, r.changedBy, r.field, r.old, r.new].some(v => (v||'').toLowerCase().includes(s))) return false
    }
    return true
  })

  const si = { fontSize: 13, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }
  const tabStyle = (active) => ({ padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none', background: active ? 'var(--accent)' : 'var(--bg2)', color: active ? '#fff' : 'var(--text2)' })

  // Counts per category
  const bidCount = all.filter(r => r.cat === 'Bids').length
  const budgetCount = all.filter(r => r.cat === 'Budget').length
  const statusCount = all.filter(r => r.cat === 'Status').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input style={{ ...si, width: 220 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <input style={{ ...si, width: 200 }} placeholder="Filter campaign name..." value={campFilter} onChange={e => handleCamp(e.target.value)} />
        <select style={{ ...si, cursor: 'pointer' }} value={days} onChange={e => { setDays(e.target.value); load(e.target.value, campFilter) }}>
          {['3','7','14','30'].map(d => <option key={d} value={d}>Last {d} days</option>)}
        </select>
        <button onClick={() => load(days, campFilter)} style={{ ...si, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 }}>Refresh</button>
      </div>

      {/* Category tabs */}
      {data && (
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={tabStyle(catFilter === 'All')} onClick={() => setCatFilter('All')}>All ({all.length})</button>
          <button style={tabStyle(catFilter === 'Bids')} onClick={() => setCatFilter('Bids')}>Bids ({bidCount})</button>
          <button style={tabStyle(catFilter === 'Budget')} onClick={() => setCatFilter('Budget')}>Budget ({budgetCount})</button>
          {statusCount > 0 && <button style={tabStyle(catFilter === 'Status')} onClick={() => setCatFilter('Status')}>Status ({statusCount})</button>}
        </div>
      )}

      {error && <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red-text)' }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading changes...</div>}

      {!loading && data && (
        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: -4 }}>
          {filtered.length} changes · {data.period?.from} to {data.period?.to}
        </div>
      )}

      {!loading && data && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>No changes found for this filter.</div>
      )}

      {!loading && filtered.length > 0 && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Date', 'Campaign', 'What Changed', 'Old Value', 'New Value', 'Changed By'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 600, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>
                      {r.date}<br/><span style={{ color: 'var(--text3)' }}>{r.time}</span>
                    </td>
                    <td style={{ padding: '10px 14px', maxWidth: 220 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.campaign}>{r.campaign}</div>
                      <div style={{ fontSize: 10, color: 'var(--text3)' }}>{r.city}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: r.cat === 'Budget' ? 'var(--blue-bg)' : r.cat === 'Bids' ? 'var(--green-bg)' : 'var(--amber-bg)', color: r.cat === 'Budget' ? 'var(--blue-text)' : r.cat === 'Bids' ? 'var(--green-text)' : 'var(--amber-text)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{r.field}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--red-text)', textDecoration: r.old !== '—' ? 'line-through' : 'none', fontFamily: 'monospace', fontSize: 13 }}>
                      {r.old}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--green-text)', fontWeight: 600, fontFamily: 'monospace', fontSize: 13 }}>
                      {r.new}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>
                      {(r.changedBy || 'Unknown').split('@')[0]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
