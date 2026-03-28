import React, { useState } from 'react'

export function SignupPage({ onLogin }) {
    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
  
    const validatePassword = (pwd) => {
        if (pwd.length < 8) return "Password must be at least 8 characters long";
        if (!/[A-Z]/.test(pwd)) return "Password must contain at least one uppercase letter";
        if (!/[a-z]/.test(pwd)) return "Password must contain at least one lowercase letter";
        if (!/[0-9]/.test(pwd)) return "Password must contain at least one number";
        if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) return "Password must contain at least one special character";
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        const pwdError = validatePassword(password);
        if (pwdError) {
            setError(pwdError);
            return;
        }

        try {
            const res = await fetch('http://localhost:8001/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            })

            if (!res.ok) {
                const data = await res.json()
                let errorMsg = 'Signup failed'
                if (data.detail) {
                    if (typeof data.detail === 'string') {
                        errorMsg = data.detail
                    } else {
                        errorMsg = JSON.stringify(data.detail)
                    }
                }
                throw new Error(errorMsg)
            }
            
            // Auto login after signup
            const loginRes = await fetch('http://localhost:8001/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            })
            
            if (loginRes.ok) {
                const data = await loginRes.json()
                onLogin({ username }, data.session_id)
            } else {
                window.location.hash = '#/login'
            }

        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <section className="section">
            <div className="container">
                <div className="loginCard">
                    <div className="loginTitle">Create Account</div>
                    <form className="loginForm" onSubmit={handleSubmit}>
                        {error && <div className="error-message">{error}</div>}
                        <label className="field">
                            <span className="fieldLabel">Username</span>
                            <input 
                                className="fieldInput" 
                                type="text" 
                                placeholder="Choose a username" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </label>
                        <label className="field">
                            <span className="fieldLabel">Email</span>
                            <input 
                                className="fieldInput" 
                                type="email" 
                                placeholder="Enter your email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </label>
                        <label className="field">
                            <span className="fieldLabel">Password</span>
                            <input 
                                className="fieldInput" 
                                type="password" 
                                placeholder="Create a strong password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <small className="fieldHint">
                                Must be 8+ chars, include uppercase, lowercase, number & special char.
                            </small>
                        </label>
                        <label className="field">
                            <span className="fieldLabel">Confirm Password</span>
                            <input 
                                className="fieldInput" 
                                type="password" 
                                placeholder="Repeat password" 
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                        </label>
                        <button className="btn btnPrimary btnFull" type="submit">
                            Sign Up
                        </button>
                    </form>
                    
                    <div className="authBottom">
                        Already have an account? <a href="#/login" className="authLink">Login</a>
                    </div>
                </div>
            </div>
        </section>
    )
}
