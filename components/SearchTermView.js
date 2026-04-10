import { useState, useEffect, useRef } from 'react'

const THEMES = [
  'All', 'Porter 2W', 'Porter (Brand)', 'Courier', 'Delivery',
  'Pickup & Drop', 'Parcel', 'Same Day', 'Urgent', 'Goods Transport',
  'Local', 'Two Wheeler', 'Last Mile', 'Tempo / Mini Truck',
  'App / Online', 'Price / Cheap', 'Other',
]

function fmt(val, type) {
  if (val === null || val === undefined || val === 0) return type === 'pct' ? '0%' : '—'
  if (type === 'currency') return '₹' + Number(val).toLocaleString('en-IN')
  if (type === 'pct') return Number(val).toFixed(2) + '%'
  if (type === 'int') return Number(val).toLocaleString('en-IN')
  return val
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

function ThemeBar({ themes, onSelect, selected }) {
  if (!themes || themes.length === 0) return null
  const maxSpend = Math.max(...themes.map(t => t.spend))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {themes.map(t => {
        const barPct = maxSpend > 0 ? (t.spend / maxSpend * 100) : 0
        const wastedPct = t.spend > 0 ? (t.wastedSpend / t.spend * 100) : 0
        const isSelected = selected === t.theme
        return (
          <div key={t.theme}
            onClick={() => onSelect(isSelected ? 'All' : t.theme)}
            style={{ cursor: 'pointer', padding: '8px 12px', borderRadius: 8, border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`, background: isSelected ? 'var(--blue-bg)' : 'var(--bg)', transition: 'all .12s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>{t.theme}</span>
                {t.flagged > 0 && (
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: 'var(--red-bg)', color: 'var(--red-text)', fontWeight: 600 }}>
                    {t.flagged} flagged
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
                <span style={{ color: 'var(--text2)', fontVariantNumeric: 'tabular-nums' }}>{fmt(t.spend, 'currency')}</span>
                <span style={{ color: 'var(--text3)' }}>{t.terms} terms</span>
                <span style={{ color: t.cpa > 0 ? 'var(--text2)' : 'var(--text3)' }}>{t.cpa > 0 ? fmt(t.cpa, 'currency') + ' CPA' : 'No conv'}</span>
              </div>
            </div>
            {/* Stacked bar: spend (blue) + wasted (red) */}
            <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden', display: 'flex' }}>
              {wastedPct > 0 && <div style={{ width: wastedPct + '%', height: '100%', background: 'var(--red)', borderRadius: '99px 0 0 99px' }} />}
              <div style={{ width: Math.max(0, barPct - wastedPct) + '%', height: '100%', background: 'var(--accent)' }} />
            </div>
            {wastedPct > 0 && (
              <div style={{ fontSize: 10, color: 'var(--red-text)', marginTop: 3 }}>
                ₹{t.wastedSpend.toLocaleString('en-IN')} wasted ({wastedPct.toFixed(0)}% of spend)
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TermsTable({ terms, loading }) {
  const [sortKey, setSortKey] = useState('spend')
  const [sortDir, setSortDir] = useState(-1)
  const [page, setPage] = useState(0)
  const PAGE = 50

  function sort(key) {
    if (key === sortKey) setSortDir(d => -d)
    else { setSortKey(key); setSortDir(-1) }
    setPage(0)
  }

  const sorted = [...(terms || [])].sort((a, b) => {
    if (b.isFlagged !== a.isFlagged) return b.isFlagged ? 1 : -1
    return ((a[sortKey] || 0) - (b[sortKey] || 0)) * sortDir
  })
  const paginated = sorted.slice(page * PAGE, (page + 1) * PAGE)
  const totalPages = Math.ceil(sorted.length / PAGE)

  const COLS = [
    { key: 'searchTerm', label: 'Search Term', type: 'text', align: 'left', w: 220 },
    { key: 'campaign',   label: 'Campaign',    type: 'text', align: 'left', w: 160 },
    { key: 'adGroup',    label: 'Ad Group',    type: 'text', align: 'left', w: 140 },
    { key: 'theme',      label: 'Theme',       type: 'badge', align: 'left', w: 120 },
    { key: 'spend',      label: 'Spend',       type: 'currency', w: 90 },
    { key: 'clicks',     label: 'Clicks',      type: 'int', w: 70 },
    { key: 'impressions',label: 'Impr',        type: 'int', w: 80 },
    { key: 'conversions',label: 'Conv',        type: 'int', w: 60 },
    { key: 'cpa',        label: 'CPA',         type: 'currency', w: 80 },
    { key: 'ctr',        label: 'CTR',         type: 'pct', w: 70 },
  ]

  return (
    <div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              <th style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', width: 28 }}>⚠</th>
              {COLS.map(c => (
                <th key={c.key}
                  onClick={() => sort(c.key)}
                  style={{ padding: '8px 10px', textAlign: c.align || 'right', fontSize: 10, color: sortKey === c.key ? 'var(--accent)' : 'var(--text3)', fontWeight: sortKey === c.key ? 600 : 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', cursor: 'pointer', width: c.w, userSelect: 'none' }}>
                  {c.label} {sortKey === c.key ? (sortDir === -1 ? '↓' : '↑') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && [1,2,3,4,5].map(i => (
              <tr key={i}><td colSpan={COLS.length + 1} style={{ padding: '10px', textAlign: 'center', color: 'var(--text3)' }}>
                <div style={{ height: 12, background: 'var(--bg3)', borderRadius: 4, width: '80%', margin: '0 auto', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </td></tr>
            ))}
            {!loading && paginated.length === 0 && (
              <tr><td colSpan={COLS.length + 1} style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No search terms found for this filter</td></tr>
            )}
            {paginated.map((t, i) => (
              <tr key={i} style={{ borderBottom: '0.5px solid var(--border)', background: t.isFlagged ? 'rgba(220,38,38,0.04)' : 'transparent', transition: 'background .1s' }}
                onMouseOver={e => { if (!t.isFlagged) e.currentTarget.style.background = 'var(--bg2)' }}
                onMouseOut={e => { if (!t.isFlagged) e.currentTarget.style.background = 'transparent' }}>
                <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                  {t.isFlagged && <span title="High spend, zero conversions" style={{ color: 'var(--red)', fontWeight: 700, fontSize: 13 }}>⚠</span>}
                </td>
                <td style={{ padding: '8px 10px', fontWeight: t.isFlagged ? 600 : 400, color: t.isFlagged ? 'var(--red-text)' : 'var(--text)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.searchTerm}
                </td>
                <td style={{ padding: '8px 10px', color: 'var(--text3)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{t.campaign}</td>
                <td style={{ padding: '8px 10px', color: 'var(--text3)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{t.adGroup}</td>
                <td style={{ padding: '8px 10px' }}>
                  <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: 'var(--bg3)', color: 'var(--text2)', whiteSpace: 'nowrap' }}>{t.theme}</span>
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmt(t.spend, 'currency')}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(t.clicks, 'int')}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text3)' }}>{fmt(t.impressions, 'int')}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: t.conversions === 0 ? 'var(--red-text)' : 'var(--text)' }}>{t.conversions}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(t.cpa, 'currency')}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(t.ctr, 'pct')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderTop: '0.5px solid var(--border)', justifyContent: 'flex-end' }}>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
            {page * PAGE + 1}–{Math.min((page + 1) * PAGE, sorted.length)} of {sorted.length}
          </span>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: page === 0 ? 'var(--text3)' : 'var(--text)', cursor: page === 0 ? 'default' : 'pointer' }}>
            ← Prev
          </button>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg)', color: page >= totalPages - 1 ? 'var(--text3)' : 'var(--text)', cursor: page >= totalPages - 1 ? 'default' : 'pointer' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}

export default function SearchTermView({ filters }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedTheme, setSelectedTheme] = useState('All')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [campSearch, setCampSearch] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const debounceRef = useRef(null)

  function load(theme, flagged, camp) {
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams({
      ...(camp ? { campaign: camp } : {}),
      ...(theme && theme !== 'All' ? { theme } : {}),
      ...(flagged ? { flaggedOnly: 'true' } : {}),
    }).toString()
    fetch(`/api/search-terms?${qs}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); setLoading(false); return }
        setData(d)
        setLastUpdated(d.lastUpdated || null)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }

  useEffect(() => { load('All', false, '') }, [])

  function handleThemeSelect(theme) {
    setSelectedTheme(theme)
    load(theme, flaggedOnly, campSearch)
  }

  function handleFlaggedToggle() {
    const next = !flaggedOnly
    setFlaggedOnly(next)
    load(selectedTheme, next, campSearch)
  }

  function handleCampSearch(val) {
    setCampSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => load(selectedTheme, flaggedOnly, val), 600)
  }

  const summary = data?.summary
  const themes = data?.themeSummary || []
  const terms = data?.terms || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <SummaryCard label="Total Spend" value={fmt(summary?.totalSpend, 'currency')} />
        <SummaryCard label="Total Conversions" value={fmt(summary?.totalConversions, 'int')} />
        <SummaryCard label="Avg CPA" value={fmt(summary?.avgCpa, 'currency')} />
        <SummaryCard label="Total Search Terms" value={fmt(summary?.totalTerms, 'int')} />
        <SummaryCard
          label="Flagged Terms"
          value={summary?.flaggedTerms || 0}
          sub={`₹${(summary?.wastedSpend || 0).toLocaleString('en-IN')} wasted (${summary?.wastedPct || 0}%)`}
          color={summary?.flaggedTerms > 0 ? 'var(--red)' : 'var(--green)'}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ fontSize: 12, padding: '7px 11px', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 200 }}
          placeholder="Filter by campaign name..."
          value={campSearch}
          onChange={e => handleCampSearch(e.target.value)}
        />
        <button onClick={handleFlaggedToggle}
          style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: `1px solid ${flaggedOnly ? 'var(--red)' : 'var(--border)'}`, background: flaggedOnly ? 'var(--red-bg)' : 'var(--bg)', color: flaggedOnly ? 'var(--red-text)' : 'var(--text2)', cursor: 'pointer', fontWeight: flaggedOnly ? 600 : 400 }}>
          {flaggedOnly ? '⚠ Flagged only' : '⚠ Show flagged only'}
        </button>
        <button onClick={() => load(selectedTheme, flaggedOnly, campSearch)}
          style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
        {lastUpdated && (
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
            Google Sheets · last updated {lastUpdated}
          </span>
        )}
      </div>

      {!loading && data && data.summary?.totalTerms === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', border: '1.5px dashed var(--border2)', borderRadius: 12, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔍</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>No search term data found</div>
          <div style={{ fontSize: 13, maxWidth: 420, margin: '0 auto', lineHeight: 1.7 }}>
            The Google Ads script hasn't run yet, or the <strong>"Raw Data"</strong> tab in your sheet is empty.<br /><br />
            Run <code style={{ background: 'var(--bg3)', padding: '2px 6px', borderRadius: 4 }}>1_google_ads_data_pull.js</code> inside Google Ads → Tools → Scripts, then come back and click <strong>Refresh</strong>.
          </div>
        </div>
      )}
      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red-text)' }}>
          {error}
        </div>
      )}

      {/* Main layout: theme bar + terms table */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left: Theme breakdown */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Themes</span>
            {selectedTheme !== 'All' && (
              <button onClick={() => handleThemeSelect('All')}
                style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
                Clear
              </button>
            )}
          </div>
          <div style={{ padding: 10, maxHeight: 600, overflowY: 'auto' }}>
            {loading && !data && <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Loading themes...</div>}
            <ThemeBar themes={themes} onSelect={handleThemeSelect} selected={selectedTheme} />
          </div>
        </div>

        {/* Right: Terms table */}
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              Search terms
              {selectedTheme !== 'All' && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>· {selectedTheme}</span>}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{terms.length} terms</span>
          </div>
          <TermsTable terms={terms} loading={loading && !data} />
          <div style={{ padding: '7px 14px', borderTop: '0.5px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>
            ⚠ Flagged = ₹200+ spend with 0 conversions · Click theme to filter · Click column header to sort
          </div>
        </div>
      </div>

      <style jsx global>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }`}</style>
    </div>
  )
}
