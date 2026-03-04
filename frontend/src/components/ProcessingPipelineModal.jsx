import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';

export function ProcessingPipelineModal({ open, onClose, document, projectId }) {
  const [activeTab, setActiveTab] = useState('queued');
  const [metrics, setMetrics] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [selectedChunk, setSelectedChunk] = useState(null);
  const [chunkFilter, setChunkFilter] = useState('All');
  const [chunkQuery, setChunkQuery] = useState('');
  const dialogRef = useRef(null);

  const tabs = [
    { id: 'queued', label: 'Queued' },
    { id: 'partitioning', label: 'Partitioning' },
    { id: 'chunking', label: 'Chunking' },
    { id: 'summarisation', label: 'Summarisation' },
    { id: 'vectorization', label: 'Vectorization & Storage' },
    { id: 'view', label: 'View Chunks' }
  ];

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
      }, 0);
    }
  }, [open, activeTab, metrics?.chunking?.status, fetchChunks, fetchMetrics]);

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
            <div className="pipelineStepTitle">Partitioning</div>
            <div className="pipelineStepDesc">Processing and extracting text, images, and tables</div>
            
            {isPartCompleted ? (
              <>
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
          <div className="pipelineContent">
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
