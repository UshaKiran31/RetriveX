import React from 'react'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footerInner">
        <div className="footerBrand">RetrieveX</div>
        <div className="footerMeta">
          <div>Technologies Used: React, Vite, FastAPI, FAISS, Local LLMs</div>
          <div>Academic Project – Major Project</div>
          <div>{new Date().getFullYear()}</div>
        </div>
      </div>
    </footer>
  )
}
