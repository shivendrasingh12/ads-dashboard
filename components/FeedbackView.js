import { useState } from 'react'

const SECTIONS = [
  'Schedule Reminders',
  'Asset Analyzer',
  'Minutes of Meeting',
  'Change Tracker',
  'Sheets Repository',
  'UAC Funnel — ROI Cities',
  'UAC Funnel — Type 1',
  'Meta Funnel — ROI Cities',
  'Meta Funnel — Type 1',
  'AI Chatbot',
  'General / Overall',
  'Other',
]

const TYPES = ['Bug / Issue', 'Feature Request', 'Improvement', 'Question']

export default function FeedbackView() {
  const [section, setSection] = useState('')
  const [type, setType] = useState('Improvement')
  const [message, setMessage] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState(false)

  function handleSubmit() {
    if (!section || !message.trim()) return alert('Please select a section and write your feedback')
    const subject = encodeURIComponent(`[Dashboard Feedback] ${type} — ${section}`)
    const body = encodeURIComponent(`Section: ${section}\nType: ${type}\nFrom: ${name || 'Anonymous'}\n\n${message.trim()}\n\n---\nSent from Aristok × Porter Dashboard`)
    window.open(`mailto:shivendra.singh@aristok.com?subject=${subject}&body=${body}`, '_blank')
    setSent(true)
    setTimeout(() => {
      setSection(''); setType('Improvement'); setMessage(''); setName(''); setSent(false)
    }, 5000)
  }

  const si = { fontSize: 13, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
      {/* Contact card */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, flexShrink: 0 }}>S</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Shivendra Singh</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Dashboard Owner & Developer</div>
        </div>
        <a href="mailto:shivendra.singh@aristok.com" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', padding: '6px 12px', border: '1px solid var(--accent)', borderRadius: 8, fontWeight: 500 }}>
          shivendra.singh@aristok.com ↗
        </a>
      </div>

      {/* Feedback form */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Submit Feedback</div>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>Feedback goes directly to Shivendra's email</span>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Your Name (optional)</label>
            <input style={si} placeholder="e.g. Yogesh" value={name} onChange={e => setName(e.target.value)} />
          </div>

          {/* Section selector */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Which section is this about? *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SECTIONS.map(s => (
                <button key={s} onClick={() => setSection(s)} style={{
                  fontSize: 12, padding: '6px 12px', borderRadius: 99, cursor: 'pointer', fontWeight: 500,
                  border: section === s ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: section === s ? 'var(--blue-bg)' : 'var(--bg2)',
                  color: section === s ? 'var(--accent)' : 'var(--text2)',
                  transition: 'all .15s'
                }}>{s}</button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Feedback type</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {TYPES.map(t => (
                <button key={t} onClick={() => setType(t)} style={{
                  fontSize: 12, padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 500,
                  border: type === t ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  background: type === t ? 'var(--blue-bg)' : 'transparent',
                  color: type === t ? 'var(--accent)' : 'var(--text3)',
                  transition: 'all .15s'
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 500, display: 'block', marginBottom: 4 }}>Your feedback *</label>
            <textarea style={{ ...si, minHeight: 100, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              placeholder="What's working well? What could be better? Any features you'd like to see?" value={message} onChange={e => setMessage(e.target.value)} />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={handleSubmit} style={{
              fontSize: 13, padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontWeight: 600,
              opacity: (!section || !message.trim()) ? 0.5 : 1,
              transition: 'opacity .15s'
            }}>
              Send Feedback →
            </button>
            {sent && (
              <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                ✓ Email client opened — just hit send!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6, padding: '0 4px' }}>
        💡 Clicking "Send Feedback" will open your email app with the feedback pre-filled. Just hit send.<br />
        You can also email directly at <a href="mailto:shivendra.singh@aristok.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>shivendra.singh@aristok.com</a>
      </div>
    </div>
  )
}
