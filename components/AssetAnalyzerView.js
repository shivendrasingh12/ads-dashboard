import { useState, useEffect, useCallback, useRef } from 'react'

/* ── Helpers ── */
const fmt = n => n == null ? '—' : Number(n).toLocaleString('en-IN', { maximumFractionDigits: 1 })
const fmtCur = n => n == null ? '—' : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const fmtPct = n => n == null ? '—' : Number(n).toFixed(2) + '%'
const isoDate = d => d.toISOString().slice(0, 10)
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }

/* ── Rating badges ── */
function RatingBadge({ value, thresholds, reverse }) {
  if (value == null || isNaN(value)) return <span style={{ color: 'var(--text3)' }}>—</span>
  const v = Number(value)
  let label = 'Avg', bg = 'var(--badge-avg-bg, rgba(128,128,128,.12))', color = 'var(--text2)'
  if (reverse) {
    if (v <= thresholds[0]) { label = 'Good'; bg = 'var(--green-bg)'; color = 'var(--green-text)' }
    else if (v >= thresholds[1]) { label = 'Bad'; bg = 'var(--red-bg)'; color = 'var(--red-text)' }
  } else {
    if (v >= thresholds[1]) { label = 'Good'; bg = 'var(--green-bg)'; color = 'var(--green-text)' }
    else if (v <= thresholds[0]) { label = 'Bad'; bg = 'var(--red-bg)'; color = 'var(--red-text)' }
  }
  return <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: bg, color, fontWeight: 600, marginLeft: 4, letterSpacing: '.3px' }}>{label}</span>
}

/* ── Performance label from Google ── */
function PerfLabel({ label }) {
  const map = {
    BEST: { bg: 'var(--green-bg)', color: 'var(--green-text)', text: 'Best' },
    GOOD: { bg: 'var(--green-bg)', color: 'var(--green-text)', text: 'Good' },
    LOW: { bg: 'var(--red-bg)', color: 'var(--red-text)', text: 'Low' },
    LEARNING: { bg: 'var(--amber-bg, rgba(245,158,11,.12))', color: 'var(--amber-text, #b45309)', text: 'Learning' },
  }
  const s = map[label] || { bg: 'var(--bg3)', color: 'var(--text3)', text: label || 'N/A' }
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: s.bg, color: s.color, fontWeight: 600 }}>{s.text}</span>
}

/* ── Creative thumbnail ── */
function CreativeThumb({ imageUrl, videoId, videoThumb, isVideo, size = 72 }) {
  const [err, setErr] = useState(false)
  const thumbUrl = videoThumb || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null)
  const src = imageUrl || thumbUrl

  if (!src || err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, color: 'var(--text3)', flexShrink: 0,
        border: '1px dashed var(--border)'
      }}>
        {isVideo ? '🎬' : '🖼️'}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid var(--border)' }}>
      <img
        src={src} alt="" onError={() => setErr(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      {isVideo && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,.35)'
        }}>
          <span style={{ fontSize: 22, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.5))' }}>▶</span>
        </div>
      )}
    </div>
  )
}

/* ── Comparison bars ── */
function CompareBar({ items, metric, label, format = 'number' }) {
  if (!items?.length) return null
  const vals = items.map(i => Number(i[metric] || 0))
  const max = Math.max(...vals, 1)
  const formatter = format === 'currency' ? fmtCur : format === 'pct' ? fmtPct : fmt

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
      {items.map((item, idx) => (
        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <div style={{ width: 80, fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{item.name?.slice(0, 15)}</div>
          <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--bg3)', overflow: 'hidden' }}>
            <div style={{
              width: `${(vals[idx] / max) * 100}%`, height: '100%', borderRadius: 3,
              background: idx === 0 ? 'var(--accent)' : idx === 1 ? 'var(--blue, #3b82f6)' : 'var(--purple, #8b5cf6)',
              transition: 'width .4s ease'
            }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', minWidth: 55, textAlign: 'right' }}>{formatter(vals[idx])}</div>
        </div>
      ))}
    </div>
  )
}

/* ── Metric card ── */
function MetricCard({ label, value, sub }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8, background: 'var(--bg2)',
      border: '1px solid var(--border)', minWidth: 100
    }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text1)' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

/* ── Main component ── */
export default function AssetAnalyzerView() {
  const [platform, setPlatform] = useState('google')
  const [dateFrom, setDateFrom] = useState(isoDate(addDays(new Date(), -30)))
  const [dateTo, setDateTo] = useState(isoDate(new Date()))
  const [campaignFilter, setCampaignFilter] = useState('')

  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [setupInstructions, setSetupInstructions] = useState(null)

  const [expandedCampaign, setExpandedCampaign] = useState(null)
  const [adgroups, setAdgroups] = useState({})
  const [loadingAg, setLoadingAg] = useState({})

  const [expandedAdgroup, setExpandedAdgroup] = useState(null)
  const [assets, setAssets] = useState({})
  const [loadingAssets, setLoadingAssets] = useState({})

  /* ── Fetch campaigns ── */
  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSetupInstructions(null)
    setCampaigns([])
    setExpandedCampaign(null)
    setExpandedAdgroup(null)

    try {
      const endpoint = platform === 'google' ? '/api/google-assets' : '/api/meta-assets'
      const params = new URLSearchParams({ dateFrom, dateTo, level: 'campaigns' })
      const res = await fetch(`${endpoint}?${params}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        if (data.setupInstructions) setSetupInstructions(data.setupInstructions)
        return
      }
      setCampaigns(data.campaigns || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [platform, dateFrom, dateTo])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  /* ── Fetch ad groups / adsets ── */
  const toggleCampaign = useCallback(async (campId) => {
    if (expandedCampaign === campId) {
      setExpandedCampaign(null)
      setExpandedAdgroup(null)
      return
    }
    setExpandedCampaign(campId)
    setExpandedAdgroup(null)

    if (adgroups[campId]) return

    setLoadingAg(p => ({ ...p, [campId]: true }))
    try {
      const endpoint = platform === 'google' ? '/api/google-assets' : '/api/meta-assets'
      const level = platform === 'google' ? 'adgroups' : 'adsets'
      const idKey = 'campaignId'
      const params = new URLSearchParams({ dateFrom, dateTo, level, [idKey]: campId })
      const res = await fetch(`${endpoint}?${params}`)
      const data = await res.json()
      const items = data.adgroups || data.adsets || []
      setAdgroups(p => ({ ...p, [campId]: items }))
    } catch (e) {
      setAdgroups(p => ({ ...p, [campId]: [] }))
    } finally {
      setLoadingAg(p => ({ ...p, [campId]: false }))
    }
  }, [expandedCampaign, adgroups, platform, dateFrom, dateTo])

  /* ── Fetch assets / ads ── */
  const toggleAdgroup = useCallback(async (agId) => {
    if (expandedAdgroup === agId) { setExpandedAdgroup(null); return }
    setExpandedAdgroup(agId)

    if (assets[agId]) return

    setLoadingAssets(p => ({ ...p, [agId]: true }))
    try {
      const endpoint = platform === 'google' ? '/api/google-assets' : '/api/meta-assets'
      const level = platform === 'google' ? 'assets' : 'ads'
      const idKey = platform === 'google' ? 'adGroupId' : 'adsetId'
      const params = new URLSearchParams({ dateFrom, dateTo, level, [idKey]: agId })
      const res = await fetch(`${endpoint}?${params}`)
      const data = await res.json()
      setAssets(p => ({ ...p, [agId]: data }))
    } catch (e) {
      setAssets(p => ({ ...p, [agId]: { error: e.message } }))
    } finally {
      setLoadingAssets(p => ({ ...p, [agId]: false }))
    }
  }, [expandedAdgroup, assets, platform, dateFrom, dateTo])

  /* ── Filter campaigns ── */
  const filtered = campaigns.filter(c =>
    !campaignFilter || c.name.toLowerCase().includes(campaignFilter.toLowerCase())
  )

  /* ── Totals ── */
  const totals = filtered.reduce((acc, c) => ({
    spend: acc.spend + (c.spend || 0),
    impressions: acc.impressions + (c.impressions || 0),
    clicks: acc.clicks + (c.clicks || 0),
    conversions: acc.conversions + (c.conversions || c.installs || 0)
  }), { spend: 0, impressions: 0, clicks: 0, conversions: 0 })

  return (
    <div>
      {/* ── Header controls ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center',
        padding: '14px 0', borderBottom: '1px solid var(--border)', marginBottom: 16
      }}>
        {/* Platform toggle */}
        <div style={{
          display: 'flex', borderRadius: 8, overflow: 'hidden',
          border: '1px solid var(--border)', background: 'var(--bg2)'
        }}>
          {[{ id: 'google', label: '🔍 Google UAC' }, { id: 'meta', label: '📱 Meta' }].map(p => (
            <button key={p.id} onClick={() => setPlatform(p.id)} style={{
              padding: '7px 16px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: platform === p.id ? 'var(--accent)' : 'transparent',
              color: platform === p.id ? '#fff' : 'var(--text2)',
              transition: 'all .2s'
            }}>{p.label}</button>
          ))}
        </div>

        {/* Date range */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg2)', color: 'var(--text1)', fontSize: 12
            }} />
          <span style={{ color: 'var(--text3)', fontSize: 11 }}>to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{
              padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--bg2)', color: 'var(--text1)', fontSize: 12
            }} />
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
          <input
            type="text" placeholder="Search campaigns..." value={campaignFilter}
            onChange={e => setCampaignFilter(e.target.value)}
            style={{
              width: '100%', padding: '7px 12px 7px 32px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text1)', fontSize: 12
            }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--text3)' }}>🔎</span>
        </div>

        <button onClick={fetchCampaigns} disabled={loading} style={{
          padding: '7px 18px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 600,
          opacity: loading ? .6 : 1
        }}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {/* ── Error / Setup instructions ── */}
      {error && (
        <div style={{
          padding: 16, borderRadius: 10, marginBottom: 16,
          background: 'var(--red-bg)', border: '1px solid var(--red-text)',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--red-text)', marginBottom: 6, fontSize: 13 }}>⚠ {error}</div>
          {setupInstructions && (
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7 }}>
              {setupInstructions.map((s, i) => <div key={i}>{s}</div>)}
            </div>
          )}
        </div>
      )}

      {/* ── Summary cards ── */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <MetricCard label="Total Spend" value={fmtCur(totals.spend)} sub={`${filtered.length} campaigns`} />
          <MetricCard label="Impressions" value={fmt(totals.impressions)} />
          <MetricCard label="Clicks" value={fmt(totals.clicks)} sub={totals.impressions ? `CTR ${((totals.clicks / totals.impressions) * 100).toFixed(2)}%` : ''} />
          <MetricCard label={platform === 'meta' ? 'Installs/Leads' : 'Conversions'} value={fmt(totals.conversions)}
            sub={totals.conversions > 0 ? `CPA ${fmtCur(totals.spend / totals.conversions)}` : ''} />
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⏳</div>
          <div style={{ fontSize: 13 }}>Fetching {platform === 'google' ? 'Google Ads' : 'Meta'} campaigns…</div>
        </div>
      )}

      {/* ── Campaign list ── */}
      {!loading && filtered.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)', fontSize: 13 }}>
          No enabled campaigns found for the selected date range.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.map(camp => {
          const isExpanded = expandedCampaign === camp.id
          const agList = adgroups[camp.id] || []
          const agLoading = loadingAg[camp.id]
          const ctr = camp.impressions > 0 ? ((camp.clicks / camp.impressions) * 100) : 0
          const cpc = camp.clicks > 0 ? camp.spend / camp.clicks : 0
          const cpa = (camp.conversions || camp.installs || 0) > 0 ? camp.spend / (camp.conversions || camp.installs) : 0

          return (
            <div key={camp.id} style={{
              borderRadius: 10, border: '1px solid var(--border)',
              background: isExpanded ? 'var(--bg1)' : 'var(--bg2)',
              transition: 'all .2s'
            }}>
              {/* Campaign row */}
              <div
                onClick={() => toggleCampaign(camp.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                  cursor: 'pointer', borderRadius: 10, userSelect: 'none'
                }}
              >
                <span style={{
                  fontSize: 11, transition: 'transform .2s',
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0)',
                  color: 'var(--text3)'
                }}>▶</span>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {camp.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>
                    {camp.type || camp.objective || ''}
                    {camp.type && camp.objective ? ` · ${camp.objective}` : ''}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, flexShrink: 0, alignItems: 'center' }}>
                  {[
                    { label: 'Spend', val: fmtCur(camp.spend) },
                    { label: 'Impr', val: fmt(camp.impressions) },
                    { label: 'Clicks', val: fmt(camp.clicks) },
                    { label: 'CTR', val: fmtPct(ctr) },
                    { label: 'CPC', val: fmtCur(cpc) },
                    { label: platform === 'meta' ? 'Installs' : 'Conv', val: fmt(camp.conversions || camp.installs || 0) },
                  ].map((m, i) => (
                    <div key={i} style={{ textAlign: 'right', minWidth: 55 }}>
                      <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>{m.label}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Ad Groups / Adsets ── */}
              {isExpanded && (
                <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border)' }}>
                  {agLoading && (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                      Loading {platform === 'google' ? 'ad groups' : 'ad sets'}…
                    </div>
                  )}

                  {!agLoading && agList.length === 0 && (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                      No enabled {platform === 'google' ? 'ad groups' : 'ad sets'} found.
                    </div>
                  )}

                  {/* Ad Group / Adset performance summary table */}
                  {!agLoading && agList.length > 0 && (
                    <div style={{
                      padding: '14px 0', borderBottom: '1px solid var(--border)', marginBottom: 10,
                      overflowX: 'auto'
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                        {platform === 'google' ? 'Ad Group' : 'Ad Set'} Performance Summary
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            {[
                              { label: platform === 'google' ? 'Ad Group' : 'Ad Set', align: 'left', minW: 140 },
                              { label: 'Spend', align: 'right' },
                              { label: 'Spend+GST', align: 'right' },
                              { label: 'Impr', align: 'right' },
                              { label: 'Clicks', align: 'right' },
                              { label: 'CTR', align: 'right' },
                              { label: 'CPC', align: 'right' },
                              ...(platform === 'google' ? [
                                { label: 'Conversions', align: 'right' },
                                { label: 'CPA', align: 'right' },
                                { label: 'Video Views', align: 'right' },
                              ] : [
                                { label: 'Reach', align: 'right' },
                                { label: 'Installs', align: 'right' },
                                { label: 'CPI', align: 'right' },
                              ])
                            ].map((col, i) => (
                              <th key={i} style={{
                                padding: '8px 10px', fontSize: 10, fontWeight: 600, color: 'var(--text3)',
                                textTransform: 'uppercase', letterSpacing: '.4px', textAlign: col.align,
                                whiteSpace: 'nowrap', background: 'var(--bg2)', minWidth: col.minW || 'auto',
                                borderBottom: '1px solid var(--border)'
                              }}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {agList.map((ag, idx) => {
                            const agCtrVal = ag.impressions > 0 ? ((ag.clicks / ag.impressions) * 100) : 0
                            const agCpcVal = ag.clicks > 0 ? ag.spend / ag.clicks : 0
                            const convOrInstalls = ag.conversions || ag.installs || 0
                            const agCpaVal = convOrInstalls > 0 ? ag.spend / convOrInstalls : 0

                            // Compute averages for rating
                            const allCtrs = agList.map(a => a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0).filter(v => v > 0)
                            const avgCtr = allCtrs.length > 0 ? allCtrs.reduce((a, b) => a + b, 0) / allCtrs.length : 0
                            const allCpas = agList.map(a => { const cv = a.conversions || a.installs || 0; return cv > 0 ? a.spend / cv : 0 }).filter(v => v > 0)
                            const avgCpa = allCpas.length > 0 ? allCpas.reduce((a, b) => a + b, 0) / allCpas.length : 0

                            const ctrRating = avgCtr > 0 && agCtrVal > 0 ? (agCtrVal / avgCtr > 1.15 ? 'good' : agCtrVal / avgCtr < 0.8 ? 'bad' : 'avg') : 'avg'
                            const cpaRating = avgCpa > 0 && agCpaVal > 0 ? (agCpaVal / avgCpa < 0.85 ? 'good' : agCpaVal / avgCpa > 1.2 ? 'bad' : 'avg') : 'avg'

                            return (
                              <tr key={ag.id}
                                onClick={() => toggleAdgroup(ag.id)}
                                style={{
                                  borderBottom: '0.5px solid var(--border)', cursor: 'pointer',
                                  background: expandedAdgroup === ag.id ? 'var(--bg2)' : 'transparent',
                                  transition: 'background .1s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover, var(--bg2))'}
                                onMouseLeave={e => e.currentTarget.style.background = expandedAdgroup === ag.id ? 'var(--bg2)' : 'transparent'}
                              >
                                <td style={{ padding: '9px 10px', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 6, display: 'inline-block', transition: 'transform .15s', transform: expandedAdgroup === ag.id ? 'rotate(90deg)' : 'none' }}>›</span>
                                  {ag.name}
                                </td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{fmtCur(ag.spend)}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>{fmtCur(Math.round(ag.spend * 1.18))}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(ag.impressions)}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(ag.clicks)}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                  {fmtPct(agCtrVal)}
                                  {ctrRating !== 'avg' && <span style={{ fontSize: 9, padding: '1px 3px', borderRadius: 3, background: ctrRating === 'good' ? 'var(--green-bg)' : 'var(--red-bg)', color: ctrRating === 'good' ? 'var(--green-text)' : 'var(--red-text)', fontWeight: 700, marginLeft: 3 }}>{ctrRating === 'good' ? '▲' : '▼'}</span>}
                                </td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{agCpcVal > 0 ? fmtCur(Math.round(agCpcVal)) : '—'}</td>
                                {platform === 'google' ? (
                                  <>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(ag.conversions || 0)}</td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                      {agCpaVal > 0 ? fmtCur(Math.round(agCpaVal)) : '—'}
                                      {cpaRating !== 'avg' && <span style={{ fontSize: 9, padding: '1px 3px', borderRadius: 3, background: cpaRating === 'good' ? 'var(--green-bg)' : 'var(--red-bg)', color: cpaRating === 'good' ? 'var(--green-text)' : 'var(--red-text)', fontWeight: 700, marginLeft: 3 }}>{cpaRating === 'good' ? '▲' : '▼'}</span>}
                                    </td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>{fmt(ag.videoViews || 0)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(ag.reach || 0)}</td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmt(ag.installs || 0)}</td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                      {agCpaVal > 0 ? fmtCur(Math.round(agCpaVal)) : '—'}
                                      {cpaRating !== 'avg' && <span style={{ fontSize: 9, padding: '1px 3px', borderRadius: 3, background: cpaRating === 'good' ? 'var(--green-bg)' : 'var(--red-bg)', color: cpaRating === 'good' ? 'var(--green-text)' : 'var(--red-text)', fontWeight: 700, marginLeft: 3 }}>{cpaRating === 'good' ? '▲' : '▼'}</span>}
                                    </td>
                                  </>
                                )}
                              </tr>
                            )
                          })}
                          {/* Totals row */}
                          {agList.length > 1 && (() => {
                            const totSpend = agList.reduce((s, a) => s + (a.spend || 0), 0)
                            const totImpr = agList.reduce((s, a) => s + (a.impressions || 0), 0)
                            const totClicks = agList.reduce((s, a) => s + (a.clicks || 0), 0)
                            const totConv = agList.reduce((s, a) => s + (a.conversions || a.installs || 0), 0)
                            const totVV = agList.reduce((s, a) => s + (a.videoViews || 0), 0)
                            const totReach = agList.reduce((s, a) => s + (a.reach || 0), 0)
                            const totCtr = totImpr > 0 ? (totClicks / totImpr) * 100 : 0
                            const totCpc = totClicks > 0 ? totSpend / totClicks : 0
                            const totCpa = totConv > 0 ? totSpend / totConv : 0
                            return (
                              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg2)' }}>
                                <td style={{ padding: '9px 10px', fontWeight: 700, fontSize: 11 }}>TOTAL</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtCur(totSpend)}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>{fmtCur(Math.round(totSpend * 1.18))}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(totImpr)}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(totClicks)}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(totCtr)}</td>
                                <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{totCpc > 0 ? fmtCur(Math.round(totCpc)) : '—'}</td>
                                {platform === 'google' ? (
                                  <>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(totConv)}</td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{totCpa > 0 ? fmtCur(Math.round(totCpa)) : '—'}</td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>{fmt(totVV)}</td>
                                  </>
                                ) : (
                                  <>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(totReach)}</td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(totConv)}</td>
                                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{totCpa > 0 ? fmtCur(Math.round(totCpa)) : '—'}</td>
                                  </>
                                )}
                              </tr>
                            )
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {agList.map(ag => {
                    const agExpanded = expandedAdgroup === ag.id
                    const agAssets = assets[ag.id]
                    const agAssetsLoading = loadingAssets[ag.id]

                    if (!agExpanded) return null

                    return (
                      <div key={ag.id} style={{
                        marginTop: 6, borderRadius: 8, border: '1px solid var(--border)',
                        background: 'var(--bg2)',
                      }}>
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                            {ag.name} — Assets
                          </div>
                          <button onClick={() => setExpandedAdgroup(null)} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>✕ Close</button>
                        </div>
                        <div style={{ padding: '0 14px 14px' }}>
                            {agAssetsLoading && (
                              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>Loading assets…</div>
                            )}

                            {!agAssetsLoading && agAssets?.error && (
                              <div style={{ padding: 12, color: 'var(--red-text)', fontSize: 12 }}>Error: {agAssets.error}</div>
                            )}

                            {/* ── Google: Asset-level view ── */}
                            {!agAssetsLoading && platform === 'google' && agAssets && (
                              <div>
                                {/* Asset view (from ad_group_ad_asset_view) */}
                                {agAssets.assets?.length > 0 && (
                                  <div style={{ marginTop: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                                      Asset Performance ({agAssets.assets.length})
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                                      {agAssets.assets.map(asset => {
                                        const aCtr = asset.impressions > 0 ? ((asset.clicks / asset.impressions) * 100) : 0
                                        return (
                                          <div key={asset.id} style={{
                                            borderRadius: 10, border: '1px solid var(--border)',
                                            padding: 12, background: 'var(--bg1)',
                                            display: 'flex', gap: 12
                                          }}>
                                            <CreativeThumb
                                              imageUrl={asset.imageUrl}
                                              videoId={asset.youtubeVideoId}
                                              isVideo={asset.type === 'YOUTUBE_VIDEO'}
                                              size={80}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg3)', color: 'var(--text3)', fontWeight: 600 }}>
                                                  {asset.type === 'YOUTUBE_VIDEO' ? '🎬 Video' : asset.type === 'IMAGE' ? '🖼 Image' : asset.fieldType || asset.type}
                                                </span>
                                                <PerfLabel label={asset.performanceLabel} />
                                              </div>
                                              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {asset.youtubeVideoTitle || asset.name || `Asset ${asset.id}`}
                                              </div>
                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 12px', fontSize: 11 }}>
                                                <div><span style={{ color: 'var(--text3)' }}>Spend</span> <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmtCur(asset.spend)}</span></div>
                                                <div><span style={{ color: 'var(--text3)' }}>Impr</span> <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmt(asset.impressions)}</span></div>
                                                <div><span style={{ color: 'var(--text3)' }}>Clicks</span> <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmt(asset.clicks)}</span></div>
                                                <div><span style={{ color: 'var(--text3)' }}>CTR</span> <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmtPct(aCtr)}</span>
                                                  <RatingBadge value={aCtr} thresholds={[1, 3]} />
                                                </div>
                                                <div><span style={{ color: 'var(--text3)' }}>Conv</span> <span style={{ fontWeight: 600, color: 'var(--text1)' }}>{fmt(asset.conversions)}</span></div>
                                              </div>
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Fallback: Ad-level if no asset view data */}
                                {(!agAssets.assets || agAssets.assets.length === 0) && agAssets.ads?.length > 0 && (
                                  <div style={{ marginTop: 12 }}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                                      Ads ({agAssets.ads.length})
                                    </div>
                                    {agAssets.ads.map(ad => (
                                      <div key={ad.id} style={{
                                        display: 'flex', gap: 10, padding: '10px 0',
                                        borderBottom: '1px solid var(--border)'
                                      }}>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text1)' }}>{ad.name}</div>
                                          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>Type: {ad.type}</div>
                                          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 11 }}>
                                            <span><span style={{ color: 'var(--text3)' }}>Spend</span> {fmtCur(ad.spend)}</span>
                                            <span><span style={{ color: 'var(--text3)' }}>Clicks</span> {fmt(ad.clicks)}</span>
                                            <span><span style={{ color: 'var(--text3)' }}>Conv</span> {fmt(ad.conversions)}</span>
                                          </div>
                                          {ad.headlines?.length > 0 && (
                                            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>
                                              Headlines: {ad.headlines.join(' | ')}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {(!agAssets.assets || agAssets.assets.length === 0) && (!agAssets.ads || agAssets.ads.length === 0) && (
                                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                                    No asset data available for this ad group.
                                  </div>
                                )}
                              </div>
                            )}

                            {/* ── Meta: Ad creative view ── */}
                            {!agAssetsLoading && platform === 'meta' && agAssets?.ads && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                                  Ad Creatives ({agAssets.ads.length})
                                </div>

                                {agAssets.ads.length === 0 && (
                                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
                                    No enabled ads found.
                                  </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                                  {agAssets.ads.map(ad => {
                                    const adCtr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100) : 0
                                    const cpa = (ad.installs || ad.leads || 0) > 0 ? ad.spend / (ad.installs || ad.leads) : 0

                                    return (
                                      <div key={ad.id} style={{
                                        borderRadius: 12, border: '1px solid var(--border)',
                                        background: 'var(--bg1)', overflow: 'hidden'
                                      }}>
                                        {/* Creative preview */}
                                        <div style={{
                                          display: 'flex', gap: 10, padding: 12,
                                          borderBottom: '1px solid var(--border)'
                                        }}>
                                          <CreativeThumb
                                            imageUrl={ad.imageUrl}
                                            videoId={ad.videoId}
                                            videoThumb={ad.videoThumb}
                                            isVideo={ad.isVideo}
                                            size={88}
                                          />
                                          <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                              {ad.name}
                                            </div>
                                            {ad.title && (
                                              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>{ad.title}</div>
                                            )}
                                            {ad.body && (
                                              <div style={{ fontSize: 10, color: 'var(--text3)', lineHeight: 1.4, maxHeight: 40, overflow: 'hidden' }}>
                                                {ad.body.slice(0, 120)}{ad.body.length > 120 ? '…' : ''}
                                              </div>
                                            )}
                                            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                                              <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg3)', color: 'var(--text3)', fontWeight: 600 }}>
                                                {ad.isVideo ? '🎬 Video' : '🖼 Image'}
                                              </span>
                                              {ad.assetFeedImages?.length > 0 && (
                                                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'var(--bg3)', color: 'var(--text3)', fontWeight: 600 }}>
                                                  📎 {ad.assetFeedImages.length} images
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Metrics grid */}
                                        <div style={{ padding: 12 }}>
                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 10px' }}>
                                            {[
                                              { label: 'Spend', val: fmtCur(ad.spend) },
                                              { label: 'Impressions', val: fmt(ad.impressions) },
                                              { label: 'Reach', val: fmt(ad.reach) },
                                              { label: 'Clicks', val: fmt(ad.clicks) },
                                              { label: 'CTR', val: fmtPct(adCtr), badge: <RatingBadge value={adCtr} thresholds={[1, 3]} /> },
                                              { label: 'CPC', val: ad.clicks > 0 ? fmtCur(ad.spend / ad.clicks) : '—' },
                                              { label: 'Installs', val: fmt(ad.installs) },
                                              { label: 'CPA', val: cpa > 0 ? fmtCur(cpa) : '—', badge: cpa > 0 ? <RatingBadge value={cpa} thresholds={[50, 200]} reverse /> : null },
                                              { label: 'Leads', val: fmt(ad.leads) },
                                            ].map((m, i) => (
                                              <div key={i}>
                                                <div style={{ fontSize: 9, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.3px' }}>{m.label}</div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)', marginTop: 1 }}>
                                                  {m.val}{m.badge || null}
                                                </div>
                                              </div>
                                            ))}
                                          </div>

                                          {/* Video metrics if applicable */}
                                          {ad.isVideo && (ad.videoP25 > 0 || ad.hookRate > 0) && (
                                            <div style={{
                                              marginTop: 10, paddingTop: 10,
                                              borderTop: '1px solid var(--border)'
                                            }}>
                                              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                                                Video Metrics
                                              </div>
                                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                                                <div>
                                                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>Hook Rate</div>
                                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                                                    {ad.hookRate}%
                                                    <RatingBadge value={ad.hookRate} thresholds={[20, 40]} />
                                                  </div>
                                                </div>
                                                <div>
                                                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>Hold Rate</div>
                                                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text1)' }}>
                                                    {ad.holdRate}%
                                                    <RatingBadge value={ad.holdRate} thresholds={[15, 30]} />
                                                  </div>
                                                </div>
                                                <div>
                                                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>25% View</div>
                                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)' }}>{fmt(ad.videoP25)}</div>
                                                </div>
                                                <div>
                                                  <div style={{ fontSize: 9, color: 'var(--text3)' }}>100% View</div>
                                                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text1)' }}>{fmt(ad.videoP100)}</div>
                                                </div>
                                              </div>

                                              {/* Video completion funnel */}
                                              {ad.videoP25 > 0 && (
                                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, marginTop: 8, height: 28 }}>
                                                  {[
                                                    { label: '25%', val: ad.videoP25 },
                                                    { label: '50%', val: ad.videoP50 },
                                                    { label: '75%', val: ad.videoP75 },
                                                    { label: '100%', val: ad.videoP100 },
                                                  ].map((step, idx) => {
                                                    const maxV = Math.max(ad.videoP25, 1)
                                                    const h = (step.val / maxV) * 28
                                                    return (
                                                      <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                        <div style={{
                                                          width: '100%', height: h, borderRadius: 3,
                                                          background: `rgba(var(--accent-rgb, 99,102,241), ${0.3 + (idx * 0.2)})`,
                                                          minHeight: 3
                                                        }} />
                                                        <span style={{ fontSize: 8, color: 'var(--text3)' }}>{step.label}</span>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        {/* Carousel / multi-image assets */}
                                        {ad.assetFeedImages?.length > 1 && (
                                          <div style={{ padding: '0 12px 12px' }}>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase' }}>
                                              Carousel Assets
                                            </div>
                                            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
                                              {ad.assetFeedImages.map((img, idx) => (
                                                <CreativeThumb key={idx} imageUrl={img} size={56} />
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style jsx>{`
        input[type="date"]::-webkit-calendar-picker-indicator {
          filter: var(--cal-icon-filter, none);
        }
        div::-webkit-scrollbar { width: 4px; height: 4px; }
        div::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
      `}</style>
    </div>
  )
}
