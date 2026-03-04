import React, { useEffect, useRef, useState } from 'react'
import { MessageBubble } from './MessageBubble'
import api from '../api/axios'
import { SemanticResults } from './SemanticResults'
import { SourcesDropdown } from './SourcesDropdown'

export function ChatWindow({ projectId, chatId, title, subtitle = 'Project Chat', onNewChat, documents }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatId) {
        setMessages([])
        return
      }
      setLoading(true)
      try {
        const res = await api.get(`/conversations/${chatId}/messages`)
        const msgs = (res.data.messages || []).map(m => {
          try {
            if (m.sources_json) {
              return { ...m, semantic: JSON.parse(m.sources_json) }
            }
          } catch {}
          return m
        })
        setMessages(msgs)
      } catch (error) {
        console.error('Failed to fetch messages:', error)
        setMessages([])
      } finally {
        setLoading(false)
      }
    }
    fetchMessages()
  }, [chatId])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!documents || documents.length === 0) {
      alert("Please upload documents before chatting.")
      return
    }
    const isGreeting = ['hi','hello','hey','hlo'].includes(text.toLowerCase().trim())

    const userMsgId = Date.now()
    setMessages((prev) => [...prev, { id: userMsgId, role: 'user', content: text }])
    setInput('')
    setLoading(true)

    const assistantMsgId = userMsgId + 1
    setMessages((prev) => [...prev, { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true }])

    try {
      const baseURL = api.defaults.baseURL
      const token = localStorage.getItem('token')
      const res = await fetch(`${baseURL}/projects/${projectId}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Session-Id': token } : {})
        },
        body: JSON.stringify({
          conversation_id: chatId,
          message: text
        })
      })

      if (!res.ok) throw new Error('Network response was not ok')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m
            )
          )
        }
      }

    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => prev.map(m => m.id === assistantMsgId ? { ...m, content: m.content + '\n[Error generating full response]' } : m))
    } finally {
      setLoading(false)
      setMessages((prev) => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m))
      try {
        if (!isGreeting) {
          const res = await api.post(`/projects/${projectId}/search`, { query: text })
          setMessages((prev) => prev.map(m => m.id === assistantMsgId ? { ...m, semantic: res.data } : m))
        }
      } catch (err) {
        console.error('semantic search error', err)
      }
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const isDisabled = !documents || documents.length === 0 || loading;

  return (
    <div className="chatPanel">
      <div className="chatHeader">
        <div>
          <div className="chatTitle">{title}</div>
          <div className="chatSubtitle">{subtitle}</div>
        </div>
        
      </div>
      <div className="chatList" ref={listRef}>
        {messages.length === 0 && (
          <div className="emptyState" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
            <div className="emptyIcon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8"></path>
                <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                <path d="M2 14h2"></path>
                <path d="M20 14h2"></path>
                <path d="M15 13v2"></path>
                <path d="M9 13v2"></path>
              </svg>
            </div>
            <div className="emptyTitle">How can I help you?</div>
            <div className="emptyText">Ask anything about your project's documents.</div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id}>
            <MessageBubble role={m.role} content={m.content} isStreaming={m.isStreaming} />
            {m.role === 'assistant' && !m.isStreaming && m.semantic ? (() => {
              const srcs = (m.semantic?.results || []).map((r, i) => ({
                id: r.chunk_id ?? i,
                file_name: r.file_name || 'Unknown',
                page: r.page ?? null,
                chunk: r.chunk_id ?? null,
                text: r.text || '',
                images: Array.isArray(r.images_base64) ? r.images_base64.map(b => `data:image/png;base64,${b}`) : [],
                tables: r.tables_html || []
              }))
              return <SourcesDropdown sources={srcs} />
            })() : null}
            {m.role === 'assistant' && !m.isStreaming && m.sources?.length ? (
              <div className="sourcesCard">
                <div className="sourcesHeader">Sources ({m.sources.length})</div>
                <div className="sourcesList">
                  {m.sources.map(s => (
                    <div key={s.id} className="sourceRow">
                      <div className="sourceIcon">📄</div>
                      <div className="sourceBody">
                        <div className="sourceName">{s.name}</div>
                        <div className="sourceMeta">{s.size} • Just now</div>
                      </div>
                      <div className="pageBadge">{s.page}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {loading && <div className="generatingRow">AI is thinking…</div>}
      </div>
      <div className="chatInputBar">
        <textarea
          className="chatInput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={documents?.length === 0 ? "Upload documents to start chatting" : "Type your message..."}
          rows={1}
          disabled={isDisabled}
        />
        <button
          className={`btn btnPrimary sendBtn ${isDisabled ? 'btnDisabled' : ''}`}
          onClick={send}
          disabled={isDisabled}
          title="Send message"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
    </div>
  )
}
