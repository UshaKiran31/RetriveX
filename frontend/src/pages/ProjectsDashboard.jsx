import React, { useEffect, useMemo, useState } from 'react'
import { ProjectCard } from '../components/ProjectCard'
import { ProjectModal } from '../components/ProjectModal'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

function formatDate(date) {
  if (!date) return 'Just now'
  const d = new Date(date)
  if (isNaN(d.getTime())) return 'Just now'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function ProjectsDashboard() {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [projects, setProjects] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const res = await api.get('/projects')
      setProjects(res.data.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const cards = useMemo(() => projects.map(p => ({
    id: p.id,
    title: p.name || 'Untitled',
    desc: p.description || '',
    date: formatDate(p.createdAt || p.created_at || Date.now())
  })), [projects])

  const openProject = (id) => {
    navigate(`/projects/${id}`)
  }

  const handleModalSubmit = async ({ name, description }) => {
    try {
      if (editingProject) {
        // Update existing project
        const res = await api.put(`/projects/${editingProject.id}`, { name, description })
        const updated = res.data
        setProjects(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p))
      } else {
        // Create new project
        const res = await api.post('/projects', { name, description })
        const newProject = res.data
        setProjects(prev => [newProject, ...prev])
        setTimeout(() => openProject(newProject.id), 100)
      }
      setModalOpen(false)
      setEditingProject(null)
    } catch (error) {
      console.error('Failed to save project:', error)
    }
  }

  const handleDeleteProject = async (id) => {
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }
    try {
      await api.delete(`/projects/${id}`)
      setProjects(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('Failed to delete project. Please try again.')
    }
  }

  const handleEditProject = (project) => {
    setEditingProject(project)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingProject(null)
  }

  const filtered = cards.filter(c =>
    (c.title && c.title.toLowerCase().includes(query.toLowerCase())) ||
    (c.desc && c.desc.toLowerCase().includes(query.toLowerCase()))
  )

  return (
    <section className="dashMain">
      <div className="dashHeader">
        <div className="dashTitleRow">
          <div className="dashTitle">Projects</div>
          <div className="dashCount">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btnSecondary" onClick={() => setModalOpen(true)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create New
        </button>
      </div>

      <div className="dashToolbar">
        <input
          className="dashSearch"
          placeholder="Search projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="dashHeaderActions">
          <button className="iconBtn gridToggle" title="Grid view">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading projects...</div>
      ) : (
        <div className="projectsGrid">
          <ProjectCard isCreate onClick={() => setModalOpen(true)} />
          {filtered.map((c) => (
            <ProjectCard
              key={c.id}
              title={c.title}
              description={c.desc}
              date={c.date}
              onClick={() => openProject(c.id)}
              onEdit={() => handleEditProject(projects.find(p => p.id === c.id))}
              onDelete={() => handleDeleteProject(c.id)}
            />
          ))}
        </div>
      )}

      <ProjectModal
        open={modalOpen}
        onClose={handleCloseModal}
        onSubmit={handleModalSubmit}
        initialData={editingProject}
      />
    </section>
  )
}
