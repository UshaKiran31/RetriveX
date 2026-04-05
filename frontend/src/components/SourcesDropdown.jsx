import React, { useMemo, useRef, useState, useEffect } from 'react'

export function SourcesDropdown({ sources = [] }) {
  // Dropdown open state
  const [dropdownOpen, setDropdownOpen] = useState(true)
  // Which source card is expanded
  const [expandedSourceId, setExpandedSourceId] = useState(null)
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemIndex, setItemIndex] = useState(0)
  const [zoom, setZoom] = useState(1)

  // Normalize data
  const normalized = useMemo(() => {
    return (sources || []).map((s, i) => ({
      id: s.id ?? i,
      file_name: s.file_name || s.filename || 'Unknown',
      page: s.page ?? s.page_number ?? null,
      chunk: s.chunk ?? s.chunk_id ?? null,
      score: s.score ?? null,
      timestamp: s.timestamp ?? null,
      text: s.text || '',
      images: Array.isArray(s.images) ? s.images : Array.isArray(s.images_base64) ? s.images_base64.map(b64 => `data:image/png;base64,${b64}`) : [],
      tables: Array.isArray(s.tables) ? s.tables : Array.isArray(s.tables_html) ? s.tables_html : [],
    }))
  }, [sources])

  const thumbnails = useMemo(() => {
    const items = []
    for (const s of normalized.slice(0, 3)) {
      if (Array.isArray(s.images)) {
        for (const img of s.images) items.push({ type: 'image', data: img })
      }
      if (Array.isArray(s.tables)) {
        for (const table of s.tables) items.push({ type: 'table', data: table, source: s.file_name })
      }
    }
    return items
  }, [normalized])

  const total = normalized.length

  // Toggle a single card
  const toggleItem = (id) => {
    setExpandedSourceId(prev => (prev === id ? null : id))
  }

  // Modal helpers
  const openItem = (startIdx) => {
    setSelectedItem(thumbnails[startIdx])
    setItemIndex(startIdx)
    setZoom(1)
    document.body.style.overflow = 'hidden'
  }
  const closeItem = () => {
    setSelectedItem(null)
    document.body.style.overflow = ''
  }
  const nextItem = () => {
    if (!thumbnails.length) return
    const idx = (itemIndex + 1) % thumbnails.length
    setItemIndex(idx)
    setSelectedItem(thumbnails[idx])
    setZoom(1)
  }
  const prevItem = () => {
    if (!thumbnails.length) return
    const idx = (itemIndex - 1 + thumbnails.length) % thumbnails.length
    setItemIndex(idx)
    setSelectedItem(thumbnails[idx])
    setZoom(1)
  }

  // Close on ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') closeItem()
      if (e.key === 'ArrowRight') nextItem()
      if (e.key === 'ArrowLeft') prevItem()
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(3, z + 0.2))
      if (e.key === '-') setZoom(z => Math.max(0.4, z - 0.2))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [itemIndex, thumbnails.length])

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
                  {s.timestamp != null ? <> 🕐 {s.timestamp}</> : null}
                </div>
                {s.score != null && (
                  <div className="srcScore" title="Cosine similarity score">
                    {Math.round(s.score * 100)}%
                  </div>
                )}
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
              style={{ maxHeight: expandedSourceId === s.id ? 1000 : 0 }}
            >
              <div className="srcChunkTitle">Chunk Content</div>
              <div className="srcChunkBox">{s.text}</div>
              {s.tables && s.tables.length > 0 && (
                <div className="srcTables">
                  <div className="srcChunkTitle">Tables</div>
                  {s.tables.map((html, i) => (
                    <div key={i} className="srcTableWrap" dangerouslySetInnerHTML={{ __html: html }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {thumbnails.length > 0 && (
          <div className="thumbGrid">
            {thumbnails.map((item, i) => (
              <button
                key={`${item.type}-${i}`}
                className={`thumb ${item.type === 'table' ? 'tableThumb' : ''}`}
                title={`Open ${item.type}`}
                onClick={() => openItem(i)}
              >
                {item.type === 'image' ? (
                  <img src={item.data} alt="thumbnail" />
                ) : (
                  <div className="tableThumbnail">
                    <div className="tableIcon">📊</div>
                    <div className="tableText">Table</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedItem && (
        <div className="imgModalOverlay" onClick={closeItem}>
          <div className={`imgModal ${selectedItem.type === 'table' ? 'tableModal' : ''}`} onClick={(e) => e.stopPropagation()}>
            {selectedItem.type === 'image' ? (
              <img
                src={selectedItem.data}
                alt="preview"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : (
              <div className="modalTableContainer">
                <div className="modalTableScroll">
                   <div className="modalTableSource">📊 Source: {selectedItem.source}</div>
                   <div className="modalTableContent" dangerouslySetInnerHTML={{ __html: selectedItem.data }} />
                </div>
              </div>
            )}
            <div className="imgControls">
              <button onClick={() => setZoom(z => Math.max(0.4, z - 0.2))} title="Zoom out">−</button>
              <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} title="Zoom in">+</button>
            </div>
            <button className="imgNav left" onClick={prevItem} title="Previous">‹</button>
            <button className="imgNav right" onClick={nextItem} title="Next">›</button>
            <button className="imgClose" onClick={closeItem} title="Close">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

