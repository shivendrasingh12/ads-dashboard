import { useState, useEffect, useCallback, useRef } from 'react'
import Head from 'next/head'
import UACFunnelView from '../components/UACFunnelView'
import Chatbot from '../components/Chatbot'

const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const isoDate = d => d.toISOString().split('T')[0]
const today = new Date()
const DEFAULT_FROM = isoDate(addDays(today, -30))
const DEFAULT_TO = isoDate(today)

/* ── Helpers ── */
function fmtVal(key, val) {
  if (!val && val !== 0) return '—'
  if (key === 'spend' || key === 'cpc' || key === 'cpa') return val > 0 ? '₹' + Number(val).toLocaleString('en-IN') : '—'
  if (key === 'ctr') return val > 0 ? val + '%' : '—'
  if (key === 'frequency') return val > 0 ? Number(val).toFixed(2) : '—'
  if (key === 'impressions' || key === 'reach' || key === 'clicks') return val > 0 ? Number(val).toLocaleString('en-IN') : '—'
  if (key === 'cpm') return val > 0 ? '₹' + val : '—'
  if (key === 'conversions') return val >= 0 ? String(val) : '—'
  return val > 0 ? val : '—'
}

/* ── Shared UI atoms ── */
function PlatBadge({ platform }) {
  const s = platform === 'google'
    ? { bg: '#EFF6FF', color: '#1D4ED8', label: 'G' }
    : platform === 'meta'
    ? { bg: '#F5F3FF', color: '#6D28D9', label: 'M' }
    : { bg: '#F1F5F9', color: '#475569', label: 'B' }
  return <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600, background: s.bg, color: s.color, letterSpacing: '.02em' }}>{s.label}</span>
}

function StatusPill({ status }) {
  const map = {
    active:  { bg: '#F0FDF4', color: '#15803D', dot: '#16A34A', label: 'Active' },
    paused:  { bg: '#F8FAFC', color: '#475569', dot: '#94A3B8', label: 'Paused' },
    removed: { bg: '#F8FAFC', color: '#94A3B8', dot: '#CBD5E1', label: 'Removed' },
    unknown: { bg: '#F8FAFC', color: '#94A3B8', dot: '#CBD5E1', label: 'Unknown' },
  }
  const s = map[status] || map.unknown
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 8px', borderRadius: 99, background: s.bg, color: s.color, fontWeight: 500 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

function Skeleton({ w }) {
  return <div style={{ height: 12, width: w || 80, borderRadius: 4, background: 'var(--bg3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>{children}</div>
}

/* ── Typeahead ── */
function CampaignTypeahead({ value, onChange, campaigns }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value || '')
  const ref = useRef(null)
  useEffect(() => { setQ(value || '') }, [value])
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const suggestions = campaigns.filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  return (
    <div ref={ref} style={{ position: 'relative', flex: 3 }}>
      <input className="form-input" placeholder="Campaign / ad name..."
        value={q}
        onChange={e => { setQ(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        style={{ width: '100%' }}
      />
      {open && suggestions.length > 0 && (
        <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4, maxHeight: 240, overflowY: 'auto' }}>
          {suggestions.map(c => (
            <div key={c.id} className="dropdown-item"
              onMouseDown={() => { setQ(c.name); onChange(c.name); setOpen(false) }}>
              <PlatBadge platform={c.platform} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{c.name}</span>
              <StatusPill status={c.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── ALERTS VIEW ── */
function AlertsView({ filters }) {
  const [campaigns, setCampaigns] = useState([])
  const [changes, setChanges] = useState([])
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState([])

  useEffect(() => {
    setLoading(true)
    const qs = new URLSearchParams({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, platform: filters.platform }).toString()
    Promise.all([
      fetch(`/api/campaigns?${qs}`).then(r => r.json()),
      fetch(`/api/changes?${qs}`).then(r => r.json()),
    ]).then(([camp, chg]) => {
      setCampaigns(camp.campaigns || [])
      setChanges(chg.changes || [])
      setErrors([...(camp.errors || []), ...(chg.errors || [])])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [filters])

  const filtered = campaigns.filter(c => !filters.campaign || c.name.toLowerCase().includes(filters.campaign))
  const paused7d = filtered.filter(c => c.status === 'paused')
  const budgetAlert = filtered.filter(c => c.budget > 0 && (c.spend / c.budget) > 0.9 && c.status === 'active')

  const CAT_COLORS = { Bids: '#purple-bg', Budget: '#blue-bg', Status: '#amber-bg', Assets: '#green-bg', Targeting: '#blue-bg', Other: '' }
  const CAT_STYLE = {
    Bids:      { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
    Budget:    { bg: 'var(--blue-bg)',   color: 'var(--blue-text)'   },
    Status:    { bg: 'var(--amber-bg)',  color: 'var(--amber-text)'  },
    Assets:    { bg: 'var(--green-bg)',  color: 'var(--green-text)'  },
    Targeting: { bg: 'var(--blue-bg)',   color: 'var(--blue-text)'   },
    Other:     { bg: 'var(--bg3)',       color: 'var(--text3)'       },
  }

  function categorise(fields) {
    const f = (Array.isArray(fields) ? fields.join(' ') : String(fields || '')).toLowerCase()
    if (f.includes('bid') || f.includes('cpc') || f.includes('cpa') || f.includes('target')) return 'Bids'
    if (f.includes('budget')) return 'Budget'
    if (f.includes('status')) return 'Status'
    if (f.includes('headline') || f.includes('description') || f.includes('asset')) return 'Assets'
    if (f.includes('target') || f.includes('audience') || f.includes('location')) return 'Targeting'
    return 'Other'
  }

  const filteredChanges = changes.filter(c => {
    if (!filters.campaign) return true
    return (c.campaign || '').toLowerCase().includes(filters.campaign) || (c.adGroup || '').toLowerCase().includes(filters.campaign)
  })

  const allEditors = [...new Set(changes.map(c => c.who).filter(Boolean))]

  return (
    <div className="view-content">
      {/* Alert banners */}
      {paused7d.length > 0 && (
        <div className="alert-card alert-red">
          <div className="alert-icon">⚠</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{paused7d.length} campaign{paused7d.length > 1 ? 's' : ''} paused in the last 7 days</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {paused7d.map(c => (
                <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, background: 'rgba(220,38,38,.08)', padding: '2px 8px', borderRadius: 6 }}>
                  <PlatBadge platform={c.platform} /> {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      {budgetAlert.length > 0 && (
        <div className="alert-card alert-amber">
          <div className="alert-icon">!</div>
          <div style={{ fontSize: 13 }}>
            <strong>{budgetAlert.length} campaign{budgetAlert.length > 1 ? 's' : ''}</strong> above 90% budget utilisation: {budgetAlert.map(c => c.name).join(', ')}
          </div>
        </div>
      )}

      {/* Change history */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Change history</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>Google Ads · {filteredChanges.length} changes</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date / Time</th><th>Campaign</th><th>Ad group</th>
                <th>Category</th><th>What changed</th><th>Editor</th>
              </tr>
            </thead>
            <tbody>
              {loading && [1,2,3].map(i => (
                <tr key={i}><td colSpan={6} style={{ padding: '10px 16px' }}><Skeleton w="100%" /></td></tr>
              ))}
              {!loading && filteredChanges.length === 0 && (
                <tr><td colSpan={6} className="empty-state">No changes in this date range</td></tr>
              )}
              {filteredChanges.map((r, i) => {
                const d = r.time ? new Date(r.time) : null
                const timeStr = d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'
                const cat = categorise(r.changedFields)
                const catS = CAT_STYLE[cat] || CAT_STYLE.Other
                const fields = Array.isArray(r.changedFields) ? r.changedFields : r.changedFields ? [r.changedFields] : []
                const editor = (r.who || 'API').split('@')[0]
                return (
                  <tr key={i}>
                    <td style={{ color: 'var(--text3)', fontSize: 12, whiteSpace: 'nowrap' }}>{timeStr}</td>
                    <td style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.campaign || '—'}</td>
                    <td style={{ color: 'var(--text3)', fontSize: 12, maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.adGroup || '—'}</td>
                    <td><span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, fontWeight: 500, background: catS.bg, color: catS.color }}>{cat}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {fields.map((f, fi) => <span key={fi} style={{ fontSize: 11, background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, color: 'var(--text2)' }}>{f.replace(/_/g, ' ')}</span>)}
                        {r.operation === 'REMOVE' && <span style={{ fontSize: 11, color: 'var(--red-text)' }}>Removed</span>}
                        {r.operation === 'CREATE' && <span style={{ fontSize: 11, color: 'var(--green-text)' }}>Created</span>}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--blue-bg)', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>{editor.slice(0,2).toUpperCase()}</div>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>{editor}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Campaign overview */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header">
          <div className="card-title">Campaign overview</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} campaigns</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr><th>Campaign</th><th>Platform</th><th>Status</th><th>Budget</th><th>Spend</th><th>CTR</th><th>CPC</th><th>Conv</th><th>CPA</th></tr>
            </thead>
            <tbody>
              {loading && [1,2,3,4].map(i => <tr key={i}><td colSpan={9} style={{ padding: '10px 16px' }}><Skeleton w="100%" /></td></tr>)}
              {!loading && filtered.length === 0 && <tr><td colSpan={9} className="empty-state">No campaigns found</td></tr>}
              {filtered.map(c => {
                const pct = c.budget > 0 ? Math.min(100, Math.round(c.spend / c.budget * 100)) : 0
                const barColor = pct > 90 ? 'var(--red)' : pct > 70 ? 'var(--amber)' : 'var(--green)'
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 500, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</td>
                    <td><PlatBadge platform={c.platform} /></td>
                    <td><StatusPill status={c.status} /></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.budget > 0 ? '₹' + c.budget.toLocaleString('en-IN') : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 48, height: 4, borderRadius: 99, background: 'var(--bg3)', overflow: 'hidden', flexShrink: 0 }}>
                          <div style={{ width: pct + '%', height: '100%', background: barColor, borderRadius: 99 }} />
                        </div>
                        <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>₹{(c.spend || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.ctr > 0 ? c.ctr + '%' : '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.cpc > 0 ? '₹' + c.cpc : '—'}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.conversions || 0}</td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{c.cpa > 0 ? '₹' + c.cpa : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── REMINDERS VIEW ── */
function RemindersView({ filters, allCampaigns }) {
  const [reminders, setReminders] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ camp: '', action: 'pause', plat: 'Google', date: '', reason: '', notes: '' })

  const load = useCallback(() => {
    fetch('/api/reminders').then(r => r.json()).then(d => { setReminders(d.reminders || []); setLoading(false) })
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = reminders.filter(r => !filters.campaign || (r.camp || '').toLowerCase().includes(filters.campaign))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  const ACTION_LABEL = { pause: 'Pause', resume: 'Resume', remove: 'Remove ad', budget: 'Change budget', bid: 'Adjust bid', review: 'Review' }
  const ACTION_COLOR = {
    pause:  { bg: 'var(--amber-bg)',  color: 'var(--amber-text)'  },
    resume: { bg: 'var(--green-bg)',  color: 'var(--green-text)'  },
    remove: { bg: 'var(--red-bg)',    color: 'var(--red-text)'    },
    budget: { bg: 'var(--blue-bg)',   color: 'var(--blue-text)'   },
    bid:    { bg: 'var(--purple-bg)', color: 'var(--purple-text)' },
    review: { bg: 'var(--blue-bg)',   color: 'var(--blue-text)'   },
  }
  const PLAT_CLS = { Google: 'pg', Meta: 'pm', Both: 'pb' }

  async function handleAdd() {
    if (!form.camp || !form.date) return alert('Campaign name and date are required')
    await fetch('/api/reminders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ camp: '', action: 'pause', plat: 'Google', date: '', reason: '', notes: '' })
    load()
  }

  return (
    <div className="view-content">
      <div className="card">
        <div className="card-header">
          <div className="card-title">Upcoming actions</div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{filtered.length} scheduled</div>
        </div>

        {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)' }}>Loading...</div>}
        {!loading && filtered.length === 0 && <div className="empty-state">No reminders yet</div>}

        <div style={{ padding: '0 16px 16px' }}>
          {filtered.map(r => {
            const d = new Date(r.date)
            const diff = Math.round((d - today) / 86400000)
            const isUrgent = diff <= 1
            const isWarn = diff <= 4 && diff > 1
            const ac = ACTION_COLOR[r.action] || ACTION_COLOR.review
            return (
              <div key={r.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0',
                borderBottom: '0.5px solid var(--border)',
                borderLeft: isUrgent ? '3px solid var(--red)' : isWarn ? '3px solid var(--amber)' : '3px solid transparent',
                paddingLeft: isUrgent || isWarn ? 12 : 0,
              }}>
                <div style={{ textAlign: 'center', minWidth: 40 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1, color: isUrgent ? 'var(--red)' : 'var(--text)' }}>{d.getDate()}</div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{d.toLocaleDateString('en-IN', { month: 'short' })}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{r.camp}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6 }}>{r.reason}{r.notes ? ' · ' + r.notes : ''}</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, fontWeight: 500, background: ac.bg, color: ac.color }}>{ACTION_LABEL[r.action]}</span>
                    <PlatBadge platform={r.plat?.toLowerCase() === 'meta' ? 'meta' : 'google'} />
                    {diff <= 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, fontWeight: 600, background: 'var(--red-bg)', color: 'var(--red-text)' }}>Today</span>}
                    {diff === 1 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 5, fontWeight: 600, background: 'var(--amber-bg)', color: 'var(--amber-text)' }}>Tomorrow</span>}
                  </div>
                </div>
                <button className="btn-ghost btn-sm" onClick={async () => { await fetch(`/api/reminders?id=${r.id}`, { method: 'DELETE' }); load() }}>Dismiss</button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-header"><div className="card-title">Add reminder</div></div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CampaignTypeahead value={form.camp} onChange={v => setForm(f => ({ ...f, camp: v }))} campaigns={allCampaigns} />
            <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: 160 }} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select className="form-select" value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))}>
              <option value="pause">Pause campaign</option>
              <option value="resume">Resume campaign</option>
              <option value="remove">Remove ad</option>
              <option value="budget">Change budget</option>
              <option value="bid">Adjust bid</option>
              <option value="review">Manual review</option>
            </select>
            <select className="form-select" value={form.plat} onChange={e => setForm(f => ({ ...f, plat: e.target.value }))}>
              <option>Google</option><option>Meta</option><option>Both</option>
            </select>
            <input className="form-input" placeholder="Reason" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={{ flex: 2, minWidth: 160 }} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input className="form-input" placeholder="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ flex: 3 }} />
            <button className="btn-primary" onClick={handleAdd}>Add reminder</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── ADS ANALYSER VIEW ── */
const AD_METRICS = [
  { key: 'impressions', label: 'Impressions' }, { key: 'clicks', label: 'Clicks' },
  { key: 'ctr', label: 'CTR %' }, { key: 'cpc', label: 'CPC ₹' },
  { key: 'spend', label: 'Spend ₹' }, { key: 'conversions', label: 'Conv.' },
  { key: 'cpa', label: 'CPA ₹' }, { key: 'cpm', label: 'CPM ₹' },
  { key: 'reach', label: 'Reach' }, { key: 'frequency', label: 'Freq.' },
]

function relativeRating(val, allVals, lowerIsBetter = false) {
  const valid = allVals.filter(v => v > 0)
  if (valid.length < 2 || !val) return 'avg'
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length
  const ratio = val / avg
  if (lowerIsBetter) return ratio < 0.85 ? 'good' : ratio > 1.2 ? 'bad' : 'avg'
  return ratio > 1.15 ? 'good' : ratio < 0.8 ? 'bad' : 'avg'
}

function AdsetRow({ adset, ads, allCtrs, allCpcs }) {
  const [expanded, setExpanded] = useState(false)
  const ctrR = relativeRating(adset.ctr, allCtrs)
  const cpcR = relativeRating(adset.cpc, allCpcs, true)
  const myAds = ads.filter(a => a.adGroupId === adset.id || a.adgroup === adset.name)
  const adCtrs = myAds.map(a => a.ctr)
  const adCpcs = myAds.map(a => a.cpc)

  function RatingBadge({ r }) {
    if (!r || r === 'avg') return null
    return r === 'good'
      ? <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--green-bg)', color: 'var(--green-text)', fontWeight: 600 }}>▲</span>
      : <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'var(--red-bg)', color: 'var(--red-text)', fontWeight: 600 }}>▼</span>
  }

  return (
    <>
      <tr style={{ cursor: 'pointer', background: expanded ? 'var(--bg2)' : 'transparent' }} onClick={() => setExpanded(!expanded)}>
        <td style={{ paddingLeft: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text3)', transition: 'transform .15s', display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'none' }}>›</span>
            <div>
              <div style={{ fontWeight: 500 }}>{adset.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{myAds.length} ad{myAds.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </td>
        {AD_METRICS.map(m => (
          <td key={m.key} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmtVal(m.key, adset[m.key])}
            {m.key === 'ctr' && <RatingBadge r={ctrR} />}
            {m.key === 'cpc' && <RatingBadge r={cpcR} />}
          </td>
        ))}
      </tr>
      {expanded && myAds.map(ad => (
        <tr key={ad.id} style={{ background: 'var(--bg2)', fontSize: 12 }}>
          <td style={{ paddingLeft: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 2, height: 24, background: 'var(--border2)', borderRadius: 1, flexShrink: 0 }} />
              <span style={{ color: 'var(--text2)' }}>{ad.name}</span>
            </div>
          </td>
          {AD_METRICS.map(m => (
            <td key={m.key} style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text2)' }}>
              {fmtVal(m.key, ad[m.key])}
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function CampaignBlock({ campaign, filters, chartMetric }) {
  const [adsets, setAdsets] = useState([])
  const [ads, setAds] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('adgroups')
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const qs = new URLSearchParams({ dateFrom: filters.dateFrom, dateTo: filters.dateTo, platform: campaign.platform, campaignFilter: campaign.name }).toString()
    Promise.all([fetch(`/api/adgroups?${qs}`).then(r => r.json()), fetch(`/api/ads?${qs}`).then(r => r.json())])
      .then(([ag, a]) => {
        setAdsets((ag.adgroups || []).filter(x => x.campaignId === campaign.id || x.campaign === campaign.name))
        setAds((a.ads || []).filter(x => x.campaignId === campaign.id || x.campaign === campaign.name))
        setLoading(false)
      })
  }, [campaign, filters])

  const displayData = activeTab === 'adgroups' ? adsets : ads
  const allCtrs = displayData.map(d => d.ctr)
  const allCpcs = displayData.map(d => d.cpc)

  return (
    <div className="card" style={{ marginBottom: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', borderBottom: collapsed ? 'none' : '0.5px solid var(--border)' }} onClick={() => setCollapsed(!collapsed)}>
        <span style={{ fontSize: 12, color: 'var(--text3)', transition: 'transform .15s', display: 'inline-block', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>▾</span>
        <PlatBadge platform={campaign.platform} />
        <span style={{ fontWeight: 600, fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{campaign.name}</span>
        <StatusPill status={campaign.status} />
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text2)' }}>
          <span>₹{(campaign.spend || 0).toLocaleString('en-IN')}</span>
          <span>{campaign.ctr || 0}% CTR</span>
          <span>{campaign.conversions || 0} conv</span>
        </div>
      </div>

      {!collapsed && (
        <>
          <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', padding: '0 16px' }}>
            {['adgroups', 'ads'].map(t => (
              <div key={t} style={{ padding: '8px 12px', fontSize: 12, cursor: 'pointer', borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent', color: activeTab === t ? 'var(--accent)' : 'var(--text3)', fontWeight: activeTab === t ? 600 : 400, marginBottom: -0.5 }} onClick={() => setActiveTab(t)}>
                {t === 'adgroups' ? (campaign.platform === 'meta' ? 'Adsets' : 'Ad groups') : 'Ads'}
                {' '}({t === 'adgroups' ? adsets.length : ads.length})
              </div>
            ))}
          </div>
          {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Loading...</div>}
          {!loading && displayData.length === 0 && <div className="empty-state">No data for this date range</div>}
          {!loading && displayData.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: 200 }}>{activeTab === 'adgroups' ? campaign.platform === 'meta' ? 'Adset' : 'Ad group' : 'Ad'}</th>
                    {activeTab === 'ads' && <th>Ad group</th>}
                    {AD_METRICS.map(m => <th key={m.key}>{m.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'adgroups'
                    ? adsets.map(a => <AdsetRow key={a.id} adset={a} ads={ads} allCtrs={allCtrs} allCpcs={allCpcs} />)
                    : ads.map(ad => (
                      <tr key={ad.id}>
                        <td style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.name}</td>
                        <td style={{ color: 'var(--text3)', fontSize: 12, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.adgroup}</td>
                        {AD_METRICS.map(m => <td key={m.key} style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtVal(m.key, ad[m.key])}</td>)}
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function AnalyserView({ filters, allCampaigns }) {
  const [selectedCampaigns, setSelectedCampaigns] = useState([])
  const [search, setSearch] = useState('')
  const [activeOnly, setActiveOnly] = useState(true)
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)

  useEffect(() => {
    const h = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const dropCampaigns = allCampaigns.filter(c => {
    const ms = !search || c.name.toLowerCase().includes(search.toLowerCase())
    const mp = filters.platform === 'all' || c.platform === filters.platform
    const mc = !filters.campaign || c.name.toLowerCase().includes(filters.campaign)
    const ma = !activeOnly || c.status === 'active'
    return ms && mp && mc && ma
  })

  function toggle(c) {
    setSelectedCampaigns(prev => prev.find(x => x.id === c.id) ? prev.filter(x => x.id !== c.id) : [...prev, c])
  }

  return (
    <div className="view-content">
      {/* Campaign selector */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header"><div className="card-title">Select campaigns to analyse</div></div>
        <div style={{ padding: '0 16px 16px' }}>
          {selectedCampaigns.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {selectedCampaigns.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--blue-bg)', border: '0.5px solid var(--accent)', borderRadius: 99, padding: '4px 10px', fontSize: 12 }}>
                  <PlatBadge platform={c.platform} />
                  <span style={{ color: 'var(--blue-text)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                  <span style={{ cursor: 'pointer', color: 'var(--blue-text)', fontSize: 14, fontWeight: 500 }} onClick={() => toggle(c)}>×</span>
                </div>
              ))}
              <button className="btn-ghost btn-sm" onClick={() => setSelectedCampaigns([])}>Clear all</button>
            </div>
          )}
          <div ref={dropRef} style={{ position: 'relative', maxWidth: 560 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border2)', borderRadius: 'var(--r-md)', background: 'var(--bg)', overflow: 'hidden' }}>
              <input
                style={{ flex: 1, padding: '9px 12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, outline: 'none' }}
                placeholder="Search campaigns..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => setDropOpen(true)}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 12px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', borderLeft: '0.5px solid var(--border)', whiteSpace: 'nowrap', userSelect: 'none' }}>
                <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)} style={{ margin: 0 }} />
                Active only
              </label>
            </div>
            {dropOpen && (
              <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, marginTop: 4, maxHeight: 280, overflowY: 'auto' }}>
                {dropCampaigns.length === 0 && <div style={{ padding: 12, fontSize: 12, color: 'var(--text3)' }}>No campaigns found</div>}
                {dropCampaigns.map(c => {
                  const sel = !!selectedCampaigns.find(x => x.id === c.id)
                  return (
                    <div key={c.id} className="dropdown-item" style={{ background: sel ? 'var(--blue-bg)' : undefined }} onClick={() => toggle(c)}>
                      <div style={{ width: 14, height: 14, border: `1.5px solid ${sel ? 'var(--accent)' : 'var(--border2)'}`, borderRadius: 3, background: sel ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {sel && <span style={{ color: '#fff', fontSize: 9 }}>✓</span>}
                      </div>
                      <PlatBadge platform={c.platform} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13 }}>{c.name}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>₹{(c.spend || 0).toLocaleString('en-IN')}</span>
                      <StatusPill status={c.status} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCampaigns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', border: '1.5px dashed var(--border2)', borderRadius: 'var(--r-lg)', color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>Select campaigns above to analyse</div>
          <div style={{ fontSize: 13 }}>Multi-select to compare across campaigns. Click adset rows to see individual ads.</div>
        </div>
      )}
      {selectedCampaigns.map(c => <CampaignBlock key={c.id} campaign={c} filters={filters} />)}
    </div>
  )
}

function ConnectView() {
  const [status, setStatus] = useState(null)
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatus) }, [])
  return (
    <div className="view-content">
      <div className="card">
        <div className="card-header"><div className="card-title">Platform connections</div></div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { key: 'google', label: 'Google Ads', icon: 'G', desc: 'Campaigns, ad groups, ads, change history', docsUrl: 'https://developers.google.com/google-ads/api' },
            { key: 'meta',   label: 'Meta Ads',   icon: 'M', desc: 'Campaigns, adsets, ads performance',        docsUrl: 'https://developers.facebook.com/docs/marketing-apis' },
          ].map(p => {
            const s = status?.[p.key]
            return (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', background: 'var(--bg2)' }}>
                <PlatBadge platform={p.key} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{p.desc}</div>
                  {s?.missing?.length > 0 && <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 4 }}>Missing: {s.missing.join(', ')}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {s ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: s.connected ? 'var(--green)' : 'var(--text3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.connected ? 'var(--green)' : 'var(--border2)', display: 'inline-block' }} />
                      {s.connected ? 'Connected' : 'Not connected'}
                    </span>
                  ) : <span style={{ fontSize: 12, color: 'var(--text3)' }}>Checking...</span>}
                  <a href={p.docsUrl} target="_blank" rel="noreferrer" className="btn-ghost btn-sm" style={{ textDecoration: 'none' }}>Docs ↗</a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ── MAIN DASHBOARD ── */
const NAV_ITEMS = [
  { id: 'alerts',    label: 'Change Alerts',           icon: '🔔', group: 'Views'    },
  { id: 'reminders', label: 'Schedule Reminders',       icon: '📅', group: 'Views'    },
  { id: 'analyser',  label: 'Ads Analyser',             icon: '📊', group: 'Views'    },
  { id: 'uac',       label: 'UAC — ROI Cities',         icon: '🚀', group: 'Funnels'  },
  { id: 'uact1',     label: 'UAC — Type 1',             icon: '🏙️', group: 'Funnels'  },
  { id: 'connect',   label: 'API Connections',          icon: '🔗', group: 'Setup'    },
]
const VIEW_TITLES = {
  alerts: 'Change Alerts', reminders: 'Schedule Reminders', analyser: 'Ads Analyser',
  uac: 'UAC Funnel — ROI Cities', uact1: 'UAC Funnel — Type 1', connect: 'API Connections',
}

export default function Dashboard() {
  const [view, setView] = useState('alerts')
  const [theme, setTheme] = useState('light')
  const [filters, setFilters] = useState({ campaign: '', dateFrom: DEFAULT_FROM, dateTo: DEFAULT_TO, platform: 'all' })
  const [allCampaigns, setAllCampaigns] = useState([])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    const qs = new URLSearchParams({ dateFrom: DEFAULT_FROM, dateTo: DEFAULT_TO, platform: 'all' }).toString()
    fetch(`/api/campaigns?${qs}`).then(r => r.json()).then(d => setAllCampaigns(d.campaigns || []))
  }, [])

  const groups = [...new Set(NAV_ITEMS.map(n => n.group))]

  return (
    <>
      <Head>
        <title>Ads Command — {VIEW_TITLES[view]}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </Head>

      <div className="shell">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-mark">A</div>
            <div>
              <div className="brand-name">Ads Command</div>
              <div className="brand-sub">Google + Meta</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {groups.map(group => (
              <div key={group} className="nav-group">
                <div className="nav-group-label">{group}</div>
                {NAV_ITEMS.filter(n => n.group === group).map(item => (
                  <div key={item.id}
                    className={`nav-item ${view === item.id ? 'active' : ''}`}
                    onClick={() => setView(item.id)}>
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                    {view === item.id && <span className="nav-active-bar" />}
                  </div>
                ))}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button className="theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="Toggle theme">
              <span style={{ fontSize: 14 }}>{theme === 'light' ? '🌙' : '☀️'}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="main">
          {/* Topbar */}
          <header className="topbar">
            <div className="topbar-title">{VIEW_TITLES[view]}</div>
            <div className="topbar-filters">
              <div className="filter-group">
                <span className="filter-label">Campaign</span>
                <input className="filter-input" placeholder="contains..."
                  value={filters.campaign}
                  onChange={e => setFilters(f => ({ ...f, campaign: e.target.value.toLowerCase() }))} />
              </div>
              <div className="filter-group">
                <span className="filter-label">From</span>
                <input className="filter-date" type="date" value={filters.dateFrom}
                  onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
              </div>
              <div className="filter-group">
                <span className="filter-label">To</span>
                <input className="filter-date" type="date" value={filters.dateTo}
                  onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
              </div>
              <select className="filter-select" value={filters.platform}
                onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}>
                <option value="all">All platforms</option>
                <option value="google">Google</option>
                <option value="meta">Meta</option>
              </select>
            </div>
          </header>

          {/* Page content */}
          <div className="page-content">
            {view === 'alerts'    && <AlertsView filters={filters} />}
            {view === 'reminders' && <RemindersView filters={filters} allCampaigns={allCampaigns} />}
            {view === 'analyser'  && <AnalyserView filters={filters} allCampaigns={allCampaigns} />}
            {view === 'uac'       && <UACFunnelView filters={filters} title="UAC — ROI Cities" />}
            {view === 'uact1'     && <UACFunnelView filters={filters} sheetId="1NVwo4EAhkhgBI_dJh7wDAs-GFn_DbOGWuzksEPmv9kY" title="UAC — Type 1" />}
            {view === 'connect'   && <ConnectView />}
          </div>
          <Chatbot filters={filters} />
        </main>
      </div>

      <style jsx global>{`
        /* ── Layout ── */
        .shell { display:flex; height:100vh; overflow:hidden; background:var(--bg2); }

        /* ── Sidebar ── */
        .sidebar { width:220px; flex-shrink:0; display:flex; flex-direction:column; background:var(--bg); border-right:1px solid var(--border); }
        .sidebar-brand { display:flex; align-items:center; gap:10px; padding:18px 16px; border-bottom:1px solid var(--border); }
        .brand-mark { width:32px; height:32px; border-radius:8px; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16px; flex-shrink:0; }
        .brand-name { font-size:14px; font-weight:700; color:var(--text); letter-spacing:-.01em; }
        .brand-sub { font-size:11px; color:var(--text3); margin-top:1px; }
        .sidebar-nav { flex:1; overflow-y:auto; padding:8px 0; }
        .nav-group { margin-bottom:4px; }
        .nav-group-label { font-size:10px; font-weight:600; color:var(--text3); text-transform:uppercase; letter-spacing:.08em; padding:10px 16px 4px; }
        .nav-item { display:flex; align-items:center; gap:9px; padding:8px 12px; margin:1px 8px; border-radius:var(--r-md); cursor:pointer; font-size:13px; color:var(--text2); transition:all .12s; position:relative; }
        .nav-item:hover { background:var(--bg-hover); color:var(--text); }
        .nav-item.active { background:var(--blue-bg); color:var(--accent); font-weight:600; }
        .nav-icon { font-size:14px; flex-shrink:0; }
        .nav-label { flex:1; }
        .sidebar-footer { padding:12px; border-top:1px solid var(--border); }
        .theme-toggle { display:flex; align-items:center; gap:8px; width:100%; padding:8px 10px; border-radius:var(--r-md); border:1px solid var(--border); background:var(--bg2); cursor:pointer; transition:all .12s; }
        .theme-toggle:hover { background:var(--bg3); }

        /* ── Main ── */
        .main { flex:1; overflow:hidden; display:flex; flex-direction:column; min-width:0; }

        /* ── Topbar ── */
        .topbar { display:flex; align-items:center; gap:12px; padding:0 20px; height:56px; border-bottom:1px solid var(--border); background:var(--bg); flex-shrink:0; }
        .topbar-title { font-size:15px; font-weight:700; letter-spacing:-.01em; flex:1; min-width:120px; }
        .topbar-filters { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
        .filter-group { display:flex; align-items:center; gap:6px; background:var(--bg2); border:1px solid var(--border); border-radius:var(--r-md); padding:0 10px; height:34px; }
        .filter-label { font-size:11px; color:var(--text3); white-space:nowrap; font-weight:500; }
        .filter-input { font-size:12px; border:none; background:transparent; color:var(--text); width:110px; outline:none; }
        .filter-date { font-size:12px; border:none; background:transparent; color:var(--text); outline:none; cursor:pointer; width:104px; }
        .filter-select { font-size:12px; padding:0 8px; height:34px; border:1px solid var(--border); border-radius:var(--r-md); background:var(--bg2); color:var(--text); outline:none; cursor:pointer; }

        /* ── Page content ── */
        .page-content { flex:1; overflow-y:auto; padding:20px; }
        .view-content { display:flex; flex-direction:column; gap:0; }

        /* ── Cards ── */
        .card { background:var(--bg); border:1px solid var(--border); border-radius:var(--r-lg); overflow:hidden; box-shadow:var(--shadow); }
        .card-header { display:flex; align-items:center; justify-content:space-between; padding:14px 16px; border-bottom:1px solid var(--border); }
        .card-title { font-size:13px; font-weight:600; letter-spacing:-.01em; }

        /* ── Tables ── */
        .data-table { width:100%; border-collapse:collapse; font-size:13px; }
        .data-table thead th { font-weight:500; font-size:11px; color:var(--text3); padding:9px 12px; text-align:left; border-bottom:1px solid var(--border); background:var(--bg2); white-space:nowrap; letter-spacing:.02em; }
        .data-table tbody tr { border-bottom:0.5px solid var(--border); transition:background .1s; }
        .data-table tbody tr:hover { background:var(--bg-hover); }
        .data-table tbody td { padding:10px 12px; vertical-align:middle; }
        .data-table tbody tr:last-child { border-bottom:none; }

        /* ── Form elements ── */
        .form-input { font-size:13px; padding:8px 11px; border:1px solid var(--border2); border-radius:var(--r-md); background:var(--bg); color:var(--text); outline:none; transition:border .15s; flex:1; }
        .form-input:focus { border-color:var(--accent); }
        .form-select { font-size:13px; padding:8px 11px; border:1px solid var(--border2); border-radius:var(--r-md); background:var(--bg); color:var(--text); outline:none; cursor:pointer; }

        /* ── Buttons ── */
        .btn-primary { font-size:13px; padding:8px 16px; border-radius:var(--r-md); border:none; background:var(--accent); color:#fff; font-weight:600; cursor:pointer; transition:all .15s; white-space:nowrap; }
        .btn-primary:hover { background:var(--accent-dark); }
        .btn-ghost { font-size:12px; padding:6px 12px; border-radius:var(--r-md); border:1px solid var(--border); background:transparent; color:var(--text2); cursor:pointer; transition:all .15s; white-space:nowrap; }
        .btn-ghost:hover { background:var(--bg-hover); color:var(--text); }
        .btn-sm { padding:4px 10px; font-size:12px; }

        /* ── Dropdown ── */
        .dropdown-menu { background:var(--bg); border:1px solid var(--border2); border-radius:var(--r-lg); box-shadow:var(--shadow-md); }
        .dropdown-item { display:flex; align-items:center; gap:8px; padding:9px 12px; cursor:pointer; transition:background .1s; border-bottom:0.5px solid var(--border); }
        .dropdown-item:last-child { border-bottom:none; }
        .dropdown-item:hover { background:var(--bg-hover); }

        /* ── Alerts ── */
        .alert-card { display:flex; align-items:flex-start; gap:12px; padding:12px 16px; border-radius:var(--r-lg); border:1px solid; margin-bottom:12px; }
        .alert-red { background:var(--red-bg); border-color:rgba(220,38,38,.2); color:var(--red-text); }
        .alert-amber { background:var(--amber-bg); border-color:rgba(217,119,6,.2); color:var(--amber-text); }
        .alert-icon { width:20px; height:20px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0; margin-top:2px; background:currentColor; }
        .alert-red .alert-icon { background:var(--red); color:#fff; }
        .alert-amber .alert-icon { background:var(--amber); color:#fff; }

        /* ── Empty state ── */
        .empty-state { text-align:center; padding:32px; color:var(--text3); font-size:13px; }

        /* ── Skeleton ── */
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
      `}</style>
    </>
  )
}
