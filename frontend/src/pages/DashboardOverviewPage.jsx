import React from 'react'

export function DashboardOverviewPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="sectionHeader">
          <h2 className="sectionTitle">Built-in Reports & Dashboards</h2>
          <p className="sectionSubtitle">
            Navigate into detailed dashboards to understand queries, document usage, and system health.
          </p>
        </div>

        <div className="reportsGrid">
          <a className="reportTile" href="#/reports/query-analytics">
            <div className="reportTileHeader">
              <span className="reportTileTitle">Query Analytics Dashboard</span>
            </div>
            <div className="reportTileMetrics">
              <div>
                <div className="metricLabel">Total queries</div>
                <div className="metricValue">12,458</div>
              </div>
              <div>
                <div className="metricLabel">Avg. response time</div>
                <div className="metricValue">1.2 s</div>
              </div>
            </div>
            <div className="reportTileBody">
              Track query volume, popular documents, and latency trends across time.
            </div>
            <span className="reportTileLink">View Query Analytics</span>
          </a>

          <a className="reportTile" href="#/reports/document-source?tab=usage">
            <div className="reportTileHeader">
              <span className="reportTileTitle">Document Usage Statistics</span>
            </div>
            <div className="reportTileMetrics">
              <div>
                <div className="metricLabel">Documents</div>
                <div className="metricValue">328</div>
              </div>
              <div>
                <div className="metricLabel">Modalities</div>
                <div className="metricValue">PDF · DOCX · Image · Audio</div>
              </div>
            </div>
            <div className="reportTileBody">
              Monitor which formats and sources power most answers across the system.
            </div>
            <span className="reportTileLink">View Document Report</span>
          </a>

          <a className="reportTile" href="#/reports/document-source?tab=attribution">
            <div className="reportTileHeader">
              <span className="reportTileTitle">Source Attribution</span>
            </div>
            <div className="reportTileMetrics">
              <div>
                <div className="metricLabel">Top source</div>
                <div className="metricValue">Research repo</div>
              </div>
              <div>
                <div className="metricLabel">Share of answers</div>
                <div className="metricValue">41%</div>
              </div>
            </div>
            <div className="reportTileBody">
              Review retrieval frequency by source and how evidence is attributed in answers.
            </div>
            <span className="reportTileLink">View Source Attribution</span>
          </a>

          <a className="reportTile" href="#/reports/system-health">
            <div className="reportTileHeader">
              <span className="reportTileTitle">View System Health Status</span>
            </div>
            <div className="reportTileMetrics">
              <div>
                <div className="metricLabel">Agents online</div>
                <div className="metricValue">4 / 4</div>
              </div>
              <div>
                <div className="metricLabel">FAISS vectors</div>
                <div className="metricValue">512k</div>
              </div>
            </div>
            <div className="reportTileBody">
              Keep track of agents, index size, and the freshness of processed content.
            </div>
            <span className="reportTileLink">View System Health</span>
          </a>
        </div>
      </div>
    </section>
  )
}
