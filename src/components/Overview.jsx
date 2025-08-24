// src/components/Overview.jsx
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

/* ===== Sticky Note AS a widget (not inside a card) ===== */
function StickyNoteWidget({ w, onEdit }) {
  return (
    <div className="stickyWidget">
      <div className="stickyPin" aria-hidden>📌</div>
      <textarea
        className="stickyPaperArea"
        value={w.text || ''}
        onChange={(e)=>onEdit({ text: e.target.value })}
        placeholder="Type a note…"
      />
      <div className="stickyFooter">
        <button className="btn xs" onClick={()=>onEdit({ color: cycle(w.color) })}>Color</button>
      </div>
    </div>
  )
}
const COLORS = ['yellow','mint','lilac','peach']
const cycle = (c)=> COLORS[(COLORS.indexOf(c||'yellow')+1)%COLORS.length]

/* ===== Registry ===== */
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
  stickynote:   { label:'Sticky Note',  render: (u,c,edit)=> <StickyNoteWidget w={c} onEdit={(p)=>edit(p)} /> },
}

export default function Overview({ user }){
  const storageKey = `widgets_${user.id}`

  const [widgets,setWidgets] = React.useState(()=>{ 
    const saved = JSON.parse(localStorage.getItem(storageKey)||'[]')
    if (saved.length) return saved
    const seed = (user.role==='student'
      ? ['calendar','assignments','wallet','bulletin','library','lunch','stickynote']
      : user.role==='teacher'
        ? ['teacherpanel','calendar','bulletin','lunch','assignments','library','stickynote']
        : ['adminpanel','calendar','bulletin','lunch','assignments','library','stickynote']
    )
    return seed.map((k,i)=>({ id:String(i+1), k,
      size: (i%3===2 ? 'long' : 'small'),
      style:'glass', density:'compact',
      color: 'yellow', text: (k==='stickynote'?'':'')
    }))
  })
  const [adding,setAdding]   = React.useState(false)
  const [showGrid,setShowGrid] = React.useState(false)
  const gridRef  = React.useRef(null)

  const save = (arr)=> localStorage.setItem(storageKey, JSON.stringify(arr))
  const add  = (k, extra={})=>{
    const id=String(Date.now())
    const base={id,k,size:'small',style:'glass',density:'compact',color:'yellow',text:'',...extra}
    const arr=[...widgets, base]; setWidgets(arr); save(arr); setAdding(false)
  }
  const edit = (id, patch)=>{ const arr=widgets.map(w=>w.id===id?{...w, ...patch}:w); setWidgets(arr); save(arr) }
  const remove = (id)=>{ const arr=widgets.filter(w=>w.id!==id); setWidgets(arr); save(arr) }
  const setSize = (id,size)=> edit(id,{ size })
  const setStyle = (id,style)=> edit(id,{ style })
  const setDensity = (id,density)=> edit(id,{ density })

  // Sortable for smooth drag with subtle animation
  React.useEffect(()=>{
    if(!gridRef.current) return
    const sortable = Sortable.create(gridRef.current, {
      animation: 170,
      easing: 'cubic-bezier(.2,.8,.2,1)',
      draggable: '.widget',
      handle: '.dragHandle6',
      setData(){},
      ghostClass: 'drag-ghost',
      fallbackClass: 'drag-fallback',
      forceFallback: true,
      onChoose: (evt)=>{ setShowGrid(true); evt.item.classList.add('draggingPulseSoft') },
      onEnd:    (evt)=>{
        setShowGrid(false); evt.item.classList.remove('draggingPulseSoft')
        if (evt.oldIndex===evt.newIndex) return
        const arr=[...widgets]; const [m]=arr.splice(evt.oldIndex,1); arr.splice(evt.newIndex,0,m)
        setWidgets(arr); save(arr)
      }
    })
    return ()=> sortable.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets])

  const REG = REGISTRY

  return (
    <div className="widgetsArea">
      <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
        <h2>Overview</h2>
        <div className="flex" style={{gap:8}}>
          <button className="btn xs" onClick={()=>{ localStorage.removeItem(storageKey); window.location.reload() }}>Reset</button>
          <button className="btn btn-primary xs" onClick={()=>setAdding(true)}>＋ Add</button>
        </div>
      </div>

      {showGrid && <div className="fineGrid" aria-hidden />}

      <div className="widgetsGrid" ref={gridRef}>
        {widgets.map((w)=>{
          const def = REG[w.k]; if(!def) return null
          const isNote = w.k === 'stickynote'
          return (
            <div key={w.id} className={`widget size-${w.size} ${isNote?'noteOnly':''}`} data-id={w.id}>
              {/* if sticky note → render free-note surface; else → normal inner card */}
              {isNote ? (
                <div className={`noteInner note-${w.color}`}>
                  <div className="widgetToolbar">
                    <button className="dragHandle6" title="Drag">⠿</button>
                    <span className="small">Sticky Note</span>
                    <select className="input xs" value={w.size} onChange={e=>setSize(w.id, e.target.value)}>
                      <option value="small">Small</option>
                      <option value="tall">Tall</option>
                      <option value="long">Long</option>
                      <option value="xl">XL</option>
                    </select>
                    <button className="btn xs" onClick={()=>edit(w.id, { color: (COLORS[(COLORS.indexOf(w.color)+1)%COLORS.length]) })}>Color</button>
                    <button className="btn btn-ghost xs" onClick={()=>remove(w.id)}>✕</button>
                  </div>
                  <div className="noteCanvas">
                    <div className="stickyWidget">
                      <div className="stickyPin" aria-hidden>📌</div>
                      <textarea
                        className={`stickyPaperArea ${w.color || 'yellow'}`}
                        value={w.text || ''}
                        onChange={(e)=>edit(w.id, { text: e.target.value })}
                        placeholder="Type a note…"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="widgetInner glass">
                  <div className="widgetToolbar">
                    <button className="dragHandle6" title="Drag">⠿</button>
                    <span className="small">{def.label}</span>
                    <select className="input xs" value={w.size} onChange={e=>setSize(w.id, e.target.value)}>
                      <option value="small">Small</option>
                      <option value="tall">Tall</option>
                      <option value="long">Long</option>
                      <option value="xl">XL</option>
                    </select>
                    <select className="input xs" value={w.style} onChange={e=>setStyle(w.id, e.target.value)}>
                      <option value="glass">Glass</option>
                      <option value="solid">Solid</option>
                      <option value="outline">Outline</option>
                    </select>
                    <select className="input xs" value={w.density} onChange={e=>setDensity(w.id, e.target.value)}>
                      <option value="compact">Compact</option>
                      <option value="comfortable">Comfortable</option>
                    </select>
                    <button className="btn btn-ghost xs" onClick={()=>remove(w.id)}>✕</button>
                  </div>
                  <div className="widgetBody">
                    {def.render({ ...user }, w, (p)=>edit(w.id,p))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {adding && (
        <div className="modal" onClick={(e)=>{ if(e.target===e.currentTarget) setAdding(false) }}>
          <div className="modalBody glass card">
            <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
              <b>Add widgets</b>
              <button className="btn btn-ghost" onClick={()=>setAdding(false)}>Close</button>
            </div>

            <h4 style={{margin:'10px 0 6px'}}>Core</h4>
            <div className="widgetPicker">
              {Object.entries(REG).filter(([k])=>!['stickynote','teacherpanel','adminpanel'].includes(k)).map(([k,def])=>(
                <button key={k} className="glass card pickBtn" onClick={()=>add(k)}>{def.label}</button>
              ))}
            </div>

            {(user.role!=='student') && (
              <>
                <h4 style={{margin:'14px 0 6px'}}>Staff</h4>
                <div className="widgetPicker">
                  {Object.entries(REG).filter(([k])=>['teacherpanel','adminpanel'].includes(k)).map(([k,def])=>(
                    <button key={k} className="glass card pickBtn" onClick={()=>add(k)}>{def.label}</button>
                  ))}
                </div>
              </>
            )}

            <h4 style={{margin:'14px 0 6px'}}>Personal</h4>
            <div className="widgetPicker">
              <button className="glass card pickBtn" onClick={()=>add('stickynote',{ text:'', color:'yellow' })}>
                Sticky Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
