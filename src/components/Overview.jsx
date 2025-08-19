import React from 'react'
import Sortable from 'sortablejs'
import Calendar from './Calendar'
import Assignments from './Assignments'
import Wallet from './Wallet'
import Library from './Library'
import Appointments from './Appointments'
import BulletinBoard from './BulletinBoard'
import MapPanel from './MapPanel'
import Lunch from './Lunch'
import TeacherPanel from './TeacherPanel'
import AdminPanel from './AdminPanel'

const REGISTRY = {
  calendar:    { label:'Calendar',    render: (u,c)=> <Calendar user={u} styleVariant={c.style}/> },
  assignments: { label:'Assignments', render: (u,c)=> <Assignments user={u} styleVariant={c.style} density={c.density}/> },
  wallet:      { label:'Wallet',      render: (u,c)=> <Wallet user={u} styleVariant={c.style} density={c.density}/> },
  library:     { label:'Library',     render: (u,c)=> <Library user={u} styleVariant={c.style}/> },
  appointments:{ label:'Wellbeing',   render: (u,c)=> <Appointments user={u} styleVariant={c.style}/> },
  bulletin:    { label:'Bulletin',    render: (u,c)=> <BulletinBoard user={u} styleVariant={c.style} density={c.density}/> },
  map:         { label:'Map',         render: (u,c)=> <MapPanel styleVariant={c.style}/> },
  lunch:       { label:'Lunch',       render: (u,c)=> <Lunch user={u} styleVariant={c.style} density={c.density}/> },
  teacherpanel:{ label:'Teacher Panel', render:(u,c)=> <TeacherPanel user={u} styleVariant={c.style}/> },
  adminpanel:  { label:'Admin Panel',   render:(u,c)=> <AdminPanel   user={u} styleVariant={c.style}/> },
}

export default function Overview({ user }){
  const storageKey = `widgets_${user.id}`
  const [widgets,setWidgets] = React.useState(()=>{ 
    const saved = JSON.parse(localStorage.getItem(storageKey)||'[]')
    if (saved.length) return saved
    const seed = (user.role==='student'
      ? ['calendar','assignments','wallet','bulletin']
      : user.role==='teacher'
        ? ['teacherpanel','bulletin','lunch','map']
        : ['adminpanel','bulletin','calendar','lunch'])
    return seed.map((k,i)=>({id:String(i+1), k, size:'s', style:'glass', density:'comfortable'}))
  })
  const [adding,setAdding] = React.useState(false)
  const [showGrid,setShowGrid] = React.useState(false)
  const [draggingId,setDraggingId] = React.useState(null)
  const gridRef = React.useRef(null)
  const areaRef = React.useRef(null)

  const save = (arr)=> localStorage.setItem(storageKey, JSON.stringify(arr))
  const add = (k)=>{ const id=String(Date.now()); const arr=[...widgets, {id,k,size:'s',style:'glass',density:'comfortable'}]; setWidgets(arr); save(arr); setAdding(false) }
  const remove = (id)=>{ const arr=widgets.filter(w=>w.id!==id); setWidgets(arr); save(arr) }
  const setSize = (id,size)=>{ const arr=widgets.map(w=>w.id===id?{...w,size}:w); setWidgets(arr); save(arr) }
  const setStyle = (id,style)=>{ const arr=widgets.map(w=>w.id===id?{...w,style}:w); setWidgets(arr); save(arr) }
  const setDensity = (id,density)=>{ const arr=widgets.map(w=>w.id===id?{...w,density}:w); setWidgets(arr); save(arr) }
  const reset = ()=>{ localStorage.removeItem(storageKey); window.location.reload() }

  // Outside click to hide grid overlay (when not dragging)
  React.useEffect(()=>{
    const onDocClick = (e)=>{
      if (!areaRef.current) return
      if (!areaRef.current.contains(e.target)) setShowGrid(false)
    }
    document.addEventListener('pointerdown', onDocClick)
    return ()=> document.removeEventListener('pointerdown', onDocClick)
  },[])

  // SortableJS setup: long-press to start (delay), grid overlay & pulse class
  React.useEffect(()=>{
    if(!gridRef.current) return
    const sortable = Sortable.create(gridRef.current, {
      animation: 160,
      handle: '.widgetToolbar',           // drag via toolbar
      draggable: '.widgetWrap',
      delay: 180,                         // long-press to start
      delayOnTouchOnly: true,
      forceFallback: true,                // better visuals on iPad
      fallbackClass: 'drag-fallback',
      ghostClass: 'drag-ghost',
      onChoose: (evt)=>{
        setShowGrid(true)
        const id = evt.item?.dataset?.id
        setDraggingId(id || null)
        if (id) evt.item.classList.add('draggingPulse')
      },
      onStart: (evt)=>{
        setShowGrid(true)
      },
      onEnd: (evt)=>{
        setShowGrid(false)
        const id = evt.item?.dataset?.id
        setDraggingId(null)
        if (id) evt.item.classList.remove('draggingPulse')

        const from = evt.oldIndex
        const to   = evt.newIndex
        if(from === to) return
        const arr=[...widgets]
        const [m] = arr.splice(from,1)
        arr.splice(to,0,m)              // “swap/reorder” behavior
        setWidgets(arr); save(arr)
      }
    })
    return ()=> sortable.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRef, widgets])

  return (
    <div className="widgetsArea" ref={areaRef}>
      <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
        <h2>Overview</h2>
        <div className="flex" style={{gap:8}}>
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn btn-primary" onClick={()=>setAdding(true)}>＋ Add widgets</button>
        </div>
      </div>

      {/* Grid overlay shown during long-press/drag */}
      {showGrid && (
        <div className="gridOverlay" aria-hidden="true">
          <div className="gridOverlayInner">
            {Array.from({length:12}).map((_,i)=>(
              <div key={i} className="gridCol"></div>
            ))}
          </div>
        </div>
      )}

      <div className="widgetsGrid" ref={gridRef}>
        {widgets.map((w,idx)=>{
          const def = REGISTRY[w.k]; if(!def) return null
          return (
            <div
              key={w.id}
              data-id={w.id}
              className={`widgetWrap widget-size-${w.size}`}
              style={{ position:'relative' }}
            >
              <div className="widgetToolbar glass">
                <span className="small">{def.label}</span>
                {/* Only Small (s) and Large (l) */}
                <select className="input xs" value={w.size} onChange={e=>setSize(w.id, e.target.value)}>
                  <option value="s">S</option>
                  <option value="l">L</option>
                </select>
                <select className="input xs" value={w.style} onChange={e=>setStyle(w.id, e.target.value)}>
                  <option value="glass">Glass</option>
                  <option value="solid">Solid</option>
                  <option value="outline">Outline</option>
                </select>
                <select className="input xs" value={w.density} onChange={e=>setDensity(w.id, e.target.value)}>
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
                <button className="btn btn-ghost xs" title="Remove" onClick={()=>remove(w.id)}>✕</button>
              </div>
              <div className="widgetBody scrollable">
                {def.render({ ...user }, { style:w.style, density:w.density })}
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="modal glass" onClick={(e)=>{ if(e.target===e.currentTarget) setAdding(false) }}>
          <div className="modalBody glass card">
            <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
              <b>Add widgets</b>
              <button className="btn btn-ghost" onClick={()=>setAdding(false)}>Close</button>
            </div>
            <div className="widgetPicker">
              {Object.entries(REGISTRY).map(([k,def])=>(
                <button key={k} className="glass card pickBtn" onClick={()=>add(k)}>
                  {def.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
