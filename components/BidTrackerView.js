import { useState, useEffect, useRef } from 'react'

const OP_STYLE = {
  'UPDATE': { bg: '#EFF6FF', color: '#1D4ED8' },
  'CREATE': { bg: '#F0FDF4', color: '#15803D' },
  'REMOVE': { bg: '#FEF2F2', color: '#B91C1C' },
}

function Change({ c }) {
  const op = OP_STYLE[c.operation] || OP_STYLE['UPDATE']
  const dt = c.dateTime ? new Date(c.dateTime) : null
  const timeStr = dt ? dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) + ' ' + dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : c.date
  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{timeStr}</td>
      <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.campaign}</td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: op.bg, color: op.color, fontWeight: 500 }}>{c.operation || 'UPDATE'}</span>
      </td>
      <td style={{ padding: '10px 12px', maxWidth: 280 }}>
        {c.descriptions?.length > 0
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {c.descriptions.map((d, i) => (
                <span key={i} style={{ fontSize: 12, color: 'var(--text)' }}>{d}</span>
              ))}
            </div>
          : <span style={{ fontSize: 12, color: 'var(--text3)' }}>{(c.changedFields || []).join(', ') || '—'}</span>
        }
      </td>
      <td style={{ padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--blue-bg)', color: 'var(--blue-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
            {(c.user || 'A').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{c.user || '—'}</div>
            {c.clientType && <div style={{ fontSize: 10, color: 'var(--text3)' }}>{c.clientType.replace(/_/g, ' ')}</div>}
          </div>
        </div>
      </td>
    </tr>
  )
}

function SnapshotRow({ camp }) {
  return (
    <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
      <td style={{ padding: '10px 12px', fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{camp.campaign}</td>
      <td style={{ padding: '10px 12px' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 5, background: camp.status === 'ENABLED' ? '#F0FDF4' : '#F8FAFC', color: camp.status === 'ENABLED' ? '#15803D' : '#94A3B8', fontWeight: 500 }}>
          {camp.status}
        </span>
      </td>
      <td style={{ padding: '10px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
        {camp.budget ? '₹' + camp.budget.toLocaleString('en-IN') : '—'}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text2)' }}>
        {camp.biddingStrategy?.replace(/_/g, ' ') || '—'}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
        {camp.targetCpa ? '₹' + camp.targetCpa.toLocaleString('en-IN') : '—'}
      </td>
      <td style={{ padding: '10px 12px', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
        {camp.targetRoas ? camp.targetRoas + 'x' : '—'}
      </td>
    </tr>
  )
}

export default function BidTrackerView({ filters }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [campFilter, setCampFilter] = useState('')
  const [days, setDays] = useState('60')
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

  useEffect(() => { load('', '60') }, [])

  function handleCampSearch(val) {
    setCampFilter(val)
    clearTimeout(debounce.current)
    debounce.current = setTimeout(() => load(val, days), 600)
  }

  const isSnapshot = data?.source === 'current_snapshot'
  const changes = data?.changes || []
  const snapshot = data?.currentBidsBudgets || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--border2)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 240 }}
          placeholder="Campaign name contains..."
          value={campFilter}
          onChange={e => handleCampSearch(e.target.value)}
        />
        <select
          style={{ fontSize: 12, padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
          value={days}
          onChange={e => { setDays(e.target.value); load(campFilter, e.target.value) }}>
          <option value="7">Last 7 days</option>
          <option value="14">Last 14 days</option>
          <option value="30">Last 30 days</option>
          <option value="60">Last 60 days</option>
          <option value="90">Last 90 days</option>
        </select>
        <button onClick={() => load(campFilter, days)}
          style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
          {loading ? 'Loading...' : 'Search'}
        </button>
        {data?.period && (
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
            {data.period.from} → {data.period.to}
          </span>
        )}
      </div>

      {error && <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--red-text)' }}>{error}</div>}

      {data?.error && (
        <div style={{ background: 'var(--amber-bg)', border: '1px solid rgba(217,119,6,.2)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--amber-text)' }}>
          ⚠ {data.error}
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)', fontSize: 13 }}>Fetching bid & budget changes from Google Ads...</div>}

      {/* Change history table */}
      {!loading && !isSnapshot && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Bid & budget changes</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{changes.length} changes</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Date / Time', 'Campaign', 'Operation', 'What changed', 'Changed by'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {changes.length === 0 && !loading && (
                  <tr><td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    No bid or budget changes found for this period and filter
                  </td></tr>
                )}
                {changes.map((c, i) => <Change key={i} c={c} />)}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '7px 14px', borderTop: '0.5px solid var(--border)', fontSize: 10, color: 'var(--text3)' }}>
            Google Ads change history · bid and budget changes only
          </div>
        </div>
      )}

      {/* Snapshot table (fallback) */}
      {!loading && isSnapshot && snapshot.length > 0 && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>Current bids & budgets</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{snapshot.length} campaigns</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['Campaign', 'Status', 'Daily Budget', 'Bidding Strategy', 'Target CPA', 'Target ROAS'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {snapshot.map((c, i) => <SnapshotRow key={i} camp={c} />)}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
