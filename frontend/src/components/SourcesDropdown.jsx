import React, { useMemo, useRef, useState, useEffect } from 'react'

export function SourcesDropdown({ sources = [] }) {
  // Dropdown open state
  const [dropdownOpen, setDropdownOpen] = useState(true)
  // Which source card is expanded
  const [expandedSourceId, setExpandedSourceId] = useState(null)
  // Selected image viewer state
  const [selectedImage, setSelectedImage] = useState(null)
  const [imageIndex, setImageIndex] = useState(0)
  const [zoom, setZoom] = useState(1)

  // Normalize data
  const normalized = useMemo(() => {
    return (sources || []).map((s, i) => ({
      id: s.id ?? i,
      file_name: s.file_name || s.filename || 'Unknown',
      page: s.page ?? s.page_number ?? null,
      chunk: s.chunk ?? s.chunk_id ?? null,
      text: s.text || '',
      images: Array.isArray(s.images) ? s.images : Array.isArray(s.images_base64) ? s.images_base64.map(b64 => `data:image/png;base64,${b64}`) : [],
      tables: Array.isArray(s.tables) ? s.tables : Array.isArray(s.tables_html) ? s.tables_html : [],
    }))
  }, [sources])

  const thumbnails = useMemo(() => {
    const imgs = []
    for (const s of normalized.slice(0, 3)) {
      if (Array.isArray(s.images)) {
        for (const img of s.images) imgs.push(img)
      }
    }
    return imgs
  }, [normalized])

  const total = normalized.length

  // Toggle a single card
  const toggleItem = (id) => {
    setExpandedSourceId(prev => (prev === id ? null : id))
  }

  // Image modal helpers
  const openImage = (startIdx) => {
    setSelectedImage(thumbnails[startIdx])
    setImageIndex(startIdx)
    setZoom(1)
    document.body.style.overflow = 'hidden'
  }
  const closeImage = () => {
    setSelectedImage(null)
    document.body.style.overflow = ''
  }
  const nextImage = () => {
    if (!thumbnails.length) return
    const idx = (imageIndex + 1) % thumbnails.length
    setImageIndex(idx)
    setSelectedImage(thumbnails[idx])
    setZoom(1)
  }
  const prevImage = () => {
    if (!thumbnails.length) return
    const idx = (imageIndex - 1 + thumbnails.length) % thumbnails.length
    setImageIndex(idx)
    setSelectedImage(thumbnails[idx])
    setZoom(1)
  }

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeImage()
      if (e.key === 'ArrowRight') nextImage()
      if (e.key === 'ArrowLeft') prevImage()
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(3, z + 0.2))
      if (e.key === '-') setZoom(z => Math.max(0.4, z - 0.2))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [imageIndex, thumbnails.length])

  return (
    <div className="srcDrop">
      <button className="srcDropHeader" onClick={() => setDropdownOpen(o => !o)}>
        <div className="srcDropTitle">Sources ({total})</div>
        <svg
          className={`srcDropArrow ${dropdownOpen ? 'open' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        className={`srcDropBody ${dropdownOpen ? 'open' : ''}`}
        style={{ maxHeight: dropdownOpen ? 600 : 0 }}
      >
        {normalized.map((s) => (
          <div key={s.id} className="srcItem">
            <div className="srcItemHeader" onClick={() => toggleItem(s.id)}>
              <div className="srcItemLeft">
                <div className="srcDocIcon">📄</div>
                <div className="srcFilename" title={s.file_name}>{s.file_name}</div>
                <div className="srcMeta">
                  {s.page != null ? <>Page {s.page}</> : null}
                  {s.page != null && s.chunk != null ? ' • ' : null}
                  {s.chunk != null ? <>Chunk {s.chunk}</> : null}
                </div>
              </div>
              <div className="srcChevron">
                <svg
                  className={`srcDropArrow ${expandedSourceId === s.id ? 'open' : ''}`}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </div>
            </div>
            <div
              className={`srcItemContent ${expandedSourceId === s.id ? 'open' : ''}`}
              style={{ maxHeight: expandedSourceId === s.id ? 320 : 0 }}
            >
              <div className="srcChunkTitle">Chunk Content</div>
              <div className="srcChunkBox">{s.text}</div>
            </div>
          </div>
        ))}

        {thumbnails.length > 0 && (
          <div className="thumbGrid">
            {thumbnails.map((img, i) => (
              <button
                key={`${img}-${i}`}
                className="thumb"
                title="Open image"
                onClick={() => openImage(i)}
              >
                <img src={img} alt="thumbnail" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="imgModalOverlay" onClick={closeImage}>
          <div className="imgModal" onClick={(e) => e.stopPropagation()}>
            <img
              src={selectedImage}
              alt="preview"
              style={{ transform: `scale(${zoom})` }}
            />
            <div className="imgControls">
              <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} title="Zoom out">−</button>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} title="Zoom in">+</button>
            </div>
            <button className="imgNav left" onClick={prevImage} title="Previous">‹</button>
            <button className="imgNav right" onClick={nextImage} title="Next">›</button>
            <button className="imgClose" onClick={closeImage} title="Close">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

