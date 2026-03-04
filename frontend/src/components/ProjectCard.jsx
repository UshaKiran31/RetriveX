import React, { useState, useEffect, useRef } from 'react'

export function ProjectCard({ title, description, date, onClick, onEdit, onDelete, isCreate }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const handleMenuToggle = (e) => {
    e.stopPropagation()
    setMenuOpen(!menuOpen)
  }

  const handleEdit = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    onEdit()
  }

  const handleDelete = (e) => {
    e.stopPropagation()
    setMenuOpen(false)
    onDelete()
  }

  return (
    <div
      className={`projectCard ${isCreate ? 'projectCardCreate' : ''}`}
      onClick={onClick}
      aria-label={isCreate ? 'Create new project' : `Open project ${title}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="projectCardInner">
        {!isCreate && (
          <div className="projectCardMenuContainer" ref={menuRef}>
            <button
              className="projectCardMenuBtn"
              onClick={handleMenuToggle}
              aria-label="Project menu"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
              </svg>
            </button>
            {menuOpen && (
              <div className="projectCardDropdown">
                <button className="dropdownItem" onClick={handleEdit}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  <span>Edit project</span>
                </button>
                <button className="dropdownItem dropdownItemDelete" onClick={handleDelete}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                  <span>Delete project</span>
                </button>
              </div>
            )}
          </div>
        )}
        <div className="projectCardIcon">
          {isCreate ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="14" rx="2" />
              <path d="M8 21h8" />
              <path d="M12 17v4" />
            </svg>
          )}
        </div>
        <div className="projectCardBody">
          <div className="projectCardTitle">{isCreate ? 'Create New Project' : title}</div>
          <div className="projectCardDesc">
            {isCreate ? 'Start a blank RAG workspace' : description}
          </div>
        </div>
        {!isCreate && (
          <div className="projectCardMeta">Created {date}</div>
        )}
      </div>
    </div>
  )
}

