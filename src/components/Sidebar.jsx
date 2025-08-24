// src/components/Sidebar.jsx
import React from 'react'

export default function Sidebar({ user, page, setPage, items = [] }) {
  const root = document.documentElement
  const [collapsed, setCollapsed] = React.useState(
    localStorage.getItem('sidebar_collapsed') === '1'
  )

  // Apply width via CSS var so your grid reflows.
  React.useEffect(() => {
    root.style.setProperty('--sidebar-w', collapsed ? '64px' : '200px')
    localStorage.setItem('sidebar_collapsed', collapsed ? '1' : '0')
  }, [collapsed])

  const onKey = (e, key) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setPage(key)
    }
  }

  const toggle = () => setCollapsed(c => !c)

  return (
    <aside className={`sidebarNav glass ${collapsed ? 'is-collapsed' : ''}`}>
      {/* Brand / header row */}
      <div className="brand glass" style={{ alignItems: 'center', gap: 8 }}>
        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="title">EduGate</div>
            <div className="subtitle small">
              {user?.role ? cap(user.role) : 'Guest'}
            </div>
          </div>
        )}
        {collapsed && (
          <div className="title" title="EduGate" aria-hidden="true">🧭</div>
        )}
        <button
          className="btn xs"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          onClick={toggle}
          style={{ marginLeft: 'auto' }}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="nav" aria-label="Primary">
        {items.map(({ key, icon, label }) => {
          const active = page === key
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-current={active ? 'page' : undefined}
              className={`navItem ${active ? 'active' : ''}`}
              onClick={() => setPage(key)}
              onKeyDown={(e) => onKey(e, key)}
              title={collapsed ? label : undefined}
            >
              <span className="navIcon" aria-hidden="true">{icon}</span>
              {!collapsed && <span className="navLabel">{label}</span>}
            </div>
          )
        })}
      </nav>
    </aside>
  )
}

function cap(s) {
  if (!s) return ''
  return String(s).slice(0,1).toUpperCase() + String(s).slice(1)
}
