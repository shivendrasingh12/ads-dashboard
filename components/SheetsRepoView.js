import { useState, useEffect } from 'react'

export default function SheetsRepoView() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [showAddCat, setShowAddCat] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [addingTo, setAddingTo] = useState(null) // category name currently adding a sheet to
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [editing, setEditing] = useState(null) // item id being edited
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [saving, setSaving] = useState(false)

  function load() {
    fetch('/api/sheets-repo').then(r => r.json()).then(d => { setItems(d.items || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  // Group by category
  const categories = [...new Set(items.map(i => i.category))].sort()

  // Auto-expand all on first load
  useEffect(() => {
    if (categories.length > 0 && Object.keys(expanded).length === 0) {
      const exp = {}; categories.forEach(c => { exp[c] = true }); setExpanded(exp)
    }
  }, [items])

  function toggle(cat) { setExpanded(p => ({ ...p, [cat]: !p[cat] })) }

  async function addCategory() {
    if (!newCat.trim()) return
    // Add a placeholder item so category shows up
    setSaving(true)
    await fetch('/api/sheets-repo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: newCat.trim(), title: '', url: '' }) })
    setNewCat(''); setShowAddCat(false); setSaving(false)
    load()
    setExpanded(p => ({ ...p, [newCat.trim()]: true }))
  }

  async function addSheet(cat) {
    if (!newTitle.trim()) return
    setSaving(true)
    await fetch('/api/sheets-repo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: cat, title: newTitle.trim(), url: newUrl.trim() }) })
    setNewTitle(''); setNewUrl(''); setAddingTo(null); setSaving(false)
    load()
  }

  async function deleteItem(id) {
    if (!confirm('Remove this sheet link?')) return
    await fetch(`/api/sheets-repo?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function deleteCategory(cat) {
    if (!confirm(`Delete "${cat}" and all its sheets?`)) return
    const catItems = items.filter(i => i.category === cat)
    for (const item of catItems) {
      await fetch(`/api/sheets-repo?id=${item.id}`, { method: 'DELETE' })
    }
    load()
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    const item = items.find(i => i.id === editing)
    await fetch('/api/sheets-repo', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing, category: item.category, title: editTitle.trim(), url: editUrl.trim() }) })
    setEditing(null); setSaving(false)
    load()
  }

  function startEdit(item) {
    setEditing(item.id); setEditTitle(item.title); setEditUrl(item.url)
  }

  const si = { fontSize: 13, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>{categories.length} categories · {items.filter(i => i.title).length} sheets</div>
        </div>
        <button onClick={() => setShowAddCat(!showAddCat)}
          style={{ fontSize: 12, padding: '6px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
          {showAddCat ? 'Cancel' : '+ New Category'}
        </button>
      </div>

      {/* New category form */}
      {showAddCat && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ ...si, width: 260 }} placeholder="Category name (e.g. Porter, Type 1, ROI)" value={newCat} onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addCategory()} autoFocus />
          <button onClick={addCategory} disabled={saving}
            style={{ fontSize: 12, padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {saving ? 'Adding...' : 'Add'}
          </button>
        </div>
      )}

      {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Loading...</div>}

      {!loading && categories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 20px', border: '1.5px dashed var(--border2)', borderRadius: 12, color: 'var(--text3)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📂</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text2)', marginBottom: 6 }}>No sheets yet</div>
          <div style={{ fontSize: 13 }}>Click "+ New Category" to start organizing your sheets</div>
        </div>
      )}

      {/* Categories */}
      {categories.map(cat => {
        const catItems = items.filter(i => i.category === cat && i.title)
        const isOpen = expanded[cat]

        return (
          <div key={cat} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: isOpen ? '1px solid var(--border)' : 'none' }}
              onClick={() => toggle(cat)}>
              <span style={{ fontSize: 13, color: 'var(--text3)', marginRight: 8, display: 'inline-block', transition: 'transform .15s', transform: isOpen ? 'rotate(90deg)' : 'none' }}>›</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>📁 {cat}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 10 }}>{catItems.length} sheet{catItems.length !== 1 ? 's' : ''}</span>
              <button onClick={e => { e.stopPropagation(); setAddingTo(addingTo === cat ? null : cat); setNewTitle(''); setNewUrl('') }}
                style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', marginRight: 6 }}>
                + Add
              </button>
              <button onClick={e => { e.stopPropagation(); deleteCategory(cat) }}
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--red-text)', cursor: 'pointer' }}>
                ×
              </button>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ padding: '0' }}>
                {/* Add sheet form */}
                {addingTo === cat && (
                  <div style={{ padding: '12px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input style={{ ...si, width: 220 }} placeholder="Sheet title" value={newTitle} onChange={e => setNewTitle(e.target.value)} autoFocus />
                    <input style={{ ...si, flex: 1 }} placeholder="Google Sheet URL" value={newUrl} onChange={e => setNewUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSheet(cat)} />
                    <button onClick={() => addSheet(cat)} disabled={saving}
                      style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {saving ? '...' : 'Save'}
                    </button>
                    <button onClick={() => setAddingTo(null)}
                      style={{ fontSize: 12, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                )}

                {/* Sheet list */}
                {catItems.length === 0 && (
                  <div style={{ padding: '20px 16px', color: 'var(--text3)', fontSize: 12, textAlign: 'center' }}>
                    No sheets yet — click "+ Add" to add one
                  </div>
                )}
                {catItems.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: i < catItems.length - 1 ? '0.5px solid var(--border)' : 'none', gap: 10 }}
                    onMouseOver={e => e.currentTarget.style.background = 'var(--bg2)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    {editing === item.id ? (
                      <>
                        <input style={{ ...si, width: 200 }} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                        <input style={{ ...si, flex: 1 }} value={editUrl} onChange={e => setEditUrl(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEdit()} />
                        <button onClick={saveEdit} disabled={saving}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 5, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditing(null)}
                          style={{ fontSize: 11, padding: '4px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: 14, marginRight: 2 }}>📊</span>
                        <div style={{ flex: 1 }}>
                          {item.url ? (
                            <a href={item.url} target="_blank" rel="noreferrer"
                              style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent)', textDecoration: 'none' }}>
                              {item.title} ↗
                            </a>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{item.title}</span>
                          )}
                        </div>
                        <button onClick={() => startEdit(item)}
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer', opacity: 0.6 }}>
                          Edit
                        </button>
                        <button onClick={() => deleteItem(item.id)}
                          style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'transparent', color: 'var(--red-text)', cursor: 'pointer', opacity: 0.6 }}>
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
