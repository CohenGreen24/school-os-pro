import React from 'react'
import Sortable from 'sortablejs'

// Keep your existing feature components:
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
  calendar:     { label:'Calendar',     render: (u,c)=> <Calendar user={u} styleVariant={c.style}/> },
  assignments:  { label:'Assignments',  render: (u,c)=> <Assignments user={u} styleVariant={c.style} density={c.density}/> },
  wallet:       { label:'Wallet',       render: (u,c)=> <Wallet user={u} styleVariant={c.style} density={c.density}/> },
  library:      { label:'Library',      render: (u,c)=> <Library user={u} styleVariant={c.style}/> },
  appointments: { label:'Wellbeing',    render: (u,c)=> <Appointments user={u} styleVariant={c.style}/> },
  bulletin:     { label:'Bulletin',     render: (u,c)=> <BulletinBoard user={u} styleVariant={c.style} density={c.density}/> },
  map:          { label:'Map',          render: (u,c)=> <MapPanel styleVariant={c.style}/> },
  lunch:        { label:'Lunch',        render: (u,c)=> <Lunch user={u} styleVariant={c.style} density={c.density}/> },
  teacherpanel: { label:'Teacher Panel',render: (u,c)=> <TeacherPanel user={u} styleVariant={c.style}/> },
  adminpanel:   { label:'Admin Panel',  render: (u,c)=> <AdminPanel   user={u} styleVariant={c.style}/> },
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
  const [adding,setAdding]   = React.useState(false)
  const [showGrid,setShowGrid] = React.useState(false)
  const gridRef  = React.useRef(null)
  const areaRef  = React.useRef(null)

  const save = (arr)=> localStorage.setItem(storageKey, JSON.stringify(arr))
  const add  = (k)=>{ const id=String(Date.now()); const arr=[...widgets,{id,k,size:'s',style:'glass',density:'comfortable'}]; setWidgets(arr); save(arr); setAdding(false) }
  const remove = (id)=>{ const arr=widgets.filter(w=>w.id!==id); setWidgets(arr); save(arr) }
  const setSize = (id,size)=>{ const arr=widgets.map(w=>w.id===id?{...w,size}:w); setWidgets(arr); save(arr) }
  const setStyle = (id,style)=>{ const arr=widgets.map(w=>w.id===id?{...w,style}:w); setWidgets(arr); save(arr) }
  const setDensity = (id,density)=>{ const arr=widgets.map(w=>w.id===id?{...w,density}:w); setWidgets(arr); save(arr) }
  const reset = ()=>{ localStorage.removeItem(storageKey); window.location.reload() }

  // Hide grid overlay when clicking outside
  React.useEffect(()=>{
    const onDocDown = (e)=>{ if(areaRef.current && !areaRef.current.contains(e.target)) setShowGrid(false) }
    document.addEventListener('pointerdown', onDocDown)
    return ()=> document.removeEventListener('pointerdown', onDocDown)
  },[])

  // SortableJS init — long-press drag (iPad safe)
  React.useEffect(()=>{
    if(!gridRef.current) return
    const sortable = Sortable.create(gridRef.current, {
      animation: 160,
      draggable: '.widgetWrap',
      handle: '.widgetToolbar',            // you can also drag by toolbar
      delay: 150,                          // long-press to start on touch
      delayOnTouchOnly: true,
      forceFallback: true,
      fallbackOnBody: true,
      fallbackTolerance: 3,
      setData: function () {},             // prevent iOS ghost text selection
      ghostClass: 'drag-ghost',
      fallbackClass: 'drag-fallback',
      filter: 'input,select,textarea,button,a,.no-drag,.widgetBody', // don’t start drag from these
      preventOnFilter: true,
      onChoose: (evt)=>{ setShowGrid(true); evt.item.classList.add('draggingPulse') },
      onStart:  ()=>{ setShowGrid(true) },
      onEnd:    (evt)=>{
        setShowGrid(false)
        evt.item.classList.remove('draggingPulse')
        const from = evt.oldIndex, to = evt.newIndex
        if(from === to) return
        const arr = [...widgets]
        const [m] = arr.splice(from, 1)
        arr.splice(to, 0, m)               // reorder/swap logic (valid in 12-col grid)
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

      {showGrid && (
        <div className="gridOverlay" aria-hidden="true">
          <div className="gridOverlayInner">
            {Array.from({length:12}).map((_,i)=><div key={i} className="gridCol" />)}
          </div>
        </div>
      )}

      <div className="widgetsGrid" ref={gridRef}>
        {widgets.map((w)=>{
          const def = REGISTRY[w.k]; if(!def) return null
          return (
            <div key={w.id} className={`widgetWrap widget-size-${w.size}`} data-id={w.id}>
              <div className="widgetToolbar glass">
                <span className="small">{def.label}</span>
                {/* S + L only */}
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
