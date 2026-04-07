import { useState, useRef, useEffect } from 'react'

const SUGGESTED = [
  'Which campaigns are underperforming right now?',
  'What is the total spend this month?',
  'Which adgroups have the lowest install rate?',
  'Which campaigns are currently paused?',
  'What should I optimise first?',
  'Compare Google vs Meta performance',
]

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '10px 14px', alignItems: 'center' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: 'var(--text3)',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
      gap: 8,
      alignItems: 'flex-end',
    }}>
      {!isUser && (
        <div style={{
          width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: '#fff', fontWeight: 700, flexShrink: 0,
        }}>A</div>
      )}
      <div style={{
        maxWidth: '82%',
        padding: '10px 13px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--accent)' : 'var(--bg2)',
        color: isUser ? '#fff' : 'var(--text)',
        fontSize: 13,
        lineHeight: 1.65,
        border: isUser ? 'none' : '1px solid var(--border)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
        dangerouslySetInnerHTML={{
          __html: msg.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.08);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
            .replace(/\n/g, '<br/>')
        }}
      />
    </div>
  )
}

export default function Chatbot({ filters }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataInfo, setDataInfo] = useState(null)
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setUnread(0)
      setTimeout(() => inputRef.current?.focus(), 100)
      if (messages.length === 0) {
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm your campaign analyst. I have access to your live Google Ads and Meta Ads data for ${filters.dateFrom} → ${filters.dateTo}.\n\nAsk me anything — campaign performance, spend analysis, what to optimise, or which campaigns to pause.`,
        }])
      }
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')

    const newMessages = [...messages, { role: 'user', content: userMsg }]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      if (data.dataSnapshot) setDataInfo(data.dataSnapshot)
      if (!open) setUnread(u => u + 1)
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I ran into an error: ' + e.message }])
    }
    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <>
      {/* Floating button */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
        {/* Chat panel */}
        {open && (
          <div style={{
            position: 'absolute', bottom: 64, right: 0,
            width: 400, height: 560,
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--bg)',
            }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', fontWeight: 700, flexShrink: 0 }}>A</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>Ads Assistant</div>
                <div style={{ fontSize: 11, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', display: 'inline-block' }} />
                  Live data · {dataInfo ? `${dataInfo.campaigns} campaigns` : `${filters.dateFrom} → ${filters.dateTo}`}
                </div>
              </div>
              <button onClick={() => setMessages([])}
                style={{ fontSize: 11, padding: '3px 8px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', cursor: 'pointer' }}>
                Clear
              </button>
              <button onClick={() => setOpen(false)}
                style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 16 }}>
                ×
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 0' }}>
              {messages.map((msg, i) => <Message key={i} msg={msg} />)}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#fff', fontWeight: 700 }}>A</div>
                  <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 4px', minWidth: 60 }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions — only show if 1 message (the greeting) */}
            {messages.length === 1 && (
              <div style={{ padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {SUGGESTED.slice(0, 4).map(s => (
                  <button key={s} onClick={() => send(s)}
                    style={{ fontSize: 11, padding: '4px 9px', borderRadius: 99, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text2)', cursor: 'pointer', textAlign: 'left', transition: 'all .1s' }}
                    onMouseOver={e => { e.target.style.background = 'var(--blue-bg)'; e.target.style.color = 'var(--blue-text)'; e.target.style.borderColor = 'var(--accent)' }}
                    onMouseOut={e => { e.target.style.background = 'var(--bg2)'; e.target.style.color = 'var(--text2)'; e.target.style.borderColor = 'var(--border)' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask about your campaigns..."
                rows={1}
                style={{
                  flex: 1, padding: '9px 12px', border: '1px solid var(--border2)', borderRadius: 10,
                  background: 'var(--bg2)', color: 'var(--text)', fontSize: 13, outline: 'none',
                  resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto',
                  transition: 'border .15s',
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border2)'}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  width: 36, height: 36, borderRadius: '50%', border: 'none',
                  background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg3)',
                  color: input.trim() && !loading ? '#fff' : 'var(--text3)',
                  cursor: input.trim() && !loading ? 'pointer' : 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, transition: 'all .15s', flexShrink: 0,
                }}>
                ↑
              </button>
            </div>
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setOpen(!open)}
          style={{
            width: 52, height: 52, borderRadius: '50%', border: 'none',
            background: open ? 'var(--bg3)' : 'var(--accent)',
            color: open ? 'var(--text)' : '#fff',
            cursor: 'pointer', fontSize: open ? 20 : 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(37,99,235,0.35)',
            transition: 'all .2s',
            position: 'relative',
          }}>
          {open ? '×' : '💬'}
          {!open && unread > 0 && (
            <span style={{
              position: 'absolute', top: -2, right: -2,
              width: 18, height: 18, borderRadius: '50%',
              background: 'var(--red)', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg)',
            }}>{unread}</span>
          )}
        </button>
      </div>

      <style jsx global>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  )
}
