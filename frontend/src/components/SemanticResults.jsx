import React, { useMemo, useState } from 'react'

export function SemanticResults({ data }) {
  const documents = data?.documents || []
  const byDocument = data?.by_document || {}
  const overall = data?.results || []
  const [selected, setSelected] = useState('all')

  const options = useMemo(() => {
    const base = [{ id: 'all', filename: 'All sources' }]
    return base.concat(documents.map(d => ({ id: String(d.id), filename: d.filename })))
  }, [documents])

  const displayItems = useMemo(() => {
    if (selected === 'all') return overall
    const arr = byDocument[String(selected)] || []
    return arr.slice(0, 3)
  }, [selected, overall, byDocument])

  return (
    <div className="semanticCard">
      <div className="semanticHeader">
        <div className="semanticTitle">Sources</div>
        <select className="semanticSelect" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {options.map(o => (
            <option key={o.id} value={o.id}>{o.filename}</option>
          ))}
        </select>
      </div>
      <div className="semanticList">
        {displayItems.map((r, idx) => (
          <div key={idx} className="semanticRow">
            <div className="semanticBody">
              <div className="semanticMeta">
                <span className="semanticDoc">{r.file_name}</span>
                {r.page ? <span className="semanticPage">Page {r.page}</span> : null}
              </div>
              <div className="semanticText">{r.text}</div>
              {Array.isArray(r.images_base64) && r.images_base64.length > 0 && (
                <div className="semanticMediaGrid">
                  {r.images_base64.slice(0, 3).map((img, i) => (
                    <img key={i} alt="extracted" src={`data:image/png;base64,${img}`} />
                  ))}
                </div>
              )}
              {Array.isArray(r.tables_html) && r.tables_html.length > 0 && (
                <div className="semanticTable" dangerouslySetInnerHTML={{ __html: r.tables_html[0] }} />
              )}
            </div>
            <div className="chunkBadge">{r.chunk_id != null ? r.chunk_id + 1 : idx + 1}</div>
          </div>
        ))}
        {displayItems.length === 0 && (
          <div className="semanticEmpty">No results for this source</div>
        )}
      </div>
    </div>
  )
}

