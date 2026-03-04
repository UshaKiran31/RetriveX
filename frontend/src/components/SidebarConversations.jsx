import React, { useState, useRef, useEffect } from 'react'

export function SidebarConversations({
  projectTitle,
  projectSubtitle,
  chats,
  activeId,
  onSelect,
  onNewChat,
  onEditChat,
  onDeleteChat,
  collapsed,
  onToggleCollapse
}) {
  const [menuOpenId, setMenuOpenId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null)
      }
    }
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpenId])

  const handleMenuToggle = (e, chatId) => {
    e.stopPropagation()
    setMenuOpenId(menuOpenId === chatId ? null : chatId)
  }

  const handleEdit = (e, chat) => {
    e.stopPropagation()
    setMenuOpenId(null)
    onEditChat(chat)
  }

  const handleDelete = (e, chatId) => {
    e.stopPropagation()
    setMenuOpenId(null)
    onDeleteChat(chatId)
  }

  return (
    <div className={`sidebar ${collapsed ? 'sidebarCollapsed' : ''}`}>
      <div className="sidebarHeader">
        <div className="sidebarHeadText">
          <div className="sidebarTitle" title={projectTitle}>{projectTitle}</div>
          {projectSubtitle ? <div className="sidebarSubtitle">{projectSubtitle}</div> : null}
        </div>
        <button className="iconBtn" onClick={onToggleCollapse} aria-label="Collapse">
          {collapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          )}
        </button>
      </div>
      {!collapsed && (
        <>
          <button className="btn btnFull btnPrimary newChatBtn" onClick={onNewChat}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            New Conversation
          </button>
          <div className="chatList">
            {chats.map((c) => (
              <div key={c.id} className="chatItemContainer" style={{ position: 'relative', zIndex: menuOpenId === c.id ? 101 : 1 }}>
                <button
                  className={`chatItem ${activeId === c.id ? 'chatItemActive' : ''}`}
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                  style={{ width: '100%', paddingRight: '40px' }}
                >
                  <span className="chatItemDot" />
                  <span className="chatItemText">{c.title || `Chat #${c.id}`}</span>
                </button>
                <div className="chatItemMenu" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                  <button
                    className="iconBtn chatMenuBtn"
                    onClick={(e) => handleMenuToggle(e, c.id)}
                    aria-label="Chat menu"
                    style={{ width: '24px', height: '24px', opacity: activeId === c.id || menuOpenId === c.id ? 1 : 0 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
                    </svg>
                  </button>
                  {menuOpenId === c.id && (
                    <div className="projectCardDropdown" ref={menuRef} style={{ top: '28px', right: '0', width: '140px' }}>
                      <button className="dropdownItem" onClick={(e) => handleEdit(e, c)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        <span>Edit title</span>
                      </button>
                      <button className="dropdownItem dropdownItemDelete" onClick={(e) => handleDelete(e, c.id)}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <line x1="10" y1="11" x2="10" y2="17" />
                          <line x1="14" y1="11" x2="14" y2="17" />
                        </svg>
                        <span>Delete chat</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
