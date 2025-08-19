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

const REGISTRY = {
  calendar:    { label:'Calendar',    render: (u,c)=> <Calendar user={u} styleVariant={c.style}/> },
  assignments: { label:'Assignments', render: (u,c)=> <Assignments user={u} styleVariant={c.style} density={c.density}/> },
  wallet:      { label:'Wallet',      render: (u,c)=> <Wallet user={u} styleVariant={c.style} density={c.density}/> },
  library:     { label:'Library',     render: (u,c)=> <Library user={u} styleVariant={c.style}/> },
  appointments:{ label:'Wellbeing',   render: (u,c)=> <Appointments user={u} styleVariant={c.style}/> },
  bulletin:    { label:'Bulletin',    render: (u,c)=> <BulletinBoard user={u} styleVariant={c.style} density={c.density}/> },
  map:         { label:'Map',         render: (u,c)=> <MapPanel styleVariant={c.style}/> },
  lunch:       { label:'Lunch',       render: (u,c)=> <Lunch user={u} styleVariant={c.style} density={c.density}/> },
}

export default function Overview({ user }){
  const key = `widgets_${user.id}`
  const [widgets,setWidgets] = React.useState(()=>{ 
    const stored = JSON.parse(localStorage.getItem(key)||'[]')
    if(stored.length) return stored
    const seed = (user.role==='student'
      ? ['calendar','assignments','wallet','bulletin']
      : ['bulletin','lunch','appointments','map'])
    return seed.map((k,i)=>({id:String(i+1), k, size:'s', style:'glass', density:'comfortable'}))
  })
  const [adding,setAdding] = React.useState(false)
  const gridRef = React.useRef(null)

  const save = (arr)=> localStorage.setItem(key, JSON.stringify(arr))
  const add = (k)=>{ const id=String(Date.now()); const arr=[...widgets, {id,k,size:'s',style:'glass',density:'comfortable'}]; setWidgets(arr); save(arr); setAdding(false) }
  const remove = (id)=>{ const arr=widgets.filter(w=>w.id!==id); setWidgets(arr); save(arr) }
  const setSize = (id,size)=>{ const arr=widgets.map(w=>w.id===id?{...w,size}:w); setWidgets(arr); save(arr) }
  const setStyle = (id,style)=>{ const arr=widgets.map(w=>w.id===id?{...w,style}:w); setWidgets(arr); save(arr) }
  const setDensity = (id,density)=>{ const arr=widgets.map(w=>w.id===id?{...w,density}:w); setWidgets(arr); save(arr) }
  const reset = ()=>{ localStorage.removeItem(key); window.location.reload() }

  // Touch-friendly drag using SortableJS
  React.useEffect(()=>{
    if(!gridRef.current) return
    const sortable = Sortable.create(gridRef.current, {
      animation: 150,
      handle: '.widgetToolbar',       // drag by toolbar only (prevents text selection)
      draggable: '.widgetWrap',
      ghostClass: 'drag-ghost',
      onEnd: (evt)=>{
        const from = evt.oldIndex
        const to   = evt.newIndex
        if(from === to) return
        const arr=[...widgets]
        const [m] = arr.splice(from,1)
        arr.splice(to,0,m)
        setWidgets(arr); save(arr)
      }
    })
    return ()=> sortable.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridRef, widgets])

  return (
    <div className="widgetsArea">
      <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
        <h2>Overview</h2>
        <div className="flex" style={{gap:8}}>
          <button className="btn" onClick={reset}>Reset</button>
          <button className="btn btn-primary" onClick={()=>setAdding(true)}>＋ Add widgets</button>
        </div>
      </div>

      <div className="widgetsGrid" ref={gridRef}>
        {widgets.map((w,idx)=>{
          const def = REGISTRY[w.k]; if(!def) return null
          return (
            <div key={w.id} className={`widgetWrap widget-size-${w.size}`} data-index={idx}>
              <div className="widgetToolbar glass">
                <span className="small">{def.label}</span>
                {/* sizes: only Small (s) and Large (l) */}
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
              {/* scrollable body for long lists */}
              <div className="widgetBody scrollable">
                {def.render({ ...user }, { style:w.style, density:w.density })}
              </div>
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="modal glass">
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
