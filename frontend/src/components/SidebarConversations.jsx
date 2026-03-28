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
  onToggleCollapse,
  docCount = 0
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
        <div className="sidebarProjectIcon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="4" />
            <path d="m12 8 1.5 3.5H17l-3 2.5 1 3.5-3-2-3 2 1-3.5-3-2.5h3.5L12 8z" />
          </svg>
        </div>
        <div className="sidebarHeadText">
          <div className="sidebarTitle" title={projectTitle}>{projectTitle}</div>
          <div className="sidebarStatusRow">
            <span className="sidebarStatusDot" />
            <span className="sidebarSubtitle">{docCount} {docCount === 1 ? 'doc' : 'docs'} indexed</span>
          </div>
        </div>
        <button className="iconBtn sidebarCollapseBtn" onClick={onToggleCollapse} aria-label="Collapse">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="sidebarActionArea">
            <button className="btn btnFull btnOutline newChatBtn" onClick={onNewChat}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Chat
            </button>
          </div>

          <div className="sidebarSectionHeader">CONVERSATIONS</div>
          
          <div className="chatList">
            {chats.map((c) => (
              <div key={c.id} className="chatItemContainer" style={{ position: 'relative', zIndex: menuOpenId === c.id ? 101 : 1 }}>
                <button
                  className={`chatItem ${activeId === c.id ? 'chatItemActive' : ''}`}
                  onClick={() => onSelect(c.id)}
                  title={c.title}
                  style={{ width: '100%' }}
                >
                  <div className="chatItemIcon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <span className="chatItemText">{c.title || `Chat #${c.id}`}</span>
                  
                  {activeId === c.id && (
                    <div className="chatItemActions">
                      <button className="iconBtn chatSmallBtn" onClick={(e) => handleEdit(e, c)} title="Edit title">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className="iconBtn chatSmallBtn" onClick={(e) => handleDelete(e, c.id)} title="Delete chat">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
