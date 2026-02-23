import { useEffect, useState } from 'react'
import './App.css'
import Dither from './components/Dither/Dither'

let hasHandledInitialHash = false

function getLocationFromHash() {
  if (typeof window === 'undefined') return '/'
  const hash = window.location.hash || '#/'
  if (!hasHandledInitialHash) {
    hasHandledInitialHash = true
    if (hash === '#/login' || hash.startsWith('#/login?')) {
      // Don't redirect automatically, let the user go to login if they want
      // or if they are redirected by protected route logic
    }
  }
  const raw = hash.slice(1) || '/'
  const [pathPart, queryPart] = raw.split('?')
  const params = new URLSearchParams(queryPart || '')
  const query = Object.fromEntries(params.entries())
  return { path: pathPart || '/', query }
}

function App() {
  const [location, setLocation] = useState(getLocationFromHash)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [user, setUser] = useState(null)

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    window.location.hash = '#/'
  }

  useEffect(() => {
    const handleHashChange = () => setLocation(getLocationFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (token) {
      // Validate token and get user info
      fetch('http://localhost:8001/me', {
        headers: { 'X-Session-Id': token },
      })
        .then((res) => {
          if (res.ok) return res.json()
          throw new Error('Invalid token')
        })
        .then((data) => setUser(data))
        .catch(() => {
          logout()
        })
    }
  }, [token])

  const login = (newToken) => {
    localStorage.setItem('token', newToken)
    setToken(newToken)
    window.location.hash = '#/notebooks'
  }



  let page
  if (location.path === '/about') {
    page = <AboutPage />
  } else if (location.path === '/dashboard') {
    page = <DashboardOverviewPage />
  } else if (location.path === '/reports/query-analytics') {
    page = <QueryAnalyticsReport />
  } else if (location.path === '/reports/document-source') {
    page = <DocumentSourceReport tab={location.query.tab} />
  } else if (location.path === '/reports/system-health') {
    page = <SystemHealthReport />
  } else if (location.path === '/login') {
    page = <LoginPage onLogin={login} />
  } else if (location.path === '/signup') {
    page = <SignupPage onLogin={login} />
  } else if (location.path === '/notebooks') {
    page = token ? <NotebooksPage token={token} /> : <LoginPage onLogin={login} />
  } else if (location.path === '/notebooks/new') {
    page = token ? <CreateNotebookPage token={token} /> : <LoginPage onLogin={login} />
  } else if (location.path.startsWith('/notebooks/')) {
    const id = location.path.split('/')[2]
    page = token ? <NotebookChatPage token={token} id={parseInt(id)} /> : <LoginPage onLogin={login} />
  } else {
    const initialSection =
      location.path === '/features' || location.path === '/login' ? location.path.slice(1) : null
    page = <HomePage initialSection={initialSection} />
  }

  return (
    <div className={location.path.startsWith('/notebooks') ? "app-mode" : "landing"}>
      {location.path.startsWith('/notebooks') ? (
        <AppHeader user={user} logout={logout} />
      ) : (
        <Header user={user} logout={logout} />
      )}
      <main>{page}</main>
      {!location.path.startsWith('/notebooks') && location.path !== '/' && <Footer />}
    </div>
  )
}

function Header({ user, logout }) {
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

function AppHeader({ user, logout }) {
  return (
    <header className="appHeader">
      <div className="appHeaderInner">
        <div className="appBrand">
          <a href="#/notebooks" className="brandLink">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" strokeLinejoin="round" />
              <path d="M2 17L12 22L22 17" strokeLinejoin="round" />
              <path d="M2 12L12 17L22 12" strokeLinejoin="round" />
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

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "356131392279-hr59pjv0jqnt1efbvk1jdqbp2g1veqdj.apps.googleusercontent.com",
        callback: handleGoogleCallback
      });
      window.google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, [])

  const handleGoogleCallback = async (response) => {
    try {
      const res = await fetch('http://localhost:8001/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Google login failed')
      }

      const data = await res.json()
      onLogin(data.session_id)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const res = await fetch('http://localhost:8001/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (!res.ok) {
        const data = await res.json()
        let msg = data.detail || 'Invalid credentials'
        if (typeof msg !== 'string') {
          msg = Array.isArray(msg)
            ? msg.map(e => e.msg || JSON.stringify(e)).join(', ')
            : JSON.stringify(msg)
        }
        throw new Error(msg)
      }

      const data = await res.json()
      onLogin(data.session_id)
    } catch (err) {
      setError(err.message || 'Invalid username or password')
    }
  }

  return (
    <section className="section loginSection">
      <div className="container">
        <div className="authCard">
          <div className="authHeader">
            <h1 className="authTitle">Welcome back</h1>
            <p className="authSubtitle">Sign in to continue to RetrieveX</p>
          </div>

          <div id="googleSignInDiv" style={{ width: '100%', marginBottom: '1.5rem', height: 40 }}></div>

          <div className="authDivider">Or continue with username</div>

          <form className="authForm" onSubmit={handleSubmit}>
            <label className="field">
              <span className="fieldLabel">Username</span>
              <input
                className="fieldInput"
                type="text"
                placeholder="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="fieldLabel">Password</span>
              <input
                className="fieldInput"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </label>

            {error && <div className="authError">{error}</div>}

            <div className="authFooter">
              <label className="checkboxLabel">
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" className="authLink">Forgot password?</a>
            </div>

            <button className="btn btnPrimary btnFull" type="submit">
              Sign in
            </button>
          </form>

          <div className="authBottom">
            Don't have an account? <a href="#/signup" className="authLink">Sign up</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function SignupPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (window.google) {
      window.google.accounts.id.initialize({
        client_id: "356131392279-hr59pjv0jqnt1efbvk1jdqbp2g1veqdj.apps.googleusercontent.com",
        callback: handleGoogleCallback
      });
      window.google.accounts.id.renderButton(
        document.getElementById("googleSignUpDiv"),
        { theme: "outline", size: "large", width: "100%" }
      );
    }
  }, [])

  const handleGoogleCallback = async (response) => {
    try {
      const res = await fetch('http://localhost:8001/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.detail || 'Google login failed')
      }

      const data = await res.json()
      onLogin(data.session_id)
    } catch (err) {
      setError(err.message)
    }
  }

  const validatePassword = (pwd) => {
    if (pwd.length < 6) return "Password must be at least 6 characters long";
    if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
    if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
    if (!/\d/.test(pwd)) return "Password must contain at least one number";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character";
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const pwdError = validatePassword(password);
    if (pwdError) {
      setError(pwdError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }

    // Basic email validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Invalid email format")
      return
    }

    try {
      const res = await fetch('http://localhost:8001/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          email: email ? email.trim() : null
        })
      })

      if (!res.ok) {
        const data = await res.json()
        let msg = data.detail || 'Signup failed'
        if (typeof msg !== 'string') {
          msg = Array.isArray(msg)
            ? msg.map(e => e.msg || JSON.stringify(e)).join(', ')
            : JSON.stringify(msg)
        }
        throw new Error(msg)
      }

      const data = await res.json()
      onLogin(data.session_id)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="section loginSection">
      <div className="container">
        <div className="authCard">
          <div className="authHeader">
            <h1 className="authTitle">Create your account</h1>
            <p className="authSubtitle">Sign up to start using RetrieveX</p>
          </div>

          <div id="googleSignUpDiv" style={{ width: '100%', marginBottom: '1.5rem', height: 40 }}></div>

          <div className="authDivider">Or continue with username</div>

          <form className="authForm" onSubmit={handleSubmit}>
            <label className="field">
              <span className="fieldLabel">Username</span>
              <input
                className="fieldInput"
                type="text"
                placeholder="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span className="fieldLabel">Email (Optional)</span>
              <input
                className="fieldInput"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              <span className="fieldLabel">Password</span>
              <input
                className="fieldInput"
                type="password"
                placeholder="At least 6 chars, 1 uppercase, 1 special"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>
                Must contain: 6 chars, uppercase, lowercase, number, special char
              </div>
            </label>
            <label className="field">
              <span className="fieldLabel">Confirm Password</span>
              <input
                className="fieldInput"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </label>

            {error && <div className="authError">{error}</div>}

            <button className="btn btnPrimary btnFull" type="submit">
              Create account
            </button>
          </form>

          <div className="authBottom">
            Already have an account? <a href="#/login" className="authLink">Sign in</a>
          </div>
        </div>
      </div>
    </section>
  )
}

function NotebooksPage({ token }) {
  const [notebooks, setNotebooks] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [newTitle, setNewTitle] = useState('')

  useEffect(() => {
    fetch('http://localhost:8001/notebooks', {
      headers: { 'X-Session-Id': token }
    })
      .then(res => res.json())
      .then(data => setNotebooks(data))
  }, [token])

  const handleUpload = async (files) => {
    const formData = new FormData()
    const title = files[0].name.split('.')[0] || "Untitled Notebook"
    formData.append('title', title)

    files.forEach(file => {
      formData.append('files', file)
    })

    try {
      const res = await fetch('http://localhost:8001/notebooks', {
        method: 'POST',
        headers: {
          'X-Session-Id': token
        },
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        window.location.hash = `#/notebooks/${data.id}`
      }
    } catch (e) {
      console.error("Upload failed", e)
    }
  }

  const openMenu = (id) => setMenuOpenId(menuOpenId === id ? null : id)
  const startEdit = (nb) => {
    setEditingId(nb.id)
    setNewTitle(nb.title)
    setMenuOpenId(null)
  }
  const submitEdit = async (e) => {
    e.preventDefault()
    const res = await fetch(`http://localhost:8001/notebooks/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Session-Id': token },
      body: JSON.stringify({ title: newTitle })
    })
    if (res.ok) {
      const updated = await res.json()
      setNotebooks(notebooks.map(n => n.id === updated.id ? updated : n))
      setEditingId(null)
      setNewTitle('')
    }
  }
  const deleteNotebook = async (id) => {
    const ok = window.confirm('Delete this notebook?')
    if (!ok) return
    const res = await fetch(`http://localhost:8001/notebooks/${id}`, {
      method: 'DELETE',
      headers: { 'X-Session-Id': token }
    })
    if (res.ok) {
      setNotebooks(notebooks.filter(n => n.id !== id))
    }
  }

  return (
    <div className="appContainer">
      {showModal && (
        <NotebookUploadModal
          onClose={() => setShowModal(false)}
          onUpload={handleUpload}
        />
      )}
      <div className="appHeaderSection">
        <h2 className="appPageTitle">Recent notebooks</h2>

      </div>

      <div className="notebooksGrid">
        <div className="notebookCard createCard" onClick={() => setShowModal(true)}>
          <div className="createIcon">+</div>
          <div className="createLabel">Create new notebook</div>
        </div>

        {notebooks.map(nb => (
          <div key={nb.id} className="notebookCard" style={{ position: 'relative' }}>
            <a href={`#/notebooks/${nb.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div className="notebookIcon" style={{ background: getRandomColor(nb.id) }}>{nb.icon || '📄'}</div>
              <div className="notebookInfo">
                <h3 className="notebookTitle">{nb.title}</h3>
                <div className="notebookMeta">
                  {nb.date} · {nb.sources} sources
                </div>
              </div>
            </a>
            <button
              className="iconBtn"
              onClick={() => openMenu(nb.id)}
              style={{ position: 'absolute', top: 8, right: 8 }}
              aria-label="Menu"
            >⋮</button>
            {menuOpenId === nb.id && (
              <div className="menuPanel" style={{ position: 'absolute', top: 36, right: 8, zIndex: 10 }}>
                <button className="menuItem" onClick={() => startEdit(nb)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  <span>Edit title</span>
                </button>
                <button className="menuItem" onClick={() => deleteNotebook(nb.id)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6l1-3h4l1 3" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {editingId && (
        <div className="modalOverlay" onClick={() => setEditingId(null)}>
          <div className="modalContent" onClick={e => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Edit title</h3>
              <button className="closeBtn" onClick={() => setEditingId(null)}>×</button>
            </div>
            <div className="modalBody">
              <form onSubmit={submitEdit}>
                <label className="field">
                  <span className="fieldLabel">Title</span>
                  <input className="fieldInput darkInput" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                </label>
                <div className="modalFooter">
                  <button type="button" className="btn btnSecondary" onClick={() => setEditingId(null)}>Cancel</button>
                  <button type="submit" className="btn btnPrimary">Save</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function NotebookChatPage({ token, id }) {
  const [notebook, setNotebook] = useState(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sources, setSources] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetch(`http://localhost:8001/notebooks/${id}`, {
      headers: { 'X-Session-Id': token }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load')
        return res.json()
      })
      .then(data => {
        setNotebook(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Load chat history
    fetch(`http://localhost:8001/notebooks/${id}/chat`, {
      headers: { 'X-Session-Id': token }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data)
        }
      })
      .catch(console.error)
  }, [token, id])

  const handleUpload = async (files) => {
    const formData = new FormData()
    files.forEach(file => formData.append('files', file))
    try {
      const res = await fetch(`http://localhost:8001/notebooks/${id}/files`, {
        method: 'POST',
        headers: { 'X-Session-Id': token },
        body: formData
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Upload failed')
      }
      const data = await res.json()
      setNotebook(data)
      setShowModal(false)
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Upload error: ${e.message}` }])
    }
  }

  const sendMessage = async () => {
    const q = input.trim()
    if (!q) return
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setInput('')
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:8001/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': token
        },
        body: JSON.stringify({ notebook_id: id, question: q })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Chat failed')
      }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer }])
      setSources(Array.isArray(data.sources) ? data.sources : [])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  const getFileName = (path) => {
    if (!path) return ''
    return path.replace(/^.*[\\\/]/, '')
  }

  if (loading) return <div className="appContainer">Loading...</div>
  if (!notebook) return <div className="appContainer">Notebook not found</div>

  return (
    <div className="chatLayout">
      <aside className="chatSidebar">
        <div className="sidebarHeader">
          <a href="#/notebooks" className="backBtn" aria-label="Back to notebooks">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </a>
          <span className="sidebarTitle">Sources</span>
          <button className="iconBtn" onClick={() => setShowModal(true)} aria-label="Add sources">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
        <div className="sourcesList">
          <div className="sourcesHeader">
            <span>{notebook.sources} source{notebook.sources !== 1 ? 's' : ''}</span>
          </div>
          {(sources.length > 0 ? sources.map((src, i) => (
            <div key={i} className="sourceItem active">
              <span className="sourceIcon">📄</span>
              <span className="sourceName">{getFileName(src.file)}</span>
              <span className="sourceCheck">✓</span>
            </div>
          )) : (notebook.files || []).map((file, i) => (
            <div key={i} className="sourceItem">
              <span className="sourceIcon">📄</span>
              <span className="sourceName">{getFileName(file)}</span>
            </div>
          )))}
        </div>
      </aside>
      <main className="chatMain">
        {showModal && (
          <NotebookUploadModal onClose={() => setShowModal(false)} onUpload={handleUpload} />
        )}
        <div className="chatMessages">
          {messages.length === 0 && (
            <div className="chatEmptyState">
              <div className="notebookIconLarge" style={{ background: '#ffab40' }}>{notebook.icon || '📙'}</div>
              <h1 className="chatTitle">{notebook.title}</h1>
              <div className="chatMeta">{notebook.sources} source{notebook.sources !== 1 ? 's' : ''}</div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="messageContent">{msg.content}</div>
            </div>
          ))}
          {isLoading && (
            <div className="loadingRow">
              <span className="loadingSpinner" aria-hidden="true"></span>
              <span>Exploring your material...</span>
            </div>
          )}
        </div>
        <div className="chatInputArea">
          <div className="chatInputWrapper">
            <input
              type="text"
              placeholder="Start typing..."
              className="chatInput"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button className="sendBtn" onClick={sendMessage}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
          <div className="chatDisclaimer">
            NotebookLM can be inaccurate; please double-check its responses.
          </div>
        </div>
      </main>
    </div>
  )
}

function NotebookUploadModal({ onClose, onUpload }) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)])
    }
  }

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files)])
    }
  }

  const handleUploadClick = () => {
    if (files.length === 0) return
    onUpload(files)
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={e => e.stopPropagation()}>
        <div className="modalHeader">
          <h3>Add sources</h3>
          <button className="closeBtn" onClick={onClose}>×</button>
        </div>
        <div className="modalBody">
          <p className="modalDesc">
            Sources let NotebookLM base its responses on the information that matters most to you.
            (Examples: marketing plans, course reading, research notes, meeting transcripts, sales documents, etc.)
          </p>

          {files.length > 0 ? (
            <div className="fileList">
              {files.map((f, i) => (
                <div key={i} className="fileItem">
                  <span>📄 {f.name}</span>
                  <button onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>×</button>
                </div>
              ))}
              <button className="addMoreBtn" onClick={() => document.getElementById('fileInput').click()}>+ Add more</button>
            </div>
          ) : (
            <div
              className={`uploadZone ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="uploadIcon">⬆️</div>
              <div className="uploadText">Upload sources</div>
              <div className="uploadSubtext">Drag and drop or <span className="link" onClick={() => document.getElementById('fileInput').click()}>choose file</span> to upload</div>
            </div>
          )}

          <input
            type="file"
            id="fileInput"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          <div className="supportedTypes">
            Supported file types: PDF, .txt, Markdown, Audio (e.g. .mp3), .docx, .avif, .bmp, .gif, .ico, .jp2, .png, .webp, .jxl, .tiff, .heic, .heif, .jpg, .ipe
          </div>
        </div>
        <div className="modalFooter">
          <div className="sourceLimit">Source limit 0/50</div>
          {files.length > 0 && (
            <button className="btn btnPrimary" onClick={handleUploadClick}>Insert {files.length} sources</button>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateNotebookPage({ token }) {
  const [title, setTitle] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newNotebook = {
      id: Date.now(),
      title: title || 'Untitled Notebook',
      date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      sources: 0,
      icon: '📘'
    }

    await fetch('http://localhost:8001/notebooks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': token
      },
      body: JSON.stringify(newNotebook)
    })

    window.location.hash = '#/notebooks'
  }

  return (
    <div className="appContainer">
      <div className="appHeaderSection">
        <h2 className="appPageTitle">Create new notebook</h2>
      </div>
      <div className="createNotebookForm">
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span className="fieldLabel" style={{ color: '#fff' }}>Notebook Title</span>
            <input
              className="fieldInput darkInput"
              type="text"
              placeholder="Enter notebook title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </label>
          <div className="formActions">
            <a href="#/notebooks" className="btn btnSecondary">Cancel</a>
            <button type="submit" className="btn btnPrimary">Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function getRandomColor(id) {
  const colors = ['#ff4081', '#7c4dff', '#00e5ff', '#00e676', '#ffea00', '#ff9100'];
  return colors[id % colors.length];
}


function Footer() {
  return (
    <footer className="footer">
      <div className="container footerInner">
        <div className="footerBrand">RetrieveX</div>
        <div className="footerMeta">
          <div>Technologies Used: React, Vite, FastAPI, FAISS, Local LLMs</div>
          <div>Academic Project – Major Project</div>
          <div>{new Date().getFullYear()}</div>
        </div>
      </div>
    </footer>
  )
}

function HomePage({ initialSection }) {
  useEffect(() => {
    if (!initialSection) return
    const targetId = initialSection === 'features' || initialSection === 'login' ? initialSection : null
    if (!targetId) return
    const el = document.getElementById(targetId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [initialSection])

  return (
    <>
      <Dither
        waveColor={[0.75, 0.75, 0.75]}
        backgroundColor={[1, 1, 1]}
        disableAnimation={false}
        enableMouseInteraction
        mouseRadius={0.3}
        colorNum={4}
        waveAmplitude={0.3}
        waveFrequency={3}
        waveSpeed={0.05}
        className="dither-full-page"
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <section id="home" className="section hero" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="container heroInner" style={{ position: 'relative', zIndex: 1 }}>
            <div className="heroTopline">Fully offline • Privacy-preserving • Multi-modal</div>
            <h1 className="heroTitle">
              Offline <span className="gradientText">Multi-modal</span> Knowledge Retrieval System
            </h1>
            <p className="heroSubtitle">
              Query PDFs, documents, images, and audio files using natural language — fully offline and privacy-preserving.
            </p> 
            

            <div className="heroActions">
              <a className="btn btnPrimary" href="#/login">
                Get Started
              </a>
              <a className="btn btnSecondary" href="#/features">
                View Features
              </a>
            </div>
          </div>
        </section>

        <section id="about" className="section sectionAlt">
          <div className="container">
            <div className="sectionHeader">
              <h2 className="sectionTitle">Why Traditional Search Falls Short</h2>
            </div>

            <div className="twoCol">
              <div className="panel">
                <div className="panelTitle">Problem</div>
                <ul className="list">
                  <li>Keyword-based search lacks context</li>
                  <li>Cannot query across multiple file formats</li>
                  <li>Cloud-based AI risks data privacy</li>
                </ul>
              </div>

              <div className="panel panelHighlight">
                <div className="panelTitle">Solution</div>
                <ul className="list">
                  <li>Semantic search across multiple data types</li>
                  <li>Retrieval-Augmented Generation (RAG)</li>
                  <li>Fully offline local AI processing</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="section">
          <div className="container">
            <div className="sectionHeader">
              <h2 className="sectionTitle">Core Capabilities</h2>
            </div>

            <div className="cardGrid">
              <div className="card">
                <div className="cardIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="iconSvg">
                    <path
                      d="M4 6.5A2.5 2.5 0 0 1 6.5 4h3A2.5 2.5 0 0 1 12 6.5v11A2.5 2.5 0 0 0 9.5 15h-3A2.5 2.5 0 0 0 4 17.5v-11Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M20 6.5A2.5 2.5 0 0 0 17.5 4h-3A2.5 2.5 0 0 0 12 6.5v11a2.5 2.5 0 0 1 2.5-2.5h3A2.5 2.5 0 0 1 20 17.5v-11Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="cardTitle">Multi-modal Processing</div>
                <ul className="cardList">
                  <li>Supports PDF, DOCX, Images, and Audio</li>
                  <li>Automatic modality detection</li>
                </ul>
              </div>

              <div className="card">
                <div className="cardIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="iconSvg">
                    <path
                      d="M10.5 7.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <path
                      d="M14.2 14.2 19 19"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="cardTitle">Semantic Retrieval</div>
                <ul className="cardList">
                  <li>Vector-based similarity search</li>
                  <li>FAISS-powered indexing</li>
                </ul>
              </div>

              <div className="card">
                <div className="cardIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="iconSvg">
                    <path
                      d="M7.5 9.5a3.5 3.5 0 0 1 6.9-1.1A3.2 3.2 0 0 1 18.7 11c0 1.9-1.6 3.5-3.5 3.5H9.2C7.4 14.5 6 13 6 11.2c0-1.5 1-2.9 2.5-3.2Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9 18h6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="cardTitle">Context-Aware Answering</div>
                <ul className="cardList">
                  <li>RAG-based response generation</li>
                  <li>Grounded in retrieved evidence</li>
                </ul>
              </div>

              <div className="card">
                <div className="cardIcon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="iconSvg">
                    <path
                      d="M12 3a6 6 0 0 0-6 6v3.2c0 1.1-.6 2.2-1.6 2.8-.3.2-.4.6-.2.9.7 1 1.8 1.6 3 1.6h9.6c1.2 0 2.3-.6 3-1.6.2-.3.1-.7-.2-.9-1-.6-1.6-1.7-1.6-2.8V9a6 6 0 0 0-6-6Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M9.5 20a2.5 2.5 0 0 0 5 0"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="cardTitle">Offline &amp; Secure</div>
                <ul className="cardList">
                  <li>No cloud dependency</li>
                  <li>Complete data privacy</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id="workflow" className="section sectionAlt">
          <div className="container">
            <div className="sectionHeader">
              <h2 className="sectionTitle">How the System Works</h2>
            </div>

            <div className="workflow">
              <div className="workflowStep">
                <div className="stepNumber">1</div>
                <div className="stepText">Upload multi-modal files</div>
              </div>
              <div className="workflowArrow" aria-hidden="true">
                <span />
              </div>
              <div className="workflowStep">
                <div className="stepNumber">2</div>
                <div className="stepText">Content extraction using agents</div>
              </div>
              <div className="workflowArrow" aria-hidden="true">
                <span />
              </div>
              <div className="workflowStep">
                <div className="stepNumber">3</div>
                <div className="stepText">Embedding generation and indexing</div>
              </div>
              <div className="workflowArrow" aria-hidden="true">
                <span />
              </div>
              <div className="workflowStep">
                <div className="stepNumber">4</div>
                <div className="stepText">Natural language query</div>
              </div>
              <div className="workflowArrow" aria-hidden="true">
                <span />
              </div>
              <div className="workflowStep">
                <div className="stepNumber">5</div>
                <div className="stepText">Evidence-backed response</div>
              </div>
            </div>
          </div>
        </section>

        <section id="use-cases" className="section">
          <div className="container">
            <div className="sectionHeader">
              <h2 className="sectionTitle">Who Can Use This System?</h2>
            </div>

            <div className="useCases">
              <div className="useCaseItem">
                <div className="useCaseTitle">Researchers &amp; Academicians</div>
                <div className="useCaseDesc">Faster literature review across PDF, image, audio.</div>
              </div>
              <div className="useCaseItem">
                <div className="useCaseTitle">Enterprise &amp; Corporate Users</div>
                <div className="useCaseDesc">Private search across internal docs and meetings.</div>
              </div>
              <div className="useCaseItem">
                <div className="useCaseTitle">Legal &amp; Compliance Professionals</div>
                <div className="useCaseDesc">Evidence-backed answers with exact source references.</div>
              </div>
              <div className="useCaseItem">
                <div className="useCaseTitle">Healthcare &amp; Medical Staff</div>
                <div className="useCaseDesc">Local analysis of reports, notes, and audio.</div>
              </div>
              <div className="useCaseItem">
                <div className="useCaseTitle">Students &amp; Self-Learners</div>
                <div className="useCaseDesc">Study assistant for notes, lectures, and textbooks.</div>
              </div>
              <div className="useCaseItem">
                <div className="useCaseTitle">Admins &amp; Developers</div>
                <div className="useCaseDesc">Extend agents and customize offline pipelines.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="dashboard" className="section sectionAlt">
          <div className="container">
            <div className="sectionHeader">
              <h2 className="sectionTitle">Built-in Reports &amp; Dashboards</h2>
              <p className="sectionSubtitle">
                Preview the analytics and monitoring views powered by your offline multi-modal RAG system.
              </p>
            </div>

            <div className="reportsGrid">
              <a className="reportTile" href="#/reports/query-analytics">
                <div className="reportTileHeader">
                  <span className="reportTileTitle">Query Analytics Dashboard</span>
                </div>
                <div className="reportTileBody">
                  <div>Total queries performed</div>
                  <div>Most queried documents</div>
                  <div>Average response time</div>
                  <div>Query volume over time</div>
                </div>
                <span className="reportTileLink">Open report</span>
              </a>

              <a className="reportTile" href="#/reports/document-source?tab=usage">
                <div className="reportTileHeader">
                  <span className="reportTileTitle">Document Usage Statistics</span>
                </div>
                <div className="reportTileBody">
                  <div>Uploaded documents by type</div>
                  <div>Top referenced documents</div>
                  <div>Document usage trends</div>
                </div>
                <span className="reportTileLink">Open report</span>
              </a>

              <a className="reportTile" href="#/reports/document-source?tab=attribution">
                <div className="reportTileHeader">
                  <span className="reportTileTitle">Source Attribution</span>
                </div>
                <div className="reportTileBody">
                  <div>Source-wise retrieval frequency</div>
                  <div>Top referenced sources</div>
                  <div>Share of answers per source</div>
                </div>
                <span className="reportTileLink">Open report</span>
              </a>

              <a className="reportTile" href="#/reports/system-health">
                <div className="reportTileHeader">
                  <span className="reportBadge">Report</span>
                  <span className="reportTileTitle">View System Health Status</span>
                </div>
                <div className="reportTileBody">
                  <div>Agent status overview</div>
                  <div>Index size and growth</div>
                  <div>Last processed file time</div>
                </div>
                <span className="reportTileLink">Open report</span>
              </a>
            </div>
          </div>
        </section>

        <Footer />

      </div>
    </>
  )
}

function DashboardOverviewPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="sectionHeader">
          <h2 className="sectionTitle">Built-in Reports &amp; Dashboards</h2>
          <p className="sectionSubtitle">
            Navigate into detailed dashboards to understand queries, document usage, and system health.
          </p>
        </div>

        <div className="reportsGrid">
          <a className="reportTile" href="#/reports/query-analytics">
            <div className="reportTileHeader">
              <span className="reportTileTitle">Query Analytics Dashboard</span>
            </div>
            <div className="reportTileMetrics">
              <div>
                <div className="metricLabel">Total queries</div>
                <div className="metricValue">12,458</div>
              </div>
              <div>
                <div className="metricLabel">Avg. response time</div>
                <div className="metricValue">1.2 s</div>
              </div>
            </div>
            <div className="reportTileBody">
              Track query volume, popular documents, and latency trends across time.
            </div>
            <span className="reportTileLink">View Query Analytics</span>
          </a>

          <a className="reportTile" href="#/reports/document-source?tab=usage">
            <div className="reportTileHeader">
              <span className="reportTileTitle">Document Usage Statistics</span>
            </div>
            <div className="reportTileMetrics">
              <div>
                <div className="metricLabel">Documents</div>
                <div className="metricValue">328</div>
              </div>
              <div>
                <div className="metricLabel">Modalities</div>
                <div className="metricValue">PDF · DOCX · Image · Audio</div>
              </div>
            </div>
            <div className="reportTileBody">
              Monitor which formats and sources power most answers across the system.
            </div>
            <span className="reportTileLink">View Document Report</span>
          </a>

          <a className="reportTile" href="#/reports/document-source?tab=attribution">
            <div className="reportTileHeader">
              <span className="reportTileTitle">Source Attribution</span>
            </div>
            <div className="reportTileMetrics">
              <div>
                <div className="metricLabel">Top source</div>
                <div className="metricValue">Research repo</div>
              </div>
              <div>
                <div className="metricLabel">Share of answers</div>
                <div className="metricValue">41%</div>
              </div>
            </div>
            <div className="reportTileBody">
              Review retrieval frequency by source and how evidence is attributed in answers.
            </div>
            <span className="reportTileLink">View Source Attribution</span>
          </a>

          <a className="reportTile" href="#/reports/system-health">
            <div className="reportTileHeader">
              <span className="reportTileTitle">View System Health Status</span>
            </div>
            <div className="reportTileMetrics">
              <div>
                <div className="metricLabel">Agents online</div>
                <div className="metricValue">4 / 4</div>
              </div>
              <div>
                <div className="metricLabel">FAISS vectors</div>
                <div className="metricValue">512k</div>
              </div>
            </div>
            <div className="reportTileBody">
              Keep track of agents, index size, and the freshness of processed content.
            </div>
            <span className="reportTileLink">View System Health</span>
          </a>
        </div>
      </div>
    </section>
  )
}

function QueryAnalyticsReport() {
  return (
    <section className="section">
      <div className="container">
        <div className="pageHeader">
          <div>
            <div className="pageKicker">Report</div>
            <h2 className="sectionTitle">Query Analytics Dashboard</h2>
            <p className="sectionSubtitle">
              Understand how users interact with the offline RAG system over time.
            </p>
          </div>
          <a className="backLink" href="#/dashboard">
            Back to Reports
          </a>
        </div>

        <div className="kpiRow">
          <div className="kpiCard">
            <div className="metricLabel">Total queries performed</div>
            <div className="metricValue">12,458</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Most recent 24h queries</div>
            <div className="metricValue">324</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Average response time</div>
            <div className="metricValue">1.2 s</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Peak queries per minute</div>
            <div className="metricValue">42</div>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Most queried documents</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Query count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>Research Paper – Multi-modal RAG Survey.pdf</td>
                  <td>PDF</td>
                  <td>842</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>System Architecture Overview.docx</td>
                  <td>DOCX</td>
                  <td>613</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>Compliance Guidelines v3.pdf</td>
                  <td>PDF</td>
                  <td>421</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Query timeline</h3>
            <div className="reportSectionCaption">Daily query volume (mock data)</div>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Total queries</th>
                  <th>Avg. response time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mon</td>
                  <td>1,820</td>
                  <td>1.1 s</td>
                </tr>
                <tr>
                  <td>Tue</td>
                  <td>1,644</td>
                  <td>1.3 s</td>
                </tr>
                <tr>
                  <td>Wed</td>
                  <td>1,972</td>
                  <td>1.2 s</td>
                </tr>
                <tr>
                  <td>Thu</td>
                  <td>2,104</td>
                  <td>1.2 s</td>
                </tr>
                <tr>
                  <td>Fri</td>
                  <td>1,936</td>
                  <td>1.4 s</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function DocumentSourceReport({ tab }) {
  useEffect(() => {
    if (!tab) return
    const targetId = tab === 'usage' ? 'doc-usage' : tab === 'attribution' ? 'source-attribution' : null
    if (!targetId) return
    const el = document.getElementById(targetId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [tab])

  return (
    <section className="section">
      <div className="container">
        <div className="pageHeader">
          <div>
            <div className="pageKicker">Report</div>
            <h2 className="sectionTitle">Document &amp; Source Report</h2>
            <p className="sectionSubtitle">
              Inspect how different document types and sources contribute to answers.
            </p>
          </div>
          <a className="backLink" href="#/dashboard">
            Back to Reports
          </a>
        </div>

        <div className="kpiRow">
          <div className="kpiCard">
            <div className="metricLabel">Total documents</div>
            <div className="metricValue">328</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">PDF</div>
            <div className="metricValue">172</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">DOCX</div>
            <div className="metricValue">96</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Images &amp; Audio</div>
            <div className="metricValue">60</div>
          </div>
        </div>

        <div id="doc-usage" className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Documents by type</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Count</th>
                  <th>Share of queries</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PDF</td>
                  <td>172</td>
                  <td>58%</td>
                </tr>
                <tr>
                  <td>DOCX</td>
                  <td>96</td>
                  <td>24%</td>
                </tr>
                <tr>
                  <td>Image</td>
                  <td>34</td>
                  <td>10%</td>
                </tr>
                <tr>
                  <td>Audio</td>
                  <td>26</td>
                  <td>8%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Top referenced documents</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>References in answers</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Data Privacy Policy.pdf</td>
                  <td>PDF</td>
                  <td>312</td>
                </tr>
                <tr>
                  <td>Offline Deployment Guide.docx</td>
                  <td>DOCX</td>
                  <td>201</td>
                </tr>
                <tr>
                  <td>Architecture Diagram.png</td>
                  <td>Image</td>
                  <td>148</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="source-attribution" className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Source-wise retrieval frequency</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Retrievals</th>
                  <th>Share of answers</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Research repository</td>
                  <td>1,942</td>
                  <td>41%</td>
                </tr>
                <tr>
                  <td>Enterprise knowledge base</td>
                  <td>1,312</td>
                  <td>32%</td>
                </tr>
                <tr>
                  <td>Compliance archive</td>
                  <td>824</td>
                  <td>17%</td>
                </tr>
                <tr>
                  <td>Meeting recordings</td>
                  <td>462</td>
                  <td>10%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function SystemHealthReport() {
  return (
    <section className="section">
      <div className="container">
        <div className="pageHeader">
          <div>
            <div className="pageKicker">Report</div>
            <h2 className="sectionTitle">System Health &amp; Processing Report</h2>
            <p className="sectionSubtitle">
              Monitor agent status, FAISS index size, and recent processing activity.
            </p>
          </div>
          <a className="backLink" href="#/dashboard">
            Back to Reports
          </a>
        </div>

        <div className="kpiRow">
          <div className="kpiCard">
            <div className="metricLabel">FAISS vectors</div>
            <div className="metricValue">512,384</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Index size</div>
            <div className="metricValue">1.9 GB</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Last processed file</div>
            <div className="metricValue">10 min ago</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Queued items</div>
            <div className="metricValue">3</div>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Agent status</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PDF agent</td>
                  <td>Running</td>
                  <td>Processed 3 files in last 15 min</td>
                </tr>
                <tr>
                  <td>DOCX agent</td>
                  <td>Idle</td>
                  <td>No new files in last hour</td>
                </tr>
                <tr>
                  <td>OCR agent</td>
                  <td>Running</td>
                  <td>Indexed 12 images today</td>
                </tr>
                <tr>
                  <td>Audio agent</td>
                  <td>Running</td>
                  <td>Transcribed 2 recordings today</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Index growth</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>New vectors added</th>
                  <th>Total vectors</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mon</td>
                  <td>18,240</td>
                  <td>472,180</td>
                </tr>
                <tr>
                  <td>Tue</td>
                  <td>12,604</td>
                  <td>484,784</td>
                </tr>
                <tr>
                  <td>Wed</td>
                  <td>15,320</td>
                  <td>500,104</td>
                </tr>
                <tr>
                  <td>Thu</td>
                  <td>12,280</td>
                  <td>512,384</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}

function AboutPage() {
  return (
    <section className="section">
      <div className="container aboutLayout">
        <div className="aboutMain">
          <div className="sectionHeader">
            <h2 className="sectionTitle">About the Project</h2>
            <p className="sectionSubtitle">
              The Offline Multi-modal Retrieval-Augmented Generation (RAG) System is designed to provide intelligent,
              secure, and explainable information retrieval from heterogeneous data sources.
            </p>
          </div>

          <div className="aboutBlock">
            <h3 className="aboutTitle">Objectives</h3>
            <ul className="aboutList">
              <li>Enable natural language querying across multi-modal data</li>
              <li>Reduce hallucinations using Retrieval-Augmented Generation</li>
              <li>Ensure offline, privacy-preserving AI processing</li>
              <li>Provide explainable, source-linked answers</li>
            </ul>
          </div>

          <div className="aboutBlock">
            <h3 className="aboutTitle">Technologies Used</h3>
            <div className="aboutTags">
              <span>Python</span>
              <span>FastAPI</span>
              <span>ReactJS</span>
              <span>FAISS</span>
              <span>Sentence-Transformers</span>
              <span>Tesseract OCR</span>
              <span>Whisper (Offline)</span>
              <span>Local LLMs (Mistral / LLaMA / Qwen)</span>
            </div>
          </div>
          <div className="aboutBlock">
            <h3 className="aboutTitle">Academic Information</h3>
            <ul className="aboutList">
              <li>Major Project</li>
              <li>Department of CSE (AI &amp; ML)</li>
              <li>Vasireddy Venkatadri Institute of Technology</li>
              <li>Academic Year 2025-2026</li>
            </ul>
          </div>
        </div>

        <div className="aboutSide">
          <div className="aboutBlock">
            <h3 className="aboutTitle">Project Team</h3>
            <div className="teamGrid">
              <div className="teamCard">
                <div className="teamName">Usha Kiran Paruchuri </div>
                <div className="teamRole">Role – RAG Pipeline &amp; AI Integration</div>
                <ul className="aboutList">
                  <li>Implemented semantic search and RAG pipeline</li>
                  <li>Integrated local LLMs and FAISS</li>
                </ul>
              </div>
              <div className="teamCard">
                <div className="teamName">Jakka Charishma</div>
                <div className="teamRole">Role – API &amp; System Integration</div>
                <ul className="aboutList">
                  <li>Developed FastAPI backend</li>
                  <li>Integrated services and managed configurations</li>
                </ul>
              </div>
              <div className="teamCard">
                <div className="teamName">Kakumanu Ravi Chandra</div>
                <div className="teamRole">Role – Frontend &amp; Documentation</div>
                <ul className="aboutList">
                  <li>Designed web UI and dashboards</li>
                  <li>Prepared project documentation</li>
                </ul>
              </div>
              <div className="teamCard">
                <div className="teamName">Mandadapu Prabhas</div>
                <div className="teamRole">Role – Backend &amp; Agent Development</div>
                <ul className="aboutList">
                  <li>Designed agent-based architecture</li>
                  <li>Implemented PDF, DOCX, OCR, and Audio agents</li>
                </ul>
              </div>
            </div>
          </div>


        </div>
      </div>
    </section>
  )
}

export default App
