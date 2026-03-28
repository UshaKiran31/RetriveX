import React, { useEffect, useRef, useState, useMemo } from 'react'
import { MessageBubble } from './MessageBubble'
import ReactMarkdown from 'react-markdown'
import api from '../api/axios'
import { SemanticResults } from './SemanticResults'
import { SourcesDropdown } from './SourcesDropdown'

function TabularResult({ tabular }) {
  const t = tabular
  const isScalar = t.scalar
  const cols = t.columns || (t.data?.[0] ? Object.keys(t.data[0]) : [])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })

  const sortedData = useMemo(() => {
    let items = [...(t.data || [])]
    if (searchTerm) {
      const low = searchTerm.toLowerCase()
      items = items.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(low)))
    }
    if (sortConfig.key) {
      items.sort((a, b) => {
        const av = a[sortConfig.key], bv = b[sortConfig.key]
        if (av < bv) return sortConfig.direction === 'asc' ? -1 : 1
        if (av > bv) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return items
  }, [t.data, searchTerm, sortConfig])

  const requestSort = (key) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }))
  }

  if (isScalar || !t.data?.length) return null

  return (
    <div className="tabularResultContainer">
      <div className="tabularTableContainer">
        <div className="tabularTableControls">
          <input
            type="text"
            className="tabularSearchInput"
            placeholder="Search in data..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <span style={{ fontSize: '11px', opacity: 0.5 }}>
            Showing {sortedData.length} of {t.data.length} rows
          </span>
        </div>
        <table className="tabularTable">
          <thead>
            <tr>
              {cols.map(c => (
                <th key={c} className="tabularTh" onClick={() => requestSort(c)}>
                  {c}
                  <span className="sortIcon">
                    {sortConfig.key === c ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'tabularRowEven' : 'tabularRowOdd'}>
                {cols.map(c => (
                  <td key={c} className="tabularTd" title={String(row[c] ?? '')}>
                    {typeof row[c] === 'number' ? Number(row[c].toFixed(4)) : String(row[c] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="tabularTableFooter">
          <span>📊 {t.source}</span>
          {t.code && <code style={{ opacity: 0.6 }}>{t.code}</code>}
        </div>
      </div>
    </div>
  )
}

export function ChatWindow({ projectId, chatId, title, subtitle = 'Project Chat', onNewChat, documents, setDocuments }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [recording, setRecording] = useState(false)
  const recognitionRef = useRef(null)
  const listRef = useRef(null)

  const toggleRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Try Chrome or Edge.')
      return
    }

    if (recording) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognitionRef.current = recognition

    let finalTranscript = ''

    recognition.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalTranscript += t + ' '
        else interim = t
      }
      setInput(finalTranscript + interim)
    }

    recognition.onend = () => {
      setRecording(false)
      // trim trailing space left by finalTranscript accumulation
      setInput(prev => prev.trimEnd())
    }

    recognition.onerror = (e) => {
      console.error('Speech recognition error:', e.error)
      setRecording(false)
    }

    recognition.start()
    setRecording(true)
  }

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
              const parsed = JSON.parse(m.sources_json)
              return { ...m, semantic: parsed }
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
        body: JSON.stringify({ conversation_id: chatId, message: text })
      })

      if (!res.ok) throw new Error('Network response was not ok')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let done = false
      let rawBuffer = ''

      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          const chunk = decoder.decode(value, { stream: true })
          rawBuffer += chunk
          // Check if this is a tabular result
          if (rawBuffer.startsWith('__TABULAR__')) {
            setMessages((prev) => prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: '⏳ Computing result...' } : m
            ))
          } else {
            setMessages((prev) => prev.map((m) =>
              m.id === assistantMsgId ? { ...m, content: m.content + chunk } : m
            ))
          }
        }
      }

      // Parse tabular payload if present
      if (rawBuffer.startsWith('__TABULAR__')) {
        try {
          const tabularData = JSON.parse(rawBuffer.slice('__TABULAR__'.length))
          // Use summary if available, otherwise fallback to scalar value or source label
          const displayContent = tabularData.summary || 
            (tabularData.scalar 
              ? (tabularData.raw || '') 
              : ` Data from **${tabularData.source}**`)
              
          setMessages((prev) => prev.map((m) =>
            m.id === assistantMsgId
              ? { ...m, content: displayContent, semantic: { tabular: tabularData } }
              : m
          ))
        } catch (_) {}
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
          setMessages((prev) => prev.map(m => {
            if (m.id !== assistantMsgId) return m
            // Don't overwrite tabular semantic data
            if (m.semantic?.tabular) return m
            return { ...m, semantic: res.data }
          }))
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
          <div className="emptyState">
            <div className="emptyIcon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 8V4H8"></path>
                <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                <path d="M2 14h2"></path>
                <path d="M20 14h2"></path>
                <path d="M15 13v2"></path>
                <path d="M9 13v2"></path>
              </svg>
            </div>
            <div className="emptyTitle">How can I help you?</div>
            <div className="emptyText">Ask anything about your project's documents and get instant answers.</div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id}>
            <MessageBubble role={m.role} content={m.content} isStreaming={m.isStreaming} />

            {/* Tabular result display */}
            {m.role === 'assistant' && !m.isStreaming && m.semantic?.tabular && (
              <TabularResult tabular={m.semantic.tabular} />
            )}

            {/* Semantic sources */}
            {m.role === 'assistant' && !m.isStreaming && m.semantic && !m.semantic.tabular ? (() => {
              const srcs = (m.semantic?.results || []).map((r, i) => ({
                id: r.chunk_id ?? i,
                file_name: r.file_name || 'Unknown',
                page: r.page ?? null,
                chunk: r.chunk_id ?? null,
                score: r.score ?? null,
                text: r.text || '',
                images: Array.isArray(r.images_base64) ? r.images_base64.map(b => `data:image/png;base64,${b}`) : [],
                tables: r.tables_html || []
              }))
              return (
                <div style={{ marginLeft: '44px', marginTop: '-12px', marginBottom: '16px' }}>
                  <SourcesDropdown sources={srcs} />
                </div>
              )
            })() : null}
          </div>
        ))}
      </div>

      <div className="chatInputBar">
        <button
          className={`audioUploadBtn ${recording ? 'audioRecording' : ''}`}
          onClick={toggleRecording}
          title={recording ? 'Stop recording' : 'Speak to type'}
        >
          {recording ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23"/>
              <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
          )}
        </button>
        <textarea
          className="chatInput"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={documents?.length === 0 ? "Upload documents to start" : "Message AI..."}
          rows={1}
          disabled={isDisabled}
        />
        <button
          className="sendBtn"
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
