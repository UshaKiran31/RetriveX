import React, { useEffect, useRef, useState } from 'react'

export function ChatTitleModal({ open, onClose, onSubmit, initialTitle = '' }) {
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTitle(initialTitle || '')
      setTimeout(() => dialogRef.current?.classList.add('modalOpen'), 10)
    } else {
      dialogRef.current?.classList.remove('modalOpen')
      setError('')
    }
  }, [open, initialTitle])

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Chat title is required')
      return
    }
    onSubmit(title.trim())
  }

  if (!open) return null

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" ref={dialogRef} onClick={(e) => e.stopPropagation()} style={{ width: '400px' }}>
        <div className="modalHeaderBar">
          <div className="modalTitleGroup">
            <div className="modalTitleIcon">✎</div>
            <div>
              <div className="modalTitle">Edit Chat Title</div>
              <div className="modalSubtitle">Give this conversation a new name</div>
            </div>
          </div>
          <button className="iconBtn modalClose" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="modalBody">
          <label className="field">
            <span className="fieldLabel">Chat Title</span>
            <input
              className="fieldInput modalInput"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Analysis of report"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {error && <div className="error-message">{error}</div>}
          </label>
        </div>
        <div className="modalFooter">
          <button className="btn btnSecondary" onClick={onClose}>Cancel</button>
          <button
            className={`btn btnPrimary ${!title.trim() ? 'btnDisabled' : ''}`}
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            Save Title
          </button>
        </div>
      </div>
    </div>
  )
}
