import React, { useMemo, useState, useEffect } from 'react'
import { ProcessingPipelineModal } from './ProcessingPipelineModal'
import api from '../api/axios'

export function KnowledgeBasePanel({ projectId, documents, setDocuments, collapsed, onToggleCollapse }) {
  const [activeTab, setActiveTab] = useState('documents')
  const [dragging, setDragging] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [pipelineOpen, setPipelineOpen] = useState(false)

  const processingCount = useMemo(() => documents.filter(i => i.status?.toLowerCase() === 'processing').length, [documents])

  useEffect(() => {
    let interval;
    if (processingCount > 0) {
      interval = setInterval(async () => {
        try {
          const res = await api.get(`/projects/${projectId}/documents`)
          setDocuments(res.data || [])
        } catch (error) {
          console.error('Polling error:', error)
        }
      }, 3000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [processingCount, projectId, setDocuments])

  const onDrop = async (e) => {
    e.preventDefault()
    setDragging(false)
    setUploadError(null)

    const files = Array.from(e.dataTransfer?.files || e.target?.files || [])
    if (files.length === 0) return

    const tempFiles = files.map((f, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      filename: f.name,
      size: `${Math.ceil(f.size / 1024)} KB`,
      status: 'Processing'
    }))

    setDocuments(prev => [...tempFiles, ...prev])

    try {
      await Promise.all(files.map(f => {
        const data = new FormData()
        data.append('file', f)
        return api.post(`/projects/${projectId}/upload`, data)
      }))
      const res = await api.get(`/projects/${projectId}/documents`)
      setDocuments(res.data || [])
    } catch (error) {
      console.error('Upload failed:', error)
      setUploadError('Failed to upload files.')
      setDocuments(prev => prev.filter(doc => !doc.id?.toString().startsWith('temp-')))
    }
  }

  const handleDocClick = (doc) => {
    if (doc.id?.toString().startsWith('temp-')) return;
    setSelectedDoc(doc);
    setPipelineOpen(true);
  }

  return (
    <div className={`kbPanel ${collapsed ? 'kbCollapsed' : ''}`}>
      <div className="kbHeader">
        <div className="kbHeaderLeft">
          <button className="iconBtn kbCollapseBtn" onClick={onToggleCollapse} aria-label="Collapse">
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
          {!collapsed && (
            <div className="kbTabs">
              <button className={`kbTab ${activeTab === 'documents' ? 'kbTabActive' : ''}`} onClick={() => setActiveTab('documents')}>Documents</button>
              <button className={`kbTab ${activeTab === 'settings' ? 'kbTabActive' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
            </div>
          )}
        </div>
      </div>
      {!collapsed && activeTab === 'documents' && (
        <div className="kbBody">
          <label
            className={`dropZone ${dragging ? 'dropZoneDragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
          >
            <div className="dropIcon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a4 4 0 0 1-4 4H7a4 4 0 1 1 0-8 5 5 0 0 1 9.9-1.5" />
                <path d="M12 12v9" />
                <path d="M16 16l-4-4-4 4" />
              </svg>
            </div>
            <div>Drag & Drop or Click to upload files</div>
            <input type="file" multiple onChange={onDrop} style={{ display: 'none' }} />
          </label>

          {uploadError && <div className="error-message" style={{ color: 'red', marginTop: 10 }}>{uploadError}</div>}

          <div className="fileList">
            {documents.map((i) => (
              <div 
                key={i.id} 
                className={`fileItem ${!i.id?.toString().startsWith('temp-') ? 'clickable' : ''}`}
                onClick={() => handleDocClick(i)}
              >
                <div className="fileInfo">
                  <div className="fileName">{i.name || i.filename}</div>
                  <div className="fileMeta">{i.size || 'Unknown size'}</div>
                </div>
                <div className={`fileStatus ${i.status?.toLowerCase() === 'processing' ? 'fileStatusProcessing' : ''}`}>
                  {i.status || 'Completed'}
                  {i.status?.toLowerCase() === 'processing' && <span className="spinner" />}
                </div>
              </div>
            ))}
          </div>
          {processingCount > 0 && (
            <div className="processingHint">{processingCount} item(s) processing…</div>
          )}
        </div>
      )}
      {!collapsed && activeTab === 'settings' && (
        <SettingsPanel projectId={projectId} />
      )}

      <ProcessingPipelineModal 
        open={pipelineOpen}
        onClose={() => setPipelineOpen(false)}
        document={selectedDoc}
        projectId={projectId}
      />
    </div>
  )
}

function SettingsPanel({ projectId }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({ model_name: 'llama3.2:3b', embedding_model: 'nomic-embed-text', top_k: 3 })
  const [proj, setProj] = useState({ name: '', description: '' })

  useEffect(() => {
    const run = async () => {
      try {
        const [s, p] = await Promise.all([
          api.get(`/projects/${projectId}/settings`),
          api.get(`/projects/${projectId}`)
        ])
        setSettings(s.data || settings)
        setProj({ name: p.data.name || '', description: p.data.description || '' })
      } catch (e) {
        console.error('Load settings failed', e)
      } finally {
        setLoading(false)
      }
    }
    setLoading(true)
    run()
  }, [projectId])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await api.put(`/projects/${projectId}/settings`, {
        model_name: settings.model_name,
        embedding_model: settings.embedding_model,
        top_k: settings.top_k
      })
    } catch (e) {
      console.error('Save settings failed', e)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const saveProject = async () => {
    setSaving(true)
    try {
      await api.put(`/projects/${projectId}`, { name: proj.name, description: proj.description })
      alert('Project updated')
    } catch (e) {
      console.error('Update project failed', e)
      alert('Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const doExport = async () => {
    try {
      const res = await api.get(`/projects/${projectId}/export`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/zip' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project_${projectId}_export.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed', e)
      alert('Export failed')
    }
  }

  return (
    <div className="kbBody" style={{ display: 'grid', gap: 12 }}>
      <div className="settingsBlock">
        <div className="settingsTitle">How it works</div>
        <div className="settingsDesc">
          Retrieval uses vector similarity over your indexed chunks. The model generates answers grounded in the retrieved context.
        </div>
      </div>

      <div className="settingsBlock">
        <div className="settingsTitle">LLM</div>
        <label className="field">
          <span className="fieldLabel">Response model</span>
          <select
            className="fieldInput"
            value={settings.model_name}
            onChange={(e) => setSettings({ ...settings, model_name: e.target.value })}
          >
            <option value="llama3.2:3b">llama3.2:3b (Ollama)</option>
          </select>
        </label>
      </div>

      <div className="settingsBlock">
        <div className="settingsTitle">Embeddings</div>
        <label className="field">
          <span className="fieldLabel">Embedding model</span>
          <select
            className="fieldInput"
            value={settings.embedding_model}
            onChange={(e) => setSettings({ ...settings, embedding_model: e.target.value })}
          >
            <option value="nomic-embed-text">nomic-embed-text (Ollama)</option>
          </select>
        </label>
        <div className="fieldHint">Changing embedding model requires re-indexing to take full effect.</div>
      </div>

      <div className="settingsBlock">
        <div className="settingsTitle">Retrieval</div>
        <label className="field">
          <span className="fieldLabel">Top‑K results</span>
          <input
            type="number"
            min={3}
            max={10}
            className="fieldInput"
            value={settings.top_k}
            onChange={(e) => setSettings({ ...settings, top_k: Math.max(3, Math.min(10, parseInt(e.target.value || '3', 10))) })}
          />
        </label>
      </div>

      <div className="settingsBlock">
        <div className="settingsTitle">Project</div>
        <label className="field">
          <span className="fieldLabel">Name</span>
          <input
            className="fieldInput"
            type="text"
            value={proj.name}
            onChange={(e) => setProj({ ...proj, name: e.target.value })}
          />
        </label>
        <label className="field">
          <span className="fieldLabel">Description</span>
          <input
            className="fieldInput"
            type="text"
            value={proj.description}
            onChange={(e) => setProj({ ...proj, description: e.target.value })}
          />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn btnPrimary" onClick={saveSettings} disabled={saving || loading}>Save Settings</button>
        <button className="btn" onClick={saveProject} disabled={saving || loading}>Update Project</button>
        <button className="btn" onClick={doExport} disabled={loading}>Export Bundle</button>
      </div>
    </div>
  )
}
