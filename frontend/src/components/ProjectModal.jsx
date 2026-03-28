import React, { useEffect, useRef, useState } from 'react'

export function ProjectModal({ open, onClose, onSubmit, initialData = null }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [error, setError] = useState('')
  const dialogRef = useRef(null)

  const isEdit = !!initialData

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name || '')
        setDesc(initialData.description || '')
      } else {
        setName('')
        setDesc('')
      }
      setTimeout(() => dialogRef.current?.classList.add('modalOpen'), 10)
    } else {
      dialogRef.current?.classList.remove('modalOpen')
      setError('')
    }
  }, [open, initialData])

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Project name is required')
      return
    }
    onSubmit({ name: name.trim(), description: desc.trim() })
  }

  if (!open) return null

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" ref={dialogRef} onClick={(e) => e.stopPropagation()}>
        <div className="modalHeaderBar">
          <div className="modalTitleGroup">
            <div className="modalTitleIcon">{isEdit ? '✎' : '✦'}</div>
            <div>
              <div className="modalTitle">{isEdit ? 'Edit project' : 'Create new project'}</div>
              <div className="modalSubtitle">{isEdit ? 'Update your project details' : 'Start organizing your knowledge'}</div>
            </div>
          </div>
          <button className="iconBtn modalClose" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="modalBody">
          <label className="field">
            <span className="fieldLabel">Project Name</span>
            <input
              className="fieldInput modalInput"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Research Assistant"
              autoFocus
            />
            {error && <div className="error-message">{error}</div>}
          </label>
          <label className="field">
            <span className="fieldLabel">Description</span>
            <textarea
              className="fieldTextarea modalTextarea"
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Optional"
            />
          </label>
        </div>
        <div className="modalFooter">
          <button className="btn btnSecondary" onClick={onClose}>Cancel</button>
          <button
            className={`btn btnPrimary ${!name.trim() ? 'btnDisabled' : ''}`}
            onClick={handleSubmit}
            disabled={!name.trim()}
          >
            {isEdit ? 'Save changes' : 'Create project'}
          </button>
        </div>
        {!isEdit && (
          <div className="modalFootnote">You can add documents and start chatting once your project is created</div>
        )}
      </div>
    </div>
  )
}
