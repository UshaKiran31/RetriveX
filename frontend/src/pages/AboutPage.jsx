import React from 'react'

export function AboutPage() {
  return (
    <section className="section">
      <div className="container aboutLayout">
        <div className="aboutMain">
          <div className="sectionHeader">
            <h2 className="sectionTitle">About the Project</h2>
            <p className="sectionSubtitle">
              The Offline Multi-modal Retrieval-Augmented Generation (RAG) System is designed to provide intelligent,
              secure, and explainable information retrieval from heterogeneous data sources.
            </p>
          </div>

          <div className="aboutBlock">
            <h3 className="aboutTitle">Objectives</h3>
            <ul className="aboutList">
              <li>Enable natural language querying across multi-modal data</li>
              <li>Reduce hallucinations using Retrieval-Augmented Generation</li>
              <li>Ensure offline, privacy-preserving AI processing</li>
              <li>Provide explainable, source-linked answers</li>
            </ul>
          </div>

          <div className="aboutBlock">
            <h3 className="aboutTitle">Technologies Used</h3>
            <div className="aboutTags">
              <span>Python</span>
              <span>FastAPI</span>
              <span>ReactJS</span>
              <span>FAISS</span>
              <span>Sentence-Transformers</span>
              <span>Tesseract OCR</span>
              <span>Whisper (Offline)</span>
              <span>Local LLMs (Mistral / LLaMA / Qwen)</span>
            </div>
          </div>
          <div className="aboutBlock">
            <h3 className="aboutTitle">Academic Information</h3>
            <ul className="aboutList">
              <li>Major Project</li>
              <li>Department of CSE (AI & ML)</li>
              <li>Vasireddy Venkatadri Institute of Technology</li>
              <li>Academic Year 2025-2026</li>
            </ul>
          </div>
        </div>

        <div className="aboutSide">
          <div className="aboutBlock">
            <h3 className="aboutTitle">Project Team</h3>
            <div className="teamGrid">
              <div className="teamCard">
                <div className="teamName">Usha Kiran Paruchuri </div>
                <div className="teamRole">Role – RAG Pipeline & AI Integration</div>
                <ul className="aboutList">
                  <li>Implemented semantic search and RAG pipeline</li>
                  <li>Integrated local LLMs and FAISS</li>
                </ul>
              </div>
              <div className="teamCard">
                <div className="teamName">Jakka Charishma</div>
                <div className="teamRole">Role – API & System Integration</div>
                <ul className="aboutList">
                  <li>Developed FastAPI backend</li>
                  <li>Integrated services and managed configurations</li>
                </ul>
              </div>
              <div className="teamCard">
                <div className="teamName">Kakumanu Ravi Chandra</div>
                <div className="teamRole">Role – Frontend & Documentation</div>
                <ul className="aboutList">
                  <li>Designed web UI and dashboards</li>
                  <li>Prepared project documentation</li>
                </ul>
              </div>
              <div className="teamCard">
                <div className="teamName">Mandadapu Prabhas</div>
                <div className="teamRole">Role – Backend & Agent Development</div>
                <ul className="aboutList">
                  <li>Designed agent-based architecture</li>
                  <li>Implemented PDF, DOCX, OCR, and Audio agents</li>
                </ul>
              </div>
            </div>
          </div>

          
        </div>
      </div>
    </section>
  )
}
