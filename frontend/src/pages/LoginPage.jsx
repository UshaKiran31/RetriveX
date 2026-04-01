import React, { useState } from 'react'
import api from '../api/axios'

export function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    try {
      const res = await api.post('/login', { username, password })
      onLogin({ username }, res.data.session_id)
    } catch (err) {
      setError(err.response?.data?.detail || err.message)
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
