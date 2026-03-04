import React from 'react'

export function AppHeader({ user, logout }) {
    return (
      <header className="appHeader">
        <div className="appHeaderInner">
            <div className="appBrand">
                <a href="#/projects" className="brandLink">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinejoin="round"/>
                        <path d="M2 17L12 22L22 17" strokeLinejoin="round"/>
                        <path d="M2 12L12 17L22 12" strokeLinejoin="round"/>
                    </svg>
                    <span>RetrieveX</span>
                </a>
            </div>
            <div className="appNav">
                 <span className="userGreeting">Hi, {user?.username}</span>
                 <div className="userAvatar">{user?.username?.[0]?.toUpperCase()}</div>
                 <button className="iconBtn" onClick={logout} aria-label="Logout">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                 </button>
            </div>
        </div>
      </header>
    )
}
