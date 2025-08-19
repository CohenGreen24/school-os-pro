// src/components/Sidebar.jsx
import React from 'react'
import Sortable from 'sortablejs'

const ICONS = {
  overview:'🏠', calendar:'📅', assignments:'📝', lunch:'🍽️',
  library:'📚', bulletin:'📢', appointments:'💬', map:'🗺️',
  profile:'👤', teacherpanel:'👩‍🏫', adminpanel:'🛠️'
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
  ]
  const EXTRA = [
    ...(isTeacher ? [{ key:'teacherpanel', label:'Homegroup' }] : []),
    ...(isAdmin   ? [{ key:'adminpanel',   label:'Admin'     }] : []),
  ]
  const DEFAULT_ITEMS = [...BASE, ...EXTRA]

  const storageKey = `sidebar_${user?.id || 'anon'}`
  const [items, setItems] = React.useState(() => {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return DEFAULT_ITEMS
    const parsed = JSON.parse(saved)
    const allowed = new Set(DEFAULT_ITEMS.map(i=>i.key))
    return parsed.filter(i=>allowed.has(i.key))
      .concat(DEFAULT_ITEMS.filter(i=>!parsed.find(p=>p.key===i.key)))
  })
  const [expanded,setExpanded] = React.useState(false)

  React.useEffect(()=>{
    const allowed = new Set(DEFAULT_ITEMS.map(i=>i.key))
    const merged = items.filter(i=>allowed.has(i.key))
      .concat(DEFAULT_ITEMS.filter(i=>!items.find(p=>p.key===i.key)))
    setItems(merged)
    localStorage.setItem(storageKey, JSON.stringify(merged))
    // eslint-disable-next-line
  }, [user?.role])

  const listRef = React.useRef(null)
  React.useEffect(()=>{
    if(!listRef.current) return
    const sortable = Sortable.create(listRef.current, {
      animation: 150,
      handle: '.dragHandle',
      draggable: '.navItem',
      ghostClass: 'drag-ghost',
      setData(){}, // iOS selection guard
      onEnd: (evt)=>{
        if (evt.oldIndex === evt.newIndex) return
        const arr = [...items]
        const [m] = arr.splice(evt.oldIndex,1)
        arr.splice(evt.newIndex,0,m)
        setItems(arr)
        localStorage.setItem(storageKey, JSON.stringify(arr))
      }
    })
    return ()=> sortable.destroy()
    // eslint-disable-next-line
  }, [items])

  return (
    <aside
      className={`sidebarNav glass ${expanded?'sidebar--expanded':''}`}
      style={{ position:'sticky', top:8, alignSelf:'start', height:'fit-content' }}
    >
      <div className="brand" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div className="title">{expanded ? 'School OS' : '🏫'}</div>
        <button className="btn xs" onClick={()=>setExpanded(v=>!v)} title="Expand/Collapse">
          {expanded ? '‹' : '›'}
        </button>
      </div>

      <div className="nav" ref={listRef}>
        {items.map(item=>(
          <button
            key={item.key}
            className={`navItem ${active===item.key?'active':''}`}
            onClick={()=>onNavigate(item.key)}
            title={item.label}
          >
            <span className="dragHandle" title="Drag">⋮⋮</span>
            <span aria-hidden="true" style={{fontSize:'1.1rem'}}>{ICONS[item.key] || '•'}</span>
            <span className="label">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}
