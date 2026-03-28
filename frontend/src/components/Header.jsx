import React from 'react'

export function Header({ user, logout }) {
  return (
    <header className="landingHeader">
      <div className="container landingHeaderInner">
        <a className="brand" href="#/" aria-label="Go to Home">
          <svg className="brandLogo" width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 2L2 7L12 12L22 7L12 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
          <span className="brandName">RetrieveX</span>
        </a>

        <nav className="nav" aria-label="Primary navigation">
          <a className="navLink" href="#/">
            Home
          </a>
          <a className="navLink" href="#/about">
            About
          </a>
          <a className="navLink" href="#/features">
            Features
          </a>
          <a className="navLink" href="#/dashboard">
            Dashboard
          </a>
          {user ? (
            <>
              <a className="navLink" href="#/notebooks">Notebooks</a>
              <button className="navLink navLinkButton" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <a className="navLink navLinkButton" href="#/login">
              Login
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}
