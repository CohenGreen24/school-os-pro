import React from 'react'
import Sortable from 'sortablejs'

/**
 * Sidebar
 * Props:
 *  - user: { id, role, name }
 *  - active: current page key (e.g. 'overview', 'adminpanel', ...)
 *  - onNavigate: (key) => void
 */
export default function Sidebar({ user, active, onNavigate }) {
  const isTeacher = user?.role === 'teacher'
  const isAdmin   = user?.role === 'admin'

  // Base menu (everyone)
  const BASE = [
    { key:'overview',    label:'🏠 Overview' },
    { key:'calendar',    label:'📅 Calendar' },
    { key:'assignments', label:'📝 Assignments' },
    { key:'lunch',       label:'🍽️ Lunch' },
    { key:'library',     label:'📚 Library' },
    { key:'bulletin',    label:'📢 Bulletin' },
    { key:'appointments',label:'💬 Wellbeing' },
    { key:'map',         label:'🗺️ Map' },
    { key:'profile',     label:'👤 Profile' },
  ]

  // Extra for teacher/admin
  const EXTRA = [
    ...(isTeacher ? [{ key:'teacherpanel', label:'👩‍🏫 Homegroup' }] : []),
    ...(isAdmin   ? [{ key:'adminpanel',   label:'🛠️ Admin'     }] : []),
  ]

  // Final list before user custom ordering
  const DEFAULT_ITEMS = [...BASE, ...EXTRA]

  // Load/save order per user
  const storageKey = `sidebar_${user?.id || 'anon'}`
  const [items, setItems] = React.useState(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved) {
      // Filter out items that no longer apply (e.g., role changed)
      const parsed = JSON.parse(saved)
      const allowed = new Set(DEFAULT_ITEMS.map(i => i.key))
      return parsed.filter(i => allowed.has(i.key)).concat(
        DEFAULT_ITEMS.filter(i => !parsed.find(p => p.key === i.key))
      )
    }
    return DEFAULT_ITEMS
  })

  // Keep in sync with role changes (e.g., teacher → admin)
  React.useEffect(() => {
    const allowed = new Set(DEFAULT_ITEMS.map(i => i.key))
    const merged = items.filter(i => allowed.has(i.key))
                        .concat(DEFAULT_ITEMS.filter(i => !items.find(p => p.key === i.key)))
    setItems(merged)
    localStorage.setItem(storageKey, JSON.stringify(merged))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role])

  // SortableJS for drag-reorder
  const listRef = React.useRef(null)
  React.useEffect(() => {
    if (!listRef.current) return
    const sortable = Sortable.create(listRef.current, {
      animation: 150,
      handle: '.dragHandle',
      draggable: '.navItem',
      ghostClass: 'drag-ghost',
      onEnd: (evt) => {
        if (evt.oldIndex === evt.newIndex) return
        const arr = [...items]
        const [m] = arr.splice(evt.oldIndex, 1)
        arr.splice(evt.newIndex, 0, m)
        setItems(arr)
        localStorage.setItem(storageKey, JSON.stringify(arr))
      },
    })
    return () => sortable.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, listRef])

  return (
    <aside className="sidebarNav glass">
      <div className="brand">
        <div className="title">School OS</div>
        <div className="subtitle">{user?.name || 'Guest'} {isAdmin ? '• Admin' : isTeacher ? '• Teacher' : ''}</div>
      </div>

      <div className="nav" ref={listRef}>
        {items.map((item) => (
          <button
            key={item.key}
            className={`navItem ${active === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="dragHandle" title="Drag to reorder">⋮⋮</span>
            <span className="label">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebarFooter">
        <small className="muted">Tap ⋮⋮ to drag & reorder</small>
      </div>
    </aside>
  )
}
