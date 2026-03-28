import React from 'react'
import { NotebookUploadModal } from '../components/NotebookUploadModal'

export function CreateNotebookPage({ token }) {
    const handleUpload = async (files) => {
        const formData = new FormData()
        // Use the first file's name as title for now, or "Untitled"
        const title = files[0].name.split('.')[0] || "Untitled Notebook"
        formData.append('title', title)
        
        files.forEach(file => {
            formData.append('files', file)
        })

        try {
            const res = await fetch('http://localhost:8001/notebooks', {
                method: 'POST',
                headers: { 'X-Session-Id': token },
                body: formData
            })
            
            if (res.ok) {
                const data = await res.json()
                // Redirect to the new notebook chat
                window.location.hash = `#/notebooks/${data.id}`
            } else {
                alert("Failed to create notebook")
            }
        } catch (e) {
            console.error(e)
            alert("Error uploading files")
        }
    }

    return <NotebookUploadModal onClose={() => window.location.hash = '#/notebooks'} onUpload={handleUpload} />
}
