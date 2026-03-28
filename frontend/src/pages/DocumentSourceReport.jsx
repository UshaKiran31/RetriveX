import React, { useEffect } from 'react'

export function DocumentSourceReport({ tab }) {
  useEffect(() => {
    if (!tab) return
    const targetId = tab === 'usage' ? 'doc-usage' : tab === 'attribution' ? 'source-attribution' : null
    if (!targetId) return
    const el = document.getElementById(targetId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [tab])

  return (
    <section className="section">
      <div className="container">
        <div className="pageHeader">
          <div>
            <div className="pageKicker">Report</div>
            <h2 className="sectionTitle">Document & Source Report</h2>
            <p className="sectionSubtitle">
              Inspect how different document types and sources contribute to answers.
            </p>
          </div>
          <a className="backLink" href="#/dashboard">
            Back to Reports
          </a>
        </div>

        <div className="kpiRow">
          <div className="kpiCard">
            <div className="metricLabel">Total documents</div>
            <div className="metricValue">328</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">PDF</div>
            <div className="metricValue">172</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">DOCX</div>
            <div className="metricValue">96</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Images & Audio</div>
            <div className="metricValue">60</div>
          </div>
        </div>

        <div id="doc-usage" className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Documents by type</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Count</th>
                  <th>Share of queries</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PDF</td>
                  <td>172</td>
                  <td>58%</td>
                </tr>
                <tr>
                  <td>DOCX</td>
                  <td>96</td>
                  <td>24%</td>
                </tr>
                <tr>
                  <td>Image</td>
                  <td>34</td>
                  <td>10%</td>
                </tr>
                <tr>
                  <td>Audio</td>
                  <td>26</td>
                  <td>8%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Top referenced documents</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Type</th>
                  <th>References in answers</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Data Privacy Policy.pdf</td>
                  <td>PDF</td>
                  <td>312</td>
                </tr>
                <tr>
                  <td>Offline Deployment Guide.docx</td>
                  <td>DOCX</td>
                  <td>201</td>
                </tr>
                <tr>
                  <td>Architecture Diagram.png</td>
                  <td>Image</td>
                  <td>148</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div id="source-attribution" className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Source-wise retrieval frequency</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Retrievals</th>
                  <th>Share of answers</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Research repository</td>
                  <td>1,942</td>
                  <td>41%</td>
                </tr>
                <tr>
                  <td>Enterprise knowledge base</td>
                  <td>1,312</td>
                  <td>32%</td>
                </tr>
                <tr>
                  <td>Compliance archive</td>
                  <td>824</td>
                  <td>17%</td>
                </tr>
                <tr>
                  <td>Meeting recordings</td>
                  <td>462</td>
                  <td>10%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
