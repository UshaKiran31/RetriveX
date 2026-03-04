import React from 'react'

export function SystemHealthReport() {
  return (
    <section className="section">
      <div className="container">
        <div className="pageHeader">
          <div>
            <div className="pageKicker">Report</div>
            <h2 className="sectionTitle">System Health & Processing Report</h2>
            <p className="sectionSubtitle">
              Monitor agent status, FAISS index size, and recent processing activity.
            </p>
          </div>
          <a className="backLink" href="#/dashboard">
            Back to Reports
          </a>
        </div>

        <div className="kpiRow">
          <div className="kpiCard">
            <div className="metricLabel">FAISS vectors</div>
            <div className="metricValue">512,384</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Index size</div>
            <div className="metricValue">1.9 GB</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Last processed file</div>
            <div className="metricValue">10 min ago</div>
          </div>
          <div className="kpiCard">
            <div className="metricLabel">Queued items</div>
            <div className="metricValue">3</div>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Agent status</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Last activity</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>PDF agent</td>
                  <td>Running</td>
                  <td>Processed 3 files in last 15 min</td>
                </tr>
                <tr>
                  <td>DOCX agent</td>
                  <td>Idle</td>
                  <td>No new files in last hour</td>
                </tr>
                <tr>
                  <td>OCR agent</td>
                  <td>Running</td>
                  <td>Indexed 12 images today</td>
                </tr>
                <tr>
                  <td>Audio agent</td>
                  <td>Running</td>
                  <td>Transcribed 2 recordings today</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="reportSection">
          <div className="reportSectionHeader">
            <h3 className="reportSectionTitle">Index growth</h3>
          </div>
          <div className="tableWrapper">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>New vectors added</th>
                  <th>Total vectors</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Mon</td>
                  <td>18,240</td>
                  <td>472,180</td>
                </tr>
                <tr>
                  <td>Tue</td>
                  <td>12,604</td>
                  <td>484,784</td>
                </tr>
                <tr>
                  <td>Wed</td>
                  <td>15,320</td>
                  <td>500,104</td>
                </tr>
                <tr>
                  <td>Thu</td>
                  <td>12,280</td>
                  <td>512,384</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
