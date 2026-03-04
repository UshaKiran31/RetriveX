import React, { useEffect, useMemo, useState } from 'react'
import { SidebarConversations } from '../components/SidebarConversations'
import { ChatWindow } from '../components/ChatWindow'
import { KnowledgeBasePanel } from '../components/KnowledgeBasePanel'
import { ChatTitleModal } from '../components/ChatTitleModal'
import api from '../api/axios'

export function ProjectWorkspace({ id }) {
  const [collapsedLeft, setCollapsedLeft] = useState(false)
  const [collapsedRight, setCollapsedRight] = useState(false)
  const [activeChat, setActiveChat] = useState(null)
  const [chats, setChats] = useState([])
  const [documents, setDocuments] = useState([])
  const [project, setProject] = useState(null)
  
  const [chatModalOpen, setChatModalOpen] = useState(false)
  const [editingChat, setEditingChat] = useState(null)

  useEffect(() => {
    if (id) {
      fetchProject()
      fetchConversations()
      fetchDocuments()
    }
  }, [id])

  const fetchProject = async () => {
    try {
      const res = await api.get(`/projects/${id}`)
      setProject(res.data)
    } catch (error) {
      console.error('Failed to fetch project:', error)
    }
  }

  const fetchConversations = async () => {
    try {
      const res = await api.get(`/projects/${id}/conversations`)
      setChats(res.data.conversations || [])
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    }
  }

  const fetchDocuments = async () => {
    try {
      const res = await api.get(`/projects/${id}/documents`)
      setDocuments(res.data || [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const newChat = async () => {
    try {
      const res = await api.post(`/projects/${id}/conversations`)
      const chat = res.data
      setChats(prev => [chat, ...prev])
      setActiveChat(chat.id)
    } catch (error) {
      console.error('Failed to create conversation', error)
      const fallbackId = Math.floor(3400 + Math.random() * 500)
      setChats(prev => [{ id: fallbackId, title: `Chat #${fallbackId}` }, ...prev])
      setActiveChat(fallbackId)
    }
  }

  const editChat = (chat) => {
    setEditingChat(chat)
    setChatModalOpen(true)
  }

  const handleChatTitleUpdate = async (newTitle) => {
    if (!editingChat || !newTitle || newTitle.trim() === editingChat.title) {
      setChatModalOpen(false)
      setEditingChat(null)
      return
    }

    try {
      const res = await api.put(`/projects/${id}/conversations/${editingChat.id}`, { 
        project_id: parseInt(id),
        title: newTitle.trim() 
      })
      const updated = res.data
      setChats(prev => prev.map(c => c.id === updated.id ? { ...c, title: updated.title } : c))
      setChatModalOpen(false)
      setEditingChat(null)
    } catch (error) {
      console.error('Failed to update conversation title:', error)
      alert('Failed to update title.')
    }
  }

  const deleteChat = async (chatId) => {
    if (!window.confirm('Are you sure you want to delete this conversation?')) return

    try {
      await api.delete(`/projects/${id}/conversations/${chatId}`)
      setChats(prev => prev.filter(c => c.id !== chatId))
      if (activeChat === chatId) {
        setActiveChat(null)
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      alert('Failed to delete conversation.')
    }
  }

  const activeChatData = useMemo(() => chats.find(c => c.id === activeChat), [chats, activeChat])

  const projectTitle = project?.name || `Project #${id}`
  const projectSubtitle = project?.description || "Gen-related docs"

  const wsClass = [
    'workspace',
    collapsedLeft ? 'leftCollapsed' : '',
    collapsedRight ? 'rightCollapsed' : '',
    collapsedLeft && collapsedRight ? 'bothCollapsed' : ''
  ].join(' ').trim()

  return (
    <div className={wsClass}>
      <SidebarConversations
        projectTitle={projectTitle}
        projectSubtitle={projectSubtitle}
        chats={chats}
        activeId={activeChat}
        onSelect={setActiveChat}
        onNewChat={newChat}
        onEditChat={editChat}
        onDeleteChat={deleteChat}
        collapsed={collapsedLeft}
        onToggleCollapse={() => setCollapsedLeft(v => !v)}
      />
      <div className="workspaceCenter">
        {activeChat ? (
          <ChatWindow
            projectId={id}
            chatId={activeChat}
            title={activeChatData?.title || `Chat #${activeChat}`}
            subtitle={projectTitle}
            onNewChat={newChat}
            documents={documents}
          />
        ) : (
          <>
            <div className="projPageHeader">
              <div>
                <div className="projTitle">{projectTitle}</div>
                <div className="projSubtitle">{projectSubtitle}</div>
              </div>
              
            </div>
            <div className="sectionCaption">Conversations</div>
            <div className="emptyState">
              <div className="emptyIcon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
              </div>
              <div className="emptyTitle">No conversations yet</div>
              <div className="emptyText">Start your first conversation in this project to analyze documents and get insights from your AI assistant.</div>
              <button className="btn btnSecondary firstConvBtn" onClick={newChat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Start first conversation
              </button>
            </div>
          </>
        )}
      </div>
      <KnowledgeBasePanel
        projectId={id}
        documents={documents}
        setDocuments={setDocuments}
        collapsed={collapsedRight}
        onToggleCollapse={() => setCollapsedRight(v => !v)}
      />

      <ChatTitleModal
        open={chatModalOpen}
        onClose={() => { setChatModalOpen(false); setEditingChat(null); }}
        onSubmit={handleChatTitleUpdate}
        initialTitle={editingChat?.title}
      />
    </div>
  )
}
