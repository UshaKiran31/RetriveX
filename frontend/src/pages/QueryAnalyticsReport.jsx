import React from 'react'

export function QueryAnalyticsReport() {
  return (
    <section className="section">
      <div className="container">
        <div className="pageHeader">
          <div>
            <div className="pageKicker">Report</div>
            <h2 className="sectionTitle">Query Analytics Dashboard</h2>
            <p className="sectionSubtitle">
              Understand how users interact with the offline RAG system over time.
            </p>
          </div>
          <a className="backLink" href="#/dashboard">
            Back to Reports
          </a>
        </div>

        <div className="kpiRow">
          <div className="kpiCard">
            <div className="metricLabel">Total queries performed</div>
            <div className="metricValue">12,458</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Most recent 24h queries</div>
            <div className="metricValue">324</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Average response time</div>
            <div className="metricValue">1.2 s</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Peak queries per minute</div>
            <div className="metricValue">42</div>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Most queried documents</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Document</th>
                  <th>Type</th>
                  <th>Query count</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>Research Paper – Multi-modal RAG Survey.pdf</td>
                  <td>PDF</td>
                  <td>842</td>
                </tr>
                <tr>
                  <td>2</td>
                  <td>System Architecture Overview.docx</td>
                  <td>DOCX</td>
                  <td>613</td>
                </tr>
                <tr>
                  <td>3</td>
                  <td>Compliance Guidelines v3.pdf</td>
                  <td>PDF</td>
                  <td>421</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Query timeline</h3>
            <div className="reportSectionCaption">Daily query volume (mock data)</div>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Total queries</th>
                  <th>Avg. response time</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mon</td>
                  <td>1,820</td>
                  <td>1.1 s</td>
                </tr>
                <tr>
                  <td>Tue</td>
                  <td>1,644</td>
                  <td>1.3 s</td>
                </tr>
                <tr>
                  <td>Wed</td>
                  <td>1,972</td>
                  <td>1.2 s</td>
                </tr>
                <tr>
                  <td>Thu</td>
                  <td>2,104</td>
                  <td>1.2 s</td>
                </tr>
                <tr>
                  <td>Fri</td>
                  <td>1,936</td>
                  <td>1.4 s</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
