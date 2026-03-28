import React, { useState } from 'react'

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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
            throw new Error(data.detail || 'Login failed')
        }
        
        const data = await res.json()
        onLogin({ username }, data.session_id)
    } catch (err) {
        setError(err.message)
    }
  }

  return (
    <section className="section">
      <div className="container">
        <div className="loginCard">
          <div className="loginTitle">Welcome Back</div>
          <form className="loginForm" onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}
            <label className="field">
              <span className="fieldLabel">Username</span>
              <input 
                className="fieldInput" 
                type="text" 
                placeholder="Enter username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button className="btn btnPrimary btnFull" type="submit">
              Login
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
