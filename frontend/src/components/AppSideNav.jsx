import React from 'react'

export function AppSideNav({ onNewProject }) {
  return (
    <aside className="sideNav">
      <div className="sideNavHeader">OpenSlate</div>
      <div className="sideNavItems">
        <button className="sideBtn sideBtnPrimary" onClick={onNewProject}>
          <span className="sideBtnIcon">+</span>
          <span>New project</span>
        </button>
        <a href="#/projects" className="sideBtn">
          <span className="sideBtnIcon">▤</span>
          <span>Projects</span>
        </a>
      </div>
    </aside>
  )
}

