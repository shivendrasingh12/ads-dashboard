import { useState, useEffect } from 'react'

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

const emptyForm = (category) => ({
  date: new Date().toISOString().split('T')[0],
  title: '',
  attendees: '',
  notes: '',
  category: category || 'General',
  actionItems: [{ item: '', owner: '', dependency: '', status: 'Pending', link: '' }],
})

/* ── Meeting card (used inside each category) ── */
function MeetingCard({ meeting, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...meeting, actionItems: safe(meeting.actionItems) })

  function handleSave() {
    onUpdate(form)
    setEditing(false)
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

  const ai = safe(meeting.actionItems)
  const doneCount = ai.filter(a => a.status === 'Done').length
  const blockedCount = ai.filter(a => a.status === 'Blocked').length

  return (
    <div style={{ borderBottom: '0.5px solid var(--border)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        onClick={() => setExpanded(!expanded)}>
        <div style={{ textAlign: 'center', minWidth: 44, background: 'var(--blue-bg)', borderRadius: 8, padding: '5px 4px' }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
            {new Date(meeting.date).getDate()}
          </div>
          <div style={{ fontSize: 9, color: 'var(--accent-text)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {new Date(meeting.date).toLocaleDateString('en-IN', { month: 'short' })}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{meeting.title}</div>
          {meeting.attendees && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>👥 {meeting.attendees}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {blockedCount > 0 && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'var(--red-bg)', color: 'var(--red-text)', fontWeight: 500 }}>⚠ {blockedCount}</span>}
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{doneCount}/{ai.length}</span>
          <div style={{ width: 50, height: 4, background: 'var(--bg3)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: (doneCount / Math.max(ai.length, 1) * 100) + '%', height: '100%', background: 'var(--green)', borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 11, color: 'var(--text3)', transition: 'transform .15s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </div>

      {/* Expanded view */}
      {expanded && !editing && (
        <div style={{ padding: '0 16px 14px' }}>
          {meeting.notes && (
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12, padding: '8px 12px', background: 'var(--bg2)', borderRadius: 8, lineHeight: 1.6 }}>
              {meeting.notes}
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  {['#', 'Action Item', 'Owner', 'Dependency', 'Status', 'Link'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: 'var(--text3)', fontWeight: 500, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ai.map((a, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid var(--border)', background: a.status === 'Blocked' ? 'rgba(220,38,38,0.03)' : a.status === 'Done' ? 'rgba(22,163,74,0.03)' : 'transparent' }}>
                    <td style={{ padding: '7px 10px', color: 'var(--text3)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '7px 10px', fontWeight: 500, textDecoration: a.status === 'Done' ? 'line-through' : 'none', color: a.status === 'Done' ? 'var(--text3)' : 'var(--text)' }}>{a.item}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--text2)' }}>{a.owner || '—'}</td>
                    <td style={{ padding: '7px 10px', color: 'var(--text2)' }}>{a.dependency || '—'}</td>
                    <td style={{ padding: '7px 10px' }}><StatusPill status={a.status} /></td>
                    <td style={{ padding: '7px 10px' }}>
                      {a.link ? <a href={a.link} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)', textDecoration: 'none' }}>↗ Link</a> : <span style={{ color: 'var(--text3)', fontSize: 11 }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={() => { setForm({ ...meeting, actionItems: safe(meeting.actionItems) }); setEditing(true) }} className="btn-ghost btn-sm">Edit</button>
            <button onClick={() => onDelete(meeting.id)} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid var(--red-text)', background: 'transparent', color: 'var(--red-text)', cursor: 'pointer' }}>Delete</button>
          </div>
        </div>
      )}

      {/* Editing */}
      {expanded && editing && (
        <div style={{ padding: '0 16px 14px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Title</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: 150 }} />
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Attendees</label>
            <input className="form-input" value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Notes</label>
            <textarea className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>Action items</label>
              <button onClick={addActionItem} className="btn-ghost btn-sm">+ Add row</button>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text3)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr auto', gap: 6, marginBottom: 4, padding: '0 2px' }}>
              <span>Action</span><span>Owner</span><span>Dep.</span><span>Status</span><span>Link</span><span></span>
            </div>
            {safe(form.actionItems).map((a, i) => (
              <ActionRow key={i} item={a} index={i} onChange={updateActionItem} onDelete={deleteActionItem} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleSave} className="btn-primary btn-sm">Save</button>
            <button onClick={() => setEditing(false)} className="btn-ghost btn-sm">Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main MOM View ── */
export default function MOMView() {
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  // Category state
  const [expandedCats, setExpandedCats] = useState({})
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat, setNewCat] = useState('')

  // Add meeting form
  const [addingTo, setAddingTo] = useState(null) // category currently adding to
  const [form, setForm] = useState(emptyForm())

  function load() {
    fetch(`/api/mom${search ? `?search=${encodeURIComponent(search)}` : ''}`)
      .then(r => r.json())
      .then(d => { setMeetings(d.meetings || []); setLoading(false) })
  }
  useEffect(() => { load() }, [search])

  // Group by category
  const categories = [...new Set(meetings.map(m => m.category || 'General'))].sort()

  // Auto-expand all on first load
  useEffect(() => {
    if (categories.length > 0 && Object.keys(expandedCats).length === 0) {
      const exp = {}; categories.forEach(c => { exp[c] = true }); setExpandedCats(exp)
    }
  }, [meetings])

  function toggleCat(cat) { setExpandedCats(p => ({ ...p, [cat]: !p[cat] })) }

  async function addCategory() {
    if (!newCat.trim()) return
    const cat = newCat.trim()
    setSaving(true)
    // Save placeholder row so category persists even without meetings
    await fetch('/api/mom', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: '', title: '', attendees: '', notes: '', category: cat, actionItems: [] })
    })
    setExpandedCats(p => ({ ...p, [cat]: true }))
    setShowAddCat(false)
    setNewCat('')
    setSaving(false)
    load()
  }

  async function handleCreate(cat) {
    if (!form.title || !form.date) return alert('Title and date are required')
    setSaving(true)
    await fetch('/api/mom', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, category: cat }) })
    setForm(emptyForm())
    setAddingTo(null)
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

  async function deleteCategory(cat) {
    if (!confirm(`Delete "${cat}" and all its meetings?`)) return
    const catMeetings = meetings.filter(m => (m.category || 'General') === cat)
    for (const m of catMeetings) {
      await fetch(`/api/mom?id=${m.id}`, { method: 'DELETE' })
    }
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

  // Stats — exclude placeholder rows (empty title = category-only row)
  const realMeetings = meetings.filter(m => m.title)
  const totalMeetings = realMeetings.length
  const pending = realMeetings.reduce((s, m) => s + safe(m.actionItems).filter(a => a.status === 'Pending' || a.status === 'In Progress').length, 0)
  const blocked = realMeetings.reduce((s, m) => s + safe(m.actionItems).filter(a => a.status === 'Blocked').length, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats + controls */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8, flex: 1 }}>
          {[
            { label: 'Meetings', value: totalMeetings },
            { label: 'Open actions', value: pending, color: pending > 0 ? 'var(--amber)' : undefined },
            { label: 'Blocked', value: blocked, color: blocked > 0 ? 'var(--red)' : undefined },
            { label: 'Categories', value: categories.length },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', minWidth: 90 }}>
              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: m.color || 'var(--text)' }}>{m.value}</div>
            </div>
          ))}
        </div>
        <input style={{ fontSize: 12, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 200 }}
          placeholder="Search meetings, actions..." value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setShowAddCat(!showAddCat)}
          style={{ fontSize: 12, padding: '7px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {showAddCat ? 'Cancel' : '+ New Category'}
        </button>
      </div>

      {/* New category form */}
      {showAddCat && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ fontSize: 13, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: 280 }}
            placeholder="Category name (e.g. Porter, Type 1, ROI)" value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()} autoFocus />
          <button onClick={addCategory}
            style={{ fontSize: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            Add
          </button>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>}

      {!loading && categories.length === 0 && !addingTo && (
        <div style={{ textAlign: 'center', padding: '48px 20px', border: '1.5px dashed var(--border2)', borderRadius: 12, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>No meeting records yet</div>
          <div style={{ fontSize: 13 }}>Click "+ New Category" to create a category (e.g. Porter, Type 1), then add meetings inside it</div>
        </div>
      )}

      {/* Categories with meetings inside */}
      {(addingTo && !categories.includes(addingTo) ? [...categories, addingTo] : categories).map(cat => {
        const catMeetings = meetings.filter(m => (m.category || 'General') === cat && m.title)
        const isOpen = expandedCats[cat]
        const catPending = catMeetings.reduce((s, m) => s + safe(m.actionItems).filter(a => a.status === 'Pending' || a.status === 'In Progress').length, 0)
        const catBlocked = catMeetings.reduce((s, m) => s + safe(m.actionItems).filter(a => a.status === 'Blocked').length, 0)

        return (
          <div key={cat} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: isOpen ? '1px solid var(--border)' : 'none' }}
              onClick={() => toggleCat(cat)}>
              <span style={{ fontSize: 13, color: 'var(--text3)', marginRight: 8, display: 'inline-block', transition: 'transform .15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>📋 {cat}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 8 }}>{catMeetings.length} meeting{catMeetings.length !== 1 ? 's' : ''}</span>
              {catBlocked > 0 && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'var(--red-bg)', color: 'var(--red-text)', fontWeight: 500, marginRight: 6 }}>⚠ {catBlocked}</span>}
              {catPending > 0 && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'var(--amber-bg)', color: 'var(--amber-text)', fontWeight: 500, marginRight: 6 }}>{catPending} open</span>}
              <button onClick={e => { e.stopPropagation(); setAddingTo(addingTo === cat ? null : cat); setForm(emptyForm(cat)) }}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', marginRight: 6 }}>
                + Meeting
              </button>
              <button onClick={e => { e.stopPropagation(); deleteCategory(cat) }}
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--red-text)', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div>
                {/* Add meeting form */}
                {addingTo === cat && (
                  <div style={{ padding: 16, background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12, color: 'var(--text)' }}>New meeting in {cat}</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Meeting title *</label>
                        <input className="form-input" placeholder="e.g. Weekly performance review" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Date *</label>
                        <input className="form-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={{ width: 150 }} />
                      </div>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Attendees</label>
                      <input className="form-input" placeholder="Shivendra, Yogesh, Client..." value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 3 }}>Notes / summary</label>
                      <textarea className="form-input" placeholder="Key discussion points..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 500 }}>Action items</label>
                        <button onClick={addActionItem} className="btn-ghost btn-sm">+ Add row</button>
                      </div>
                      <div style={{ fontSize: 9, color: 'var(--text3)', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1.5fr auto', gap: 6, marginBottom: 4, padding: '0 2px' }}>
                        <span>Action item</span><span>Owner</span><span>Dependency</span><span>Status</span><span>Link</span><span></span>
                      </div>
                      {safe(form.actionItems).map((a, i) => (
                        <ActionRow key={i} item={a} index={i} onChange={updateActionItem} onDelete={deleteActionItem} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleCreate(cat)} className="btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save meeting'}
                      </button>
                      <button onClick={() => setAddingTo(null)} className="btn-ghost">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Meeting list */}
                {catMeetings.length === 0 && addingTo !== cat && (
                  <div style={{ padding: '20px 16px', color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>
                    No meetings yet — click "+ Meeting" to add one
                  </div>
                )}
                {catMeetings.map(m => (
                  <MeetingCard key={m.id} meeting={m} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
