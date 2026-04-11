import { useState, useEffect, useRef } from 'react'

const CAT_STYLE = {
  'Bids':       { bg: '#052E16', color: '#4ADE80', border: '#166534' },
  'Budget':     { bg: '#0C1A3A', color: '#93C5FD', border: '#1E40AF' },
  'Assets':     { bg: '#1C0A00', color: '#FDBA74', border: '#9A3412' },
  'Targeting':  { bg: '#1C0A3A', color: '#E879F9', border: '#7E22CE' },
  'Status':     { bg: '#1C1200', color: '#FCD34D', border: '#92400E' },
  'Schedule':   { bg: '#0C1A2A', color: '#67E8F9', border: '#0E7490' },
  'Extensions': { bg: '#120A2A', color: '#C4B5FD', border: '#5B21B6' },
  'Other':      { bg: 'var(--bg3)', color: 'var(--text3)', border: 'var(--border)' },
}

function hashColor(s) {
  const COLORS = ['#2563EB','#16A34A','#EA580C','#9333EA','#CA8A04','#0891B2','#7C3AED','#DB2777']
  let h = 0; for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

function Avatar({ name }) {
  const initials = name.split('@')[0].split(/[._\-\s]/).filter(Boolean).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'U'
  return (
    <div style={{ width: 28, height: 28, borderRadius: '50%', background: hashColor(name), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {initials}
    </div>
  )
}

function CatPill({ cat }) {
  const s = CAT_STYLE[cat] || CAT_STYLE['Other']
  return (
    <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {cat}
    </span>
  )
}

function ChangeBlock({ ch }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '7px 10px', marginBottom: 5, fontSize: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', marginBottom: 5, display: 'inline-block', background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4 }}>
        {ch.field}
      </div>
      {ch.old && (
        <div style={{ color: 'var(--text3)', textDecoration: 'line-through', marginBottom: 3, wordBreak: 'break-word' }}>
          − {ch.old}
        </div>
      )}
      {ch.new && (
        <div style={{ color: '#4ADE80', fontWeight: 500, wordBreak: 'break-word' }}>
          + {ch.new}
        </div>
      )}
    </div>
  )
}

export default function ChangeTrackerView({ filters }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [days, setDays] = useState('7')
  const [campFilter, setCampFilter] = useState('')
  const [catFilter, setCatFilter] = useState('All')
  const [cityFilter, setCityFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PER = 25
  const debounce = useRef(null)

  function load(d, camp) {
    setLoading(true); setError(null)
    const qs = new URLSearchParams({ days: d || days, ...(camp ? { campaignFilter: camp } : {}) }).toString()
    fetch(`/api/change-tracker?${qs}`)
      .then(r => r.json())
      .then(d => { if (d.error) { setError(d.error); setLoading(false); return }; setData(d); setPage(1); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load('7', '') }, [])

  function handleCampSearch(val) {
    setCampFilter(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load(days, val), 600)
  }

  const allChanges = data?.changes || []

  // Filter
  const filtered = allChanges.filter(r => {
    if (catFilter !== 'All' && r.category !== catFilter) return false
    if (cityFilter !== 'All' && r.city !== cityFilter) return false
    if (search) {
      const s = search.toLowerCase()
      const chTxt = (r.changes || []).map(c => c.field + ' ' + c.old + ' ' + c.new).join(' ')
      if (![r.campaign, r.city, r.category, r.changedBy, r.note, chTxt].some(v => (v || '').toLowerCase().includes(s))) return false
    }
    return true
  })

  const paginated = filtered.slice((page - 1) * PER, page * PER)
  const totalPages = Math.ceil(filtered.length / PER)

  // Sidebar counts
  const cats = [...new Set(allChanges.map(r => r.category))].sort()
  const cities = [...new Set(allChanges.map(r => r.city))].filter(Boolean).sort()
  const catCounts = cats.reduce((acc, c) => { acc[c] = allChanges.filter(r => r.category === c).length; return acc }, {})

  // Summary stats
  const today = new Date().toISOString().split('T')[0]
  const todayCount = filtered.filter(r => r.date === today).length
  const uniqueCamps = new Set(filtered.map(r => r.campId)).size
  const uniqueCities = new Set(filtered.map(r => r.city)).size

  function exportCSV() {
    const hdrs = ['Date', 'Time', 'City', 'Campaign', 'Campaign ID', 'Category', 'Operation', 'Field', 'Old Value', 'New Value', 'Changed By']
    const rows = []
    filtered.forEach(r => {
      if (!r.changes?.length) {
        rows.push([r.date, r.time, r.city, r.campaign, r.campId, r.category, r.note, '', '', '', r.changedBy])
      } else {
        r.changes.forEach(ch => rows.push([r.date, r.time, r.city, r.campaign, r.campId, r.category, r.note, ch.field, ch.old, ch.new, r.changedBy]))
      }
    })
    const csv = [hdrs, ...rows].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv)
    a.download = `gads_changes_${today}.csv`; a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 240 }}
          placeholder="Search campaigns, changes..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        <input style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 200 }}
          placeholder="Filter by campaign name..." value={campFilter} onChange={e => handleCampSearch(e.target.value)} />
        <select style={{ fontSize: 12, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
          value={days} onChange={e => { setDays(e.target.value); load(e.target.value, campFilter) }}>
          <option value="1">Today</option>
          <option value="3">Last 3 days</option>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
        </select>
        <button onClick={() => load(days, campFilter)}
          style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        {filtered.length > 0 && (
          <button onClick={exportCSV}
            style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text2)', cursor: 'pointer' }}>
            ↓ Export CSV
          </button>
        )}
        {data?.period && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{data.period.from} → {data.period.to}</span>}
      </div>

      {/* Source note */}
      {data?.sourceNote && (
        <div style={{ background: 'var(--amber-bg)', border: '1px solid rgba(217,119,6,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--amber-text)' }}>
          ⚠ {data.sourceNote}
        </div>
      )}
      {data?.source === 'change_event' && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(22,163,74,.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--green-text)' }}>
          ✓ Full change history available — showing user emails and old → new values
        </div>
      )}

      {error && <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red-text)' }}>{error}</div>}

      {/* Summary cards */}
      {data && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Changes', value: filtered.length, sub: 'in filtered view' },
            { label: 'Today', value: todayCount, color: todayCount > 0 ? 'var(--accent)' : undefined },
            { label: 'Campaigns', value: uniqueCamps },
            { label: 'Cities', value: uniqueCities },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', flex: 1, minWidth: 110 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2, fontWeight: 500 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.color || 'var(--text)' }}>{m.value}</div>
              {m.sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 1 }}>{m.sub}</div>}
            </div>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>Fetching Google Ads change history...</div>}

      {!loading && data && (
        <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 14, alignItems: 'start' }}>
          {/* Sidebar filters */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Category</div>
              <div style={{ padding: 6 }}>
                {['All', ...cats].map(c => (
                  <div key={c} onClick={() => { setCatFilter(c); setPage(1) }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: catFilter === c ? 'var(--accent)' : 'var(--text2)', background: catFilter === c ? 'var(--blue-bg)' : 'transparent', fontWeight: catFilter === c ? 600 : 400, marginBottom: 1 }}>
                    <span>{c}</span>
                    {c !== 'All' && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{catCounts[c] || 0}</span>}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>City</div>
              <div style={{ padding: 6, maxHeight: 200, overflowY: 'auto' }}>
                {['All', ...cities].map(c => (
                  <div key={c} onClick={() => { setCityFilter(c); setPage(1) }}
                    style={{ padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: cityFilter === c ? 'var(--accent)' : 'var(--text3)', background: cityFilter === c ? 'var(--blue-bg)' : 'transparent', marginBottom: 1 }}>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main table */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text3)' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 500, color: 'var(--text2)' }}>No changes match your filters</div>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg2)' }}>
                        {['Date / Time', 'City', 'Campaign', 'Category', 'Change Details', 'Changed By'].map(h => (
                          <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((r, i) => (
                        <tr key={i} style={{ borderBottom: '0.5px solid var(--border)' }}
                          onMouseOver={e => e.currentTarget.style.background = 'var(--bg2)'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, fontFamily: 'monospace' }}>{r.date}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>{r.time}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span onClick={() => { setCityFilter(r.city); setPage(1) }}
                              style={{ fontSize: 12, padding: '3px 8px', borderRadius: 5, background: 'var(--bg2)', border: '0.5px solid var(--border)', cursor: 'pointer', display: 'inline-block' }}>
                              {r.city}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 200 }}>
                            <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.campaign}>{r.campaign}</div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace' }}>{r.campId}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <CatPill cat={r.category} />
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{r.note}</div>
                          </td>
                          <td style={{ padding: '10px 12px', maxWidth: 280 }}>
                            <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                              {(r.changes || []).map((ch, j) => <ChangeBlock key={j} ch={ch} />)}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Avatar name={r.changedBy || 'Unknown'} />
                              <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
                                {(r.changedBy || 'Unknown').split('@')[0]}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderTop: '0.5px solid var(--border)', fontSize: 11, color: 'var(--text3)' }}>
                  <span>{((page - 1) * PER) + 1}–{Math.min(page * PER, filtered.length)} of {filtered.length}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => i + 1).map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        style={{ width: 28, height: 28, borderRadius: 5, border: '1px solid', borderColor: p === page ? 'var(--accent)' : 'var(--border)', background: p === page ? 'var(--accent)' : 'var(--bg)', color: p === page ? '#fff' : 'var(--text3)', cursor: 'pointer', fontSize: 11 }}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
