// src/components/Sidebar.jsx
import React from 'react'

const ICONS = {
  overview:'🏠', calendar:'📅', assignments:'📝', lunch:'🍽️',
  library:'📚', bulletin:'📢', appointments:'💬', map:'🗺️',
  profile:'👤', teacherpanel:'👩‍🏫', adminpanel:'🛠️', settings:'⚙️'
}

export default function Sidebar({ user, active, onNavigate }) {
  const isTeacher = user?.role === 'teacher'
  const isAdmin   = user?.role === 'admin'

  const BASE = [
    { key:'overview',    label:'Overview' },
    { key:'calendar',    label:'Calendar' },
    { key:'assignments', label:'Assignments' },
    { key:'lunch',       label:'Lunch' },
    { key:'library',     label:'Library' },
    { key:'bulletin',    label:'Bulletin' },
    { key:'appointments',label:'Wellbeing' },
    { key:'map',         label:'Map' },
    { key:'profile',     label:'Profile' },
    { key:'settings',    label:'Settings' },
  ]
  const EXTRA = [
    ...(isTeacher ? [{ key:'teacherpanel', label:'Homegroup' }] : []),
    ...(isAdmin   ? [{ key:'adminpanel',   label:'Admin'     }] : []),
  ]
  const ITEMS = [...BASE, ...EXTRA]

  return (
    <aside className="sidebarNav glass" role="navigation" aria-label="Main">
      <div className="brand">
        <div className="title">School OS</div>
        <div className="subtitle">{user?.name || 'Guest'}</div>
      </div>
      <div className="nav">
        {ITEMS.map(item=>(
          <button
            key={item.key}
            className={`navItem ${active===item.key?'active':''}`}
            onClick={()=>onNavigate(item.key)}
            title={item.label}
          >
            <span className="navIcon" aria-hidden="true">{ICONS[item.key] || '•'}</span>
            <span className="navLabel">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
