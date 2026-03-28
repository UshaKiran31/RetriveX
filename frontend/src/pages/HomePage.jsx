import React, { useEffect } from 'react'

export function HomePage({ initialSection }) {
  useEffect(() => {
    if (!initialSection) return
    const targetId = ['about', 'features', 'login'].includes(initialSection) ? initialSection : null
    if (!targetId) return
    const el = document.getElementById(targetId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [initialSection])

  return (
    <>
      <section id="home" className="section hero">
        <div className="container heroInner">
          <div className="heroTopline">Fully offline • Privacy-preserving • Multi-modal</div>
          <h1 className="heroTitle">
            Offline <span className="gradientText">Multi-modal</span> Knowledge Retrieval System
          </h1>
          <p className="heroSubtitle">
            Query PDFs, documents, images, and audio files using natural language — fully offline and privacy-preserving.
          </p>

          <div className="heroActions">
            <a className="btn btnPrimary" href="#/dashboard">
              Get Started
            </a>
            <a className="btn btnSecondary" href="#/features">
              View Features
            </a>
          </div>
        </div>
      </section>

      <section id="about" className="section sectionAlt">
        <div className="container">
          <div className="sectionHeader">
            <h2 className="sectionTitle">Why Traditional Search Falls Short</h2>
          </div>

          <div className="twoCol">
            <div className="panel">
              <div className="panelTitle">Problem</div>
              <ul className="list">
                <li>Keyword-based search lacks context</li>
                <li>Cannot query across multiple file formats</li>
                <li>Cloud-based AI risks data privacy</li>
              </ul>
            </div>

            <div className="panel panelHighlight">
              <div className="panelTitle">Solution</div>
              <ul className="list">
                <li>Semantic search across multiple data types</li>
                <li>Retrieval-Augmented Generation (RAG)</li>
                <li>Fully offline local AI processing</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="section">
        <div className="container">
          <div className="sectionHeader">
            <h2 className="sectionTitle">Core Capabilities</h2>
          </div>

          <div className="cardGrid">
            <div className="card">
              <div className="cardIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="iconSvg">
                  <path
                    d="M4 6.5A2.5 2.5 0 0 1 6.5 4h3A2.5 2.5 0 0 1 12 6.5v11A2.5 2.5 0 0 0 9.5 15h-3A2.5 2.5 0 0 0 4 17.5v-11Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M20 6.5A2.5 2.5 0 0 0 17.5 4h-3A2.5 2.5 0 0 0 12 6.5v11a2.5 2.5 0 0 1 2.5-2.5h3A2.5 2.5 0 0 1 20 17.5v-11Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div className="cardTitle">Multi-modal Processing</div>
              <ul className="cardList">
                <li>Supports PDF, DOCX, Images, and Audio</li>
                <li>Automatic modality detection</li>
              </ul>
            </div>

            <div className="card">
              <div className="cardIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="iconSvg">
                  <path
                    d="M10.5 7.5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M14.2 14.2 19 19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="cardTitle">Semantic Retrieval</div>
              <ul className="cardList">
                <li>Vector-based similarity search</li>
                <li>FAISS-powered indexing</li>
              </ul>
            </div>

            <div className="card">
              <div className="cardIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="iconSvg">
                  <path
                    d="M7.5 9.5a3.5 3.5 0 0 1 6.9-1.1A3.2 3.2 0 0 1 18.7 11c0 1.9-1.6 3.5-3.5 3.5H9.2C7.4 14.5 6 13 6 11.2c0-1.5 1-2.9 2.5-3.2Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9 18h6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="cardTitle">Context-Aware Answering</div>
              <ul className="cardList">
                <li>RAG-based response generation</li>
                <li>Grounded in retrieved evidence</li>
              </ul>
            </div>

            <div className="card">
              <div className="cardIcon" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="iconSvg">
                  <path
                    d="M12 3a6 6 0 0 0-6 6v3.2c0 1.1-.6 2.2-1.6 2.8-.3.2-.4.6-.2.9.7 1 1.8 1.6 3 1.6h9.6c1.2 0 2.3-.6 3-1.6.2-.3.1-.7-.2-.9-1-.6-1.6-1.7-1.6-2.8V9a6 6 0 0 0-6-6Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 20a2.5 2.5 0 0 0 5 0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="cardTitle">Offline & Secure</div>
              <ul className="cardList">
                <li>No cloud dependency</li>
                <li>Complete data privacy</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="section sectionAlt">
        <div className="container">
          <div className="sectionHeader">
            <h2 className="sectionTitle">How the System Works</h2>
          </div>

          <div className="workflow">
            <div className="workflowStep">
              <div className="stepNumber">1</div>
              <div className="stepText">Upload multi-modal files</div>
            </div>
            <div className="workflowArrow" aria-hidden="true">
              <span />
            </div>
            <div className="workflowStep">
              <div className="stepNumber">2</div>
              <div className="stepText">Content extraction using agents</div>
            </div>
            <div className="workflowArrow" aria-hidden="true">
              <span />
            </div>
            <div className="workflowStep">
              <div className="stepNumber">3</div>
              <div className="stepText">Embedding generation and indexing</div>
            </div>
            <div className="workflowArrow" aria-hidden="true">
              <span />
            </div>
            <div className="workflowStep">
              <div className="stepNumber">4</div>
              <div className="stepText">Natural language query</div>
            </div>
            <div className="workflowArrow" aria-hidden="true">
              <span />
            </div>
            <div className="workflowStep">
              <div className="stepNumber">5</div>
              <div className="stepText">Evidence-backed response</div>
            </div>
          </div>
        </div>
      </section>

      <section id="use-cases" className="section">
        <div className="container">
          <div className="sectionHeader">
            <h2 className="sectionTitle">Who Can Use This System?</h2>
          </div>

          <div className="useCases">
            <div className="useCaseItem">
              <div className="useCaseTitle">Researchers & Academicians</div>
              <div className="useCaseDesc">Faster literature review across PDF, image, audio.</div>
            </div>
            <div className="useCaseItem">
              <div className="useCaseTitle">Enterprise & Corporate Users</div>
              <div className="useCaseDesc">Private search across internal docs and meetings.</div>
            </div>
            <div className="useCaseItem">
              <div className="useCaseTitle">Legal & Compliance Professionals</div>
              <div className="useCaseDesc">Evidence-backed answers with exact source references.</div>
            </div>
            <div className="useCaseItem">
              <div className="useCaseTitle">Healthcare & Medical Staff</div>
              <div className="useCaseDesc">Local analysis of reports, notes, and audio.</div>
            </div>
            <div className="useCaseItem">
              <div className="useCaseTitle">Students & Self-Learners</div>
              <div className="useCaseDesc">Study assistant for notes, lectures, and textbooks.</div>
            </div>
            <div className="useCaseItem">
              <div className="useCaseTitle">Admins & Developers</div>
              <div className="useCaseDesc">Extend agents and customize offline pipelines.</div>
            </div>
          </div>
        </div>
      </section>

      <section id="dashboard" className="section sectionAlt">
        <div className="container">
          <div className="sectionHeader">
            <h2 className="sectionTitle">Built-in Reports & Dashboards</h2>
            <p className="sectionSubtitle">
              Preview the analytics and monitoring views powered by your offline multi-modal RAG system.
            </p>
          </div>

          <div className="reportsGrid">
            <a className="reportTile" href="#/reports/query-analytics">
              <div className="reportTileHeader">
                <span className="reportTileTitle">Query Analytics Dashboard</span>
              </div>
              <div className="reportTileBody">
                <div>Total queries performed</div>
                <div>Most queried documents</div>
                <div>Average response time</div>
                <div>Query volume over time</div>
              </div>
              <span className="reportTileLink">Open report</span>
            </a>

            <a className="reportTile" href="#/reports/document-source?tab=usage">
              <div className="reportTileHeader">
                <span className="reportTileTitle">Document Usage Statistics</span>
              </div>
              <div className="reportTileBody">
                <div>Uploaded documents by type</div>
                <div>Top referenced documents</div>
                <div>Document usage trends</div>
              </div>
              <span className="reportTileLink">Open report</span>
            </a>

            <a className="reportTile" href="#/reports/document-source?tab=attribution">
              <div className="reportTileHeader">
                <span className="reportTileTitle">Source Attribution</span>
              </div>
              <div className="reportTileBody">
                <div>Source-wise retrieval frequency</div>
                <div>Top referenced sources</div>
                <div>Share of answers per source</div>
              </div>
              <span className="reportTileLink">Open report</span>
            </a>

            <a className="reportTile" href="#/reports/system-health">
              <div className="reportTileHeader">
                <span className="reportBadge">Report</span>
                <span className="reportTileTitle">View System Health Status</span>
              </div>
              <div className="reportTileBody">
                <div>Agent status overview</div>
                <div>Index size and growth</div>
                <div>Last processed file time</div>
              </div>
              <span className="reportTileLink">Open report</span>
            </a>
          </div>
        </div>
      </section>

      <section id="login" className="section">
        <div className="container">
          <div className="sectionHeader">
            <h2 className="sectionTitle">Login</h2>
          </div>
          <div className="loginCard">
            <div className="loginTitle">Sign in (UI only)</div>
            <form className="loginForm" onSubmit={(e) => e.preventDefault()}>
              <label className="field">
                <span className="fieldLabel">Email</span>
                <input className="fieldInput" type="email" placeholder="you@example.com" />
              </label>
              <label className="field">
                <span className="fieldLabel">Password</span>
                <input className="fieldInput" type="password" placeholder="••••••••" />
              </label>
              <button className="btn btnPrimary btnFull" type="submit">
                Login
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  )
}
