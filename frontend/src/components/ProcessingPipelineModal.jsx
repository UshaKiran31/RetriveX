import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

export function ProcessingPipelineModal({ open, onClose, document, projectId }) {
  const [activeTab, setActiveTab] = useState('queued');
  const [metrics, setMetrics] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [chunkFilter, setChunkFilter] = useState('All');
  const [chunkQuery, setChunkQuery] = useState('');
  const [tabularData, setTabularData] = useState(null);
  const [tabularSearch, setTabularSearch] = useState('');
  const [tabularSort, setTabularSort] = useState({ key: null, dir: 'asc' });
  const dialogRef = useRef(null);

  const isTabular = metrics?.partitioning?.rows !== undefined;
  const isAudio = metrics?.partitioning?.segments !== undefined;
  const isImage = metrics?.partitioning?.width !== undefined;

  const tabs = isAudio ? [
    { id: 'queued', label: 'Queued' },
    { id: 'partitioning', label: 'Transcription' },
    { id: 'chunking', label: 'Chunking' },
    { id: 'vectorization', label: 'Vectorization' },
    { id: 'view', label: 'View Chunks' },
  ] : isImage ? [
    { id: 'queued', label: 'Queued' },
    { id: 'partitioning', label: 'OCR' },
    { id: 'vectorization', label: 'Vectorization' },
    { id: 'view', label: 'View Chunks' },
  ] : isTabular ? [
    { id: 'queued', label: 'Queued' },
    { id: 'partitioning', label: 'Data Analysis' },
    
    { id: 'view_data', label: 'View Data' }
  ] : [
    { id: 'queued', label: 'Queued' },
    { id: 'partitioning', label: 'Partitioning' },
    { id: 'chunking', label: 'Chunking' },
    { id: 'summarisation', label: 'Summarisation' },
    { id: 'vectorization', label: 'Vectorization & Storage' },
    { id: 'view', label: 'View Chunks' }
  ];

  useEffect(() => {
    if (isTabular && activeTab !== 'queued' && activeTab !== 'partitioning' && activeTab !== 'tabular_info' && activeTab !== 'view_data') {
      setActiveTab('partitioning');
    }
  }, [isTabular, activeTab]);

  const fetchTabularData = useCallback(async () => {
    if (!document?.id) return;
    try {
      const res = await api.get(`/projects/${projectId}/documents/${document.id}/tabular-data`);
      setTabularData(res.data);
    } catch (_) {}
  }, [document, projectId]);

  const fetchChunks = useCallback(async () => {
    if (!document?.id) return;
    try {
      const res = await api.get(`/projects/${projectId}/documents/${document.id}/chunks`);
      const raw = res.data.chunks || [];
      const data = raw.map(c => {
        const types = Array.from(new Set([
          ...(Array.isArray(c.types) ? c.types : (c.type ? [c.type] : [])),
          ...(c.image_url ? ['image'] : []),
          ...(c.table_html ? ['table'] : []),
          ...(c.content ? ['text'] : []),
        ].map(t => (t || '').toLowerCase()))).filter(Boolean);
        return { ...c, types, type: c.type || (types[0] || 'text') };
      });
      setChunks(data);
      setSelectedChunk(prev => (prev ? prev : (data.length > 0 ? data[0] : null)));
    } catch (error) {
      console.error('Failed to fetch chunks:', error);
    }
  }, [document, projectId]);

  const fetchMetrics = useCallback(async () => {
    if (!document?.id) return;
    try {
      const res = await api.get(`/projects/${projectId}/documents/${document.id}/metrics`);
      setMetrics(res.data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  }, [document, projectId]);

  useEffect(() => {
    if (open) {
      setTimeout(() => dialogRef.current?.classList.add('modalOpen'), 10);
      setTimeout(() => { fetchMetrics(); }, 0);
      const interval = setInterval(fetchMetrics, 2000);
      
      // Fetch chunks periodically if we are on the 'view' tab or if processing is advanced
      const chunksInterval = setInterval(() => {
        if (activeTab === 'view' || metrics?.chunking?.status === 'completed') {
          fetchChunks();
        }
      }, 3000);

      return () => {
        clearInterval(interval);
        clearInterval(chunksInterval);
      };
    } else {
      dialogRef.current?.classList.remove('modalOpen');
      setTimeout(() => {
        setMetrics(null);
        setChunks([]);
        setSelectedChunk(null);
        setTabularData(null);
        setTabularSearch('');
        setTabularSort({ key: null, dir: 'asc' });
      }, 0);
    }
  }, [open, activeTab, metrics?.chunking?.status, fetchChunks, fetchMetrics]);

  useEffect(() => {
    if (open && activeTab === 'view_data' && !tabularData) {
      fetchTabularData();
    }
  }, [open, activeTab, tabularData, fetchTabularData]);

  if (!open) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'queued': {
        const isQueuedCompleted = metrics?.queued?.status === 'completed' || metrics?.partitioning?.status;
        return (
          <div className="pipelineStepContent">
            <div className={`pipelineStatusIcon ${isQueuedCompleted ? 'completed' : 'processing'}`}>
              {isQueuedCompleted ? '✓' : <div className="spinner" />}
            </div>
            <div className="pipelineStepTitle">Queued</div>
            <div className="pipelineStepDesc">File queued for processing</div>
            <div className={`pipelineStepStatusBadge ${isQueuedCompleted ? 'success' : ''}`}>
              {isQueuedCompleted ? '✓ Step completed successfully' : 'Processing...'}
            </div>
          </div>
        );
      }

      case 'partitioning': {
        const partStatus = metrics?.partitioning?.status;
        const isPartCompleted = partStatus === 'completed';
        const partData = metrics?.partitioning || {};
        
        return (
          <div className="pipelineStepContent">
            {!isPartCompleted && (
               <div className="pipelineStatusIcon processing">
                 <div className="spinnerLarge" />
               </div>
            )}
            <div className="pipelineStepTitle">{isTabular ? 'Data Analysis' : isAudio ? 'Transcription' : isImage ? 'OCR' : 'Partitioning'}</div>
            <div className="pipelineStepDesc">
              {isTabular
                ? 'Extracting schema, column names, and row counts from tabular data'
                : isAudio
                ? 'Using ffmpeg + Whisper to transcribe audio with timestamps'
                : isImage
                ? 'Extracting text from image using pytesseract OCR'
                : 'Processing and extracting text, images, and tables'}
            </div>
            
            {isPartCompleted ? (
              <>
                {isTabular ? (
                  <div className="elementsGrid">
                    <div className="elementsHeader">📊 Tabular Metadata Extracted</div>
                    <div className="elementsRow">
                      <div className="elementBox">
                        <span className="elementLabel">Rows</span>
                        <span className="elementValue">{partData.rows}</span>
                      </div>
                      <div className="elementBox">
                        <span className="elementLabel">Columns</span>
                        <span className="elementValue">{partData.columns}</span>
                      </div>
                    </div>
                    <div className="elementsRow">
                      <div className="elementBox" style={{ flex: 1 }}>
                        <span className="elementLabel">Column Names</span>
                        <span className="elementValue" style={{ fontSize: '11px', whiteSpace: 'normal', height: 'auto', maxHeight: '60px', overflowY: 'auto' }}>
                          {(partData.column_names || []).join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : isAudio ? (
                  <div className="elementsGrid">
                    <div className="elementsHeader">🎙️ Transcription Complete</div>
                    <div className="elementsRow">
                      <div className="elementBox">
                        <span className="elementLabel">Segments</span>
                        <span className="elementValue">{partData.segments}</span>
                      </div>
                      <div className="elementBox">
                        <span className="elementLabel">Duration</span>
                        <span className="elementValue">{partData.duration_seconds}s</span>
                      </div>
                    </div>
                    <div className="elementsRow">
                      <div className="elementBox" style={{ flex: 1 }}>
                        <span className="elementLabel">Characters transcribed</span>
                        <span className="elementValue">{partData.characters?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ) : isImage ? (
                  <div className="elementsGrid">
                    <div className="elementsHeader">🖼️ OCR Complete</div>
                    <div className="elementsRow">
                      <div className="elementBox">
                        <span className="elementLabel">Width</span>
                        <span className="elementValue">{partData.width}px</span>
                      </div>
                      <div className="elementBox">
                        <span className="elementLabel">Height</span>
                        <span className="elementValue">{partData.height}px</span>
                      </div>
                    </div>
                    <div className="elementsRow">
                      <div className="elementBox" style={{ flex: 1 }}>
                        <span className="elementLabel">Characters extracted</span>
                        <span className="elementValue">{partData.characters?.toLocaleString() || 0}</span>
                      </div>
                      <div className="elementBox">
                        <span className="elementLabel">Text found</span>
                        <span className="elementValue">{partData.has_text ? '✓ Yes' : '— No'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="elementsGrid">
                    <div className="elementsHeader">📊 Elements Discovered</div>
                    <div className="elementsRow">
                      <div className="elementBox">
                        <span className="elementLabel">Text sections</span>
                        <span className="elementValue">{partData.text_sections || 0}</span>
                      </div>
                      <div className="elementBox">
                        <span className="elementLabel">Tables</span>
                        <span className="elementValue">{partData.tables || 0}</span>
                      </div>
                    </div>
                    <div className="elementsRow">
                      <div className="elementBox">
                        <span className="elementLabel">Images</span>
                        <span className="elementValue">{partData.images || 0}</span>
                      </div>
                      <div className="elementBox">
                        <span className="elementLabel">Titles/Headers</span>
                        <span className="elementValue">{partData.titles_headers || 0}</span>
                      </div>
                    </div>
                    <div className="elementsRow">
                      <div className="elementBox">
                        <span className="elementLabel">Other elements</span>
                        <span className="elementValue">{partData.other_elements || 0}</span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="pipelineStepStatusBadge success">
                  ✓ Step completed successfully
                </div>
              </>
            ) : (
              <div className="pipelineStepStatusBadge processing">
                <div className="spinnerSmall" /> {isAudio ? 'Transcribing...' : isImage ? 'Running OCR...' : 'Processing...'}
              </div>
            )}
          </div>
        );
      }

      

      case 'chunking': {
        const chunkStatus = metrics?.chunking?.status;
        const isChunkCompleted = chunkStatus === 'completed';
        const chunkData = metrics?.chunking || {};

        return (
          <div className="pipelineStepContent">
            <div className="pipelineStepTitle">Chunking</div>
            <div className="pipelineStepDesc">Creating semantic chunks</div>
            
            {isChunkCompleted ? (
              <>
                {chunkData.reason ? (
                  <div className="chunkingResultsBox">
                    
                    <div className="resultsMain">
                      <div className="resultItem">
                        <div className="resultValue highlight">✓</div>
                        <div className="resultLabel">Dataset Parsed</div>
                      </div>
                    </div>
                    <div className="chunkSummary">
                      Standard text chunking was skipped because this file contains structured tabular data.
                    </div>
                  </div>
                ) : (
                  <div className="chunkingResultsBox">
                    <div className="resultsTitle">Chunking Results</div>
                    <div className="resultsMain">
                      <div className="resultItem">
                        <div className="resultValue">{chunkData.atomic_elements || 0}</div>
                        <div className="resultLabel">atomic elements</div>
                      </div>
                      <div className="resultArrow">→</div>
                      <div className="resultItem">
                        <div className="resultValue highlight">{chunkData.chunks_created || 0}</div>
                        <div className="resultLabel">chunks created</div>
                      </div>
                    </div>
                    <div className="chunkSizeInfo">
                      <span>Average chunk size</span>
                      <span>{chunkData.average_chunk_size_chars || 0} characters</span>
                    </div>
                    <div className="chunkSummary">
                      {chunkData.atomic_elements} atomic elements have been chunked by title to produce {chunkData.chunks_created} chunks
                    </div>
                  </div>
                )}
                <div className="pipelineStepStatusBadge success">
                  ✓ Step completed successfully
                </div>
              </>
            ) : (
              <div className="pipelineStepStatusBadge processing">
                <div className="spinnerSmall" /> Processing...
              </div>
            )}
          </div>
        );
      }

      case 'summarisation': {
        const sumStatus = metrics?.summarisation?.status;
        const isSumCompleted = sumStatus === 'completed';
        const sumProcessed = metrics?.summarisation?.processed || 0;
        const sumTotal = metrics?.summarisation?.total || metrics?.chunking?.chunks_created || 0;

        return (
          <div className="pipelineStepContent">
            <div className="pipelineStepTitle">Summarisation</div>
            <div className="pipelineStepDesc">Enhancing content with AI summaries for images and tables</div>
            
            <div className="summarisationResultsBox">
              <div className="resultsTitle">🤖 AI Summarising Progress</div>
              <div className="resultsMain">
                <div className="resultItem">
                  <div className="resultValue highlight">
                    {sumProcessed} <span className="slash">/</span> {sumTotal}
                  </div>
                  <div className="resultLabel">chunks processed</div>
                </div>
              </div>
              <div className="sumSummary">
                Processing chunks and creating AI summaries for images and tables
              </div>
            </div>
            
            <div className={`pipelineStepStatusBadge ${isSumCompleted ? 'success' : 'processing'}`}>
              {isSumCompleted ? '✓ Step completed successfully' : <><div className="spinnerSmall" /> Processing...</>}
            </div>
          </div>
        );
      }

      case 'vectorization': {
        const v = metrics?.vectorization || {};
        const isCompleted = v?.status === 'completed';
        return (
          <div className="pipelineStepContent">
            <div className="pipelineStepTitle">Vectorization & Storage</div>
            <div className="pipelineStepDesc">Embedding chunks and persisting to vector store</div>
            {isCompleted ? (
              <>
                <div className="chunkingResultsBox">
                  <div className="resultsTitle">Indexing Summary</div>
                  <div className="resultsMain">
                    <div className="resultItem">
                      <div className="resultValue">{v.embedded || 0} <span className="slash">/</span> {v.total || v.embedded || 0}</div>
                      <div className="resultLabel">chunks embedded</div>
                    </div>
                    <div className="resultArrow">→</div>
                    <div className="resultItem">
                      <div className="resultValue highlight">{v.collection_count_after ?? '—'}</div>
                      <div className="resultLabel">collection size</div>
                    </div>
                  </div>
                  <div className="chunkSizeInfo">
                    <span>Model</span>
                    <span>{v.model || 'n/a'} • {v.distance_metric || 'cosine'}</span>
                  </div>
                  <div className="chunkSizeInfo">
                    <span>Storage</span>
                    <span title={v.persist_directory || ''}>
                      {v.collection_count_before ?? '—'} → {v.collection_count_after ?? '—'}
                    </span>
                  </div>
                  <div className="chunkSummary">
                    {v.duration_ms ? `${Math.round(v.duration_ms)} ms` : ''} indexed • started {v.started_at || '—'} • ended {v.ended_at || '—'}
                  </div>
                </div>
                <div className="pipelineStepStatusBadge success">
                  ✓ Step completed successfully
                </div>
              </>
            ) : (
              <div className="pipelineStepStatusBadge processing">
                <div className="spinnerSmall" /> Processing...
              </div>
            )}
          </div>
        );
      }

      case 'view': {
        const filteredChunks = chunks.filter(c => {
          const matchesQuery = !chunkQuery || c.content.toLowerCase().includes(chunkQuery.toLowerCase());
          const lc = (chunkFilter || '').toLowerCase();
          const types = c.types || (c.type ? [c.type] : []);
          const matchesFilter = lc === 'all' ||
                                (lc === 'text' && types.includes('text')) ||
                                (lc === 'image' && types.includes('image')) ||
                                (lc === 'table' && types.includes('table'));
          return matchesQuery && matchesFilter;
        });

        return (
          <div className="viewChunksContainer">
            <div className="chunksHeader">
              <div className="chunksTitleRow">
                <span className="chunksTitle">Content Chunks</span>
                <span className="chunksCount">{filteredChunks.length} of {chunks.length} chunks</span>
              </div>
              <div className="chunksToolbar">
                <div className="filterGroup">
                  {['All', 'Text', 'Image', 'Table'].map(f => (
                    <button 
                      key={f}
                      className={`filterBtn ${chunkFilter === f ? 'active' : ''}`}
                      onClick={() => setChunkFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="chunkSearchBox">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  <input 
                    className="chunkSearchInput"
                    placeholder="Search chunks..."
                    value={chunkQuery}
                    onChange={(e) => setChunkQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="chunksList">
              {filteredChunks.map(c => (
                <div 
                  key={c.id} 
                  className={`chunkListItem ${selectedChunk?.id === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedChunk(c)}
                >
                  <div className="chunkItemHeader">
                    <div className="chunkItemTags">
                       {(c.types && c.types.length ? c.types : [c.type]).map(t => (
                         <span key={t} className={`chunkTag ${t}`}>{t}</span>
                       ))}
                      {c.metadata?.page && <span className="chunkPage">Page {c.metadata.page}</span>}
                    </div>
                    <span className="chunkChars">{c.content.length} chars</span>
                  </div>
                  <div className="chunkItemPreview">{c.content}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'view_data': {
        if (!tabularData) {
          return (
            <div className="pipelineStepContent">
              <div className="pipelineStepTitle">View Data</div>
              <div className="pipelineStepStatusBadge processing"><div className="spinnerSmall" /> Loading...</div>
            </div>
          );
        }
        const cols = tabularData.columns || [];
        const allRows = tabularData.records || [];

        const filteredRows = tabularSearch
          ? allRows.filter(row => cols.some(c => String(row[c] ?? '').toLowerCase().includes(tabularSearch.toLowerCase())))
          : allRows;

        const sortedRows = tabularSort.key
          ? [...filteredRows].sort((a, b) => {
              const av = a[tabularSort.key], bv = b[tabularSort.key];
              if (av < bv) return tabularSort.dir === 'asc' ? -1 : 1;
              if (av > bv) return tabularSort.dir === 'asc' ? 1 : -1;
              return 0;
            })
          : filteredRows;

        const handleSort = (col) => {
          setTabularSort(prev => ({ key: col, dir: prev.key === col && prev.dir === 'asc' ? 'desc' : 'asc' }));
        };

        return (
          <div className="viewDataContainer">
            <div className="tabularTableControls">
              <input
                type="text"
                className="tabularSearchInput"
                placeholder="Search..."
                value={tabularSearch}
                onChange={e => setTabularSearch(e.target.value)}
              />
              <span style={{ fontSize: '11px', opacity: 0.5 }}>
                {sortedRows.length} / {allRows.length} rows · {cols.length} cols
              </span>
            </div>
            <div className="viewDataTableWrap">
              <table className="tabularTable">
                <thead>
                  <tr>
                    {cols.map(c => (
                      <th key={c} className="tabularTh" onClick={() => handleSort(c)} style={{ cursor: 'pointer', userSelect: 'none' }}>
                        {c}
                        <span className="sortIcon">
                          {tabularSort.key === c ? (tabularSort.dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, ri) => (
                    <tr key={ri} className={ri % 2 === 0 ? 'tabularRowEven' : 'tabularRowOdd'}>
                      {cols.map(c => (
                        <td key={c} className="tabularTd" title={String(row[c] ?? '')}>
                          {typeof row[c] === 'number' ? Number(row[c].toFixed(4)) : String(row[c] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="pipelineStepContent">
            <div className="pipelineStepTitle">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</div>
            <div className="pipelineStepDesc">Step integration coming soon...</div>
            <div className="pipelineStepStatusBadge">
              Pending
            </div>
          </div>
        );
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="pipelineModalCard" ref={dialogRef} onClick={(e) => e.stopPropagation()}>
        <div className="pipelineModalHeader">
          <div className="pipelineModalTitleRow">
             <div className="pipelineFileIcon">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                 <polyline points="14 2 14 8 20 8" />
               </svg>
             </div>
             <div>
               <div className="pipelineFileName">{document?.filename}</div>
               <div className="pipelineSubtitle">Processing Pipeline</div>
             </div>
          </div>
          <button className="pipelineCloseBtn" onClick={onClose}>✕</button>
        </div>

        <div className="pipelineTabs">
          {tabs.map(tab => (
            <button 
              key={tab.id}
              className={`pipelineTab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pipelineMain">
          <div className={`pipelineContent${activeTab === 'view_data' ? ' pipelineContentData' : ''}`}>
            {renderTabContent()}
          </div>
          <div className="pipelineInspector">
            <div className="inspectorTitle">Detail Inspector</div>
            {activeTab === 'view' && selectedChunk ? (
              <div className="inspectorContent">
                <div className="inspectorTagRow">
                  {(selectedChunk.types && selectedChunk.types.length ? selectedChunk.types : [selectedChunk.type]).map(t => (
                    <span key={t} className={`inspectorTag ${t}`}>{t}</span>
                  ))}
                </div>
                {selectedChunk.metadata?.timestamp && (
                  <div style={{ fontSize: '12px', color: '#9aa0a6', marginBottom: '8px' }}>
                    🕐 {selectedChunk.metadata.timestamp}
                    {selectedChunk.metadata.end != null && ` – ${Math.floor(selectedChunk.metadata.end / 60).toString().padStart(2,'0')}:${Math.floor(selectedChunk.metadata.end % 60).toString().padStart(2,'0')}`}
                  </div>
                )}
                <div className="inspectorLabel">Content</div>
                <div className="inspectorBody">{selectedChunk.content}</div>
                {selectedChunk.image_url && (
                  <div className="inspectorMedia">
                    <div className="inspectorLabel">Images (1)</div>
                    <div className="inspectorImageContainer">
                      <img src={selectedChunk.image_url} alt="Extracted content" />
                    </div>
                  </div>
                )}
                {selectedChunk.table_html && (
                  <div className="inspectorMedia">
                    <div className="inspectorLabel">Table Data</div>
                    <div className="inspectorTableContainer" dangerouslySetInnerHTML={{ __html: selectedChunk.table_html }} />
                  </div>
                )}
              </div>
            ) : (
              <div className="inspectorPlaceholder">
                <div className="inspectorIcon">👁</div>
                <div className="inspectorText">Chunks will be available when processing completes</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
