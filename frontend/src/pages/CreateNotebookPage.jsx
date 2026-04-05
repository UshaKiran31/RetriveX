import React from 'react'
import { NotebookUploadModal } from '../components/NotebookUploadModal'
import api from '../api/axios'

export function CreateNotebookPage({ token }) {
    const handleUpload = async (files) => {
        const formData = new FormData()
        const title = files[0].name.split('.')[0] || "Untitled Notebook"
        formData.append('title', title)

        files.forEach(file => {
            formData.append('files', file)
        })

        try {
            const res = await api.post('/notebooks', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            window.location.hash = `#/notebooks/${res.data.id}`
        } catch (e) {
            console.error(e)
            const detail = e.response?.data?.detail
            if (detail && typeof detail === 'string') {
                if (detail.toLowerCase().includes('unsupported file type')) {
                    alert("Failed to upload files. Unsupported file type")
                } else if (e.response?.status === 413 || detail.toLowerCase().includes('too large')) {
                    alert("Failed to upload: File is too large (max 25MB)")
                } else {
                    alert("Error uploading files")
                }
            } else {
                alert("Error uploading files")
            }
        }
    }

    return <NotebookUploadModal onClose={() => window.location.hash = '#/notebooks'} onUpload={handleUpload} />
}
