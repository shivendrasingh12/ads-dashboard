import { useState, useEffect, useRef } from 'react'

const STATUS_OPTIONS = ['Pending', 'In Progress', 'Done', 'Blocked', 'Cancelled']
const STATUS_STYLE = {
  'Pending':     { bg: '#F8FAFC', color: '#475569', dot: '#94A3B8' },
  'In Progress': { bg: '#EFF6FF', color: '#1D4ED8', dot: '#3B82F6' },
  'Done':        { bg: '#F0FDF4', color: '#15803D', dot: '#22C55E' },
  'Blocked':     { bg: '#FEF2F2', color: '#B91C1C', dot: '#EF4444' },
  'Cancelled':   { bg: '#F8FAFC', color: '#94A3B8', dot: '#CBD5E1' },
}

function safe(items) { return Array.isArray(items) ? items : [] }

function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE['Pending']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '3px 8px', borderRadius: 99, background: s.bg, color: s.color, fontWeight: 500, border: `1px solid ${s.dot}33` }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

function ActionRow({ item, onChange, onDelete, index }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr auto', gap: 6, marginBottom: 6, alignItems: 'center' }}>
      <input style={{ fontSize: 12, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
        placeholder="Action item" value={item.item} onChange={e => onChange(index, 'item', e.target.value)} />
      <input style={{ fontSize: 12, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
        placeholder="Owner" value={item.owner} onChange={e => onChange(index, 'owner', e.target.value)} />
      <input style={{ fontSize: 12, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
        placeholder="Dependency" value={item.dependency} onChange={e => onChange(index, 'dependency', e.target.value)} />
      <select style={{ fontSize: 12, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
        value={item.status} onChange={e => onChange(index, 'status', e.target.value)}>
        {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
      </select>
      <input style={{ fontSize: 12, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)', color: 'var(--text)', outline: 'none' }}
        placeholder="Sheet/data link (optional)" value={item.link} onChange={e => onChange(index, 'link', e.target.value)} />
      <button onClick={() => onDelete(index)}
        style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
    </div>
  )
}

const emptyForm = () => ({
  date: new Date().toISOString().split('T')[0],
  title: '',
  attendees: '',
  notes: '',
  actionItems: [{ item: '', owner: '', dependency: '', status: 'Pending', link: '' }],
})

function MeetingCard({ meeting, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...meeting, actionItems: safe(meeting.actionItems) })

  function handleSave() {
    onUpdate(form)
    setEditing(false)
  }

  const ai = safe(meeting.actionItems)
  const doneCount = ai.filter(a => a.status === 'Done').length
  const blockedCount = ai.filter(a => a.status === 'Blocked').length

  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 10, boxShadow: 'var(--shadow)' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: expanded ? '1px solid var(--border)' : 'none' }}
        onClick={() => setExpanded(!expanded)}>
        <div style={{ textAlign: 'center', minWidth: 48, background: 'var(--blue-bg)', borderRadius: 8, padding: '6px 4px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
            {new Date(meeting.date).getDate()}
          </div>
          <div style={{ fontSize: 10, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {new Date(meeting.date).toLocaleDateString('en-IN', { month: 'short' })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{meeting.title}</div>
          {meeting.attendees && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>👥 {meeting.attendees}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {blockedCount > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'var(--red-bg)', color: 'var(--red-text)', fontWeight: 500 }}>⚠ {blockedCount} blocked</span>}
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{doneCount}/{ai.length} done</span>
          <div style={{ width: 60, height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: (doneCount / Math.max(ai.length, 1) * 100) + '%', height: '100%', background: 'var(--green)', borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text3)', transition: 'transform .15s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && !editing && (
        <div style={{ padding: '14px 16px' }}>
          {meeting.notes && (
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 14, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, lineHeight: 1.6 }}>
              {meeting.notes}
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['#', 'Action Item', 'Owner', 'Dependency', 'Status', 'Link'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 11, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ai.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid var(--border)', background: a.status === 'Blocked' ? 'rgba(220,38,38,0.03)' : a.status === 'Done' ? 'rgba(22,163,74,0.03)' : 'transparent' }}>
                    <td style={{ padding: '8px 10px', color: 'var(--text3)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '8px 10px', fontWeight: 500, textDecoration: a.status === 'Done' ? 'line-through' : 'none', color: a.status === 'Done' ? 'var(--text3)' : 'var(--text)' }}>{a.item}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text2)', fontSize: 12 }}>{a.owner || '—'}</td>
                    <td style={{ padding: '8px 10px', color: 'var(--text2)', fontSize: 12 }}>{a.dependency || '—'}</td>
                    <td style={{ padding: '8px 10px' }}><StatusPill status={a.status} /></td>
                    <td style={{ padding: '8px 10px' }}>
                      {a.link ? <a href={a.link} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>↗ Link</a> : <span style={{ color: 'var(--text3)', fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={() => setEditing(true)} className="btn-ghost btn-sm">Edit</button>
            <button onClick={() => onDelete(meeting.id)} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--red-text)', background: 'transparent', color: 'var(--red-text)', cursor: 'pointer' }}>Delete</button>
          </div>
        </div>
      )}

      {/* Edit form */}
      {expanded && editing && (
        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Meeting title</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: 160 }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Attendees</label>
            <input className="form-input" value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} placeholder="Names, comma separated" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Notes / summary</label>
            <textarea className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Action items</label>
              <button onClick={() => setForm(f => ({ ...f, actionItems: [...safe(f.actionItems), { item: '', owner: '', dependency: '', status: 'Pending', link: '' }] }))}
                className="btn-ghost btn-sm">+ Add row</button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr auto', gap: 6, marginBottom: 4, padding: '0 2px' }}>
              <span>Action item</span><span>Owner</span><span>Dependency</span><span>Status</span><span>Link</span><span></span>
            </div>
            {safe(form.actionItems).map((a, i) => (
              <ActionRow key={i} item={a} index={i}
                onChange={(idx, field, val) => setForm(f => ({ ...f, actionItems: safe(f.actionItems).map((x, j) => j === idx ? { ...x, [field]: val } : x) }))}
                onDelete={idx => setForm(f => ({ ...f, actionItems: safe(f.actionItems).filter((_, j) => j !== idx) }))} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} className="btn-primary">Save changes</button>
            <button onClick={() => { setForm({ ...meeting, actionItems: safe(meeting.actionItems) }); setEditing(false) }} className="btn-ghost">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function MOMView() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    fetch(`/api/mom${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      .then(r => r.json())
      .then(d => { setMeetings(d.meetings || []); setLoading(false) })
  }

  useEffect(() => { load() }, [search])

  async function handleCreate() {
    if (!form.title || !form.date) return alert('Title and date are required')
    setSaving(true)
    await fetch('/api/mom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm(emptyForm())
    setShowForm(false)
    setSaving(false)
    load()
  }

  async function handleUpdate(updated) {
    await fetch('/api/mom', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this meeting record?')) return
    await fetch(`/api/mom?id=${id}`, { method: 'DELETE' })
    load()
  }

  function updateActionItem(idx, field, val) {
    setForm(f => ({ ...f, actionItems: safe(f.actionItems).map((x, j) => j === idx ? { ...x, [field]: val } : x) }))
  }
  function deleteActionItem(idx) {
    setForm(f => ({ ...f, actionItems: safe(f.actionItems).filter((_, j) => j !== idx) }))
  }
  function addActionItem() {
    setForm(f => ({ ...f, actionItems: [...safe(f.actionItems), { item: '', owner: '', dependency: '', status: 'Pending', link: '' }] }))
  }

  const pending = meetings.reduce((s, m) => s + safe(m.actionItems).filter(a => a.status === 'Pending' || a.status === 'In Progress').length, 0)
  const blocked = meetings.reduce((s, m) => s + safe(m.actionItems).filter(a => a.status === 'Blocked').length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {[
            { label: 'Meetings', value: meetings.length },
            { label: 'Open actions', value: pending, color: pending > 0 ? 'var(--amber)' : undefined },
            { label: 'Blocked', value: blocked, color: blocked > 0 ? 'var(--red)' : undefined },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', minWidth: 100 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: m.color || 'var(--text)' }}>{m.value}</div>
            </div>
          ))}
        </div>
        <input style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 220 }}
          placeholder="Search meetings, actions..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancel' : '+ New meeting'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--accent)', borderRadius: 12, padding: '16px', boxShadow: 'var(--shadow-md)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, color: 'var(--text)' }}>New meeting record</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Meeting title *</label>
              <input className="form-input" placeholder="e.g. Weekly performance review" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Date *</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: 160 }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Attendees</label>
            <input className="form-input" placeholder="Shivendra, Yogesh, Client..." value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Notes / summary</label>
            <textarea className="form-input" placeholder="Key discussion points, decisions made..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500 }}>Action items</label>
              <button onClick={addActionItem} className="btn-ghost btn-sm">+ Add row</button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr auto', gap: 6, marginBottom: 4, padding: '0 2px' }}>
              <span>Action item</span><span>Owner</span><span>Dependency</span><span>Status</span><span>Sheet / data link</span><span></span>
            </div>
            {safe(form.actionItems).map((a, i) => (
              <ActionRow key={i} item={a} index={i} onChange={updateActionItem} onDelete={deleteActionItem} />
            ))}
          </div>
          <button onClick={handleCreate} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save meeting'}
          </button>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 32, color: 'var(--text3)' }}>Loading...</div>}
      {!loading && meetings.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', border: '1.5px dashed var(--border2)', borderRadius: 12, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>No meeting records yet</div>
          <div style={{ fontSize: 13 }}>Click "New meeting" to add your first MOM</div>
        </div>
      )}
      {meetings.map(m => (
        <MeetingCard key={m.id} meeting={m} onUpdate={handleUpdate} onDelete={handleDelete} />
      ))}
    </div>
  )
}
