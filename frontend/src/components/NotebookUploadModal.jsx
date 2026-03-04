import React, { useState } from 'react'

export function NotebookUploadModal({ onClose, onUpload }) {
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
                        style={{display: 'none'}} 
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
