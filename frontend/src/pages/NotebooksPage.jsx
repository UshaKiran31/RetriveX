import React, { useState, useEffect } from 'react'
import api from '../api/axios'

export function NotebooksPage({ token }) {
    const [notebooks, setNotebooks] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/notebooks')
            .then(res => {
                setNotebooks(res.data)
                setLoading(false)
            })
            .catch(err => {
                console.error("Failed to load notebooks", err)
                setLoading(false)
            })
    }, [token])

    if (loading) return <div className="loading">Loading notebooks...</div>

    return (
        <section className="section">
            <div className="container">
                <div className="pageHeader">
                    <h2 className="sectionTitle">My Notebooks</h2>
                    <a href="#/notebooks/new" className="btn btnPrimary">+ New Notebook</a>
                </div>

                {notebooks.length === 0 ? (
                    <div className="emptyState">
                        <p>No notebooks yet. Create one to start analyzing your documents.</p>
                    </div>
                ) : (
                    <div className="notebooksGrid">
                        {notebooks.map(nb => (
                            <a key={nb.id} href={`#/notebooks/${nb.id}`} className="notebookCard">
                                <div className="notebookIcon">{nb.icon || '📓'}</div>
                                <div className="notebookInfo">
                                    <div className="notebookTitle">{nb.title}</div>
                                    <div className="notebookMeta">
                                        <span>{nb.created_at ? new Date(nb.created_at).toLocaleDateString() : 'Just now'}</span>
                                        <span>•</span>
                                        <span>{nb.sources || 0} sources</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </section>
    )
}
