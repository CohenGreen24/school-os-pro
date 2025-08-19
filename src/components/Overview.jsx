// src/components/Overview.jsx  (FULL REPLACEMENT)
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

/* Optional sticky note widgets (admin adds via your existing flows) */
function StickyShell({ color='yellow', children }){
  return (
    <div className={`stickyNote sticky-${color}`}>
      <div className="stickyPin" aria-hidden>📌</div>
      <div className="stickyPaper">{children}</div>
    </div>
  )
}
function QuoteNote({ config }){
  const text = config?.text || '“Small steps every day.”'
  const author = config?.author || 'Unknown'
  return (
    <StickyShell color="yellow">
      <div className="noteTitle">Motivation</div>
      <div className="noteText">{text}</div>
      <div className="small" style={{marginTop:4}}>— {author}</div>
    </StickyShell>
  )
}
function GifNote({ config }){
  const url = config?.url || 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif'
  const cap = config?.caption || 'You got this!'
  return (
    <StickyShell color="mint">
      <div className="noteTitle">Mood</div>
      <img src={url} alt="gif" style={{width:'100%', borderRadius:8}} />
      <div className="small" style={{marginTop:6, textAlign:'center'}}>{cap}</div>
    </StickyShell>
  )
}

const REGISTRY = {
  calendar:     { group:'Core', label:'Calendar',     render: (u,c)=> <Calendar user={u} styleVariant={c.style}/> },
  assignments:  { group:'Core', label:'Assignments',  render: (u,c)=> <Assignments user={u} styleVariant={c.style} density={c.density}/> },
  wallet:       { group:'Core', label:'Wallet',       render: (u,c)=> <Wallet user={u} styleVariant={c.style} density={c.density}/> },
  library:      { group:'Core', label:'Library',      render: (u,c)=> <Library user={u} styleVariant={c.style}/> },
  appointments: { group:'Core', label:'Wellbeing',    render: (u,c)=> <Appointments user={u} styleVariant={c.style}/> },
  bulletin:     { group:'Core', label:'Bulletin',     render: (u,c)=> <BulletinBoard user={u} styleVariant={c.style} density={c.density}/> },
  map:          { group:'Core', label:'Map',          render: (u,c)=> <MapPanel styleVariant={c.style}/> },
  lunch:        { group:'Core', label:'Lunch',        render: (u,c)=> <Lunch user={u} styleVariant={c.style} density={c.density}/> },
  teacherpanel: { group:'Staff',label:'Teacher Panel',render: (u,c)=> <TeacherPanel user={u} styleVariant={c.style}/> },
  adminpanel:   { group:'Staff',label:'Admin Panel',  render: (u,c)=> <AdminPanel   user={u} styleVariant={c.style}/> },
  quotenote:    { group:'Personal', label:'Quote Note', render: (u,c)=> <QuoteNote  config={c}/> },
  gifnote:      { group:'Personal', label:'GIF Note',   render: (u,c)=> <GifNote    config={c}/> },
}

export default function Overview({ user }){
  const storageKey = `widgets_${user.id}`

  const [widgets,setWidgets] = React.useState(()=>{ 
    const saved = JSON.parse(localStorage.getItem(storageKey)||'[]')
    if (saved.length) return saved
    // Seed EXACTLY 6 small widgets (3x2)
    const seed = (user.role==='student'
      ? ['calendar','assignments','wallet','bulletin','library','lunch']
      : user.role==='teacher'
        ? ['teacherpanel','calendar','bulletin','lunch','assignments','library']
        : ['adminpanel','calendar','bulletin','lunch','assignments','library'])
    return seed.map((k,i)=>({id:String(i+1), k, size:'s', style:'glass', density:'compact'}))
  })
  const [adding,setAdding]   = React.useState(false)
  const [showGrid,setShowGrid] = React.useState(false)
  const gridRef  = React.useRef(null)
  const areaRef  = React.useRef(null)

  const save = (arr)=> localStorage.setItem(storageKey, JSON.stringify(arr))
  const add  = (k, extra={})=>{
    const id=String(Date.now())
    const base={id,k,size:'s',style:'glass',density:'compact',...extra}
    const arr=[...widgets, base]; setWidgets(arr); save(arr); setAdding(false)
  }
  const remove = (id)=>{ const arr=widgets.filter(w=>w.id!==id); setWidgets(arr); save(arr) }
  const setSize = (id,size)=>{ const arr=widgets.map(w=>w.id===id?{...w,size}:w); setWidgets(arr); save(arr) }
  const setStyle = (id,style)=>{ const arr=widgets.map(w=>w.id===id?{...w,style}:w); setWidgets(arr); save(arr) }
  const setDensity = (id,density)=>{ const arr=widgets.map(w=>w.id===id?{...w,density}:w); setWidgets(arr); save(arr) }
  const setConfig = (id,patch)=>{ const arr=widgets.map(w=>w.id===id?{...w, ...patch}:w); setWidgets(arr); save(arr) }
  const reset = ()=>{ localStorage.removeItem(storageKey); window.location.reload() }

  React.useEffect(()=>{
    const onDocDown = (e)=>{ if(areaRef.current && !areaRef.current.contains(e.target)) setShowGrid(false) }
    document.addEventListener('pointerdown', onDocDown)
    return ()=> document.removeEventListener('pointerdown', onDocDown)
  },[])

  React.useEffect(()=>{
    if(!gridRef.current) return
    const sortable = Sortable.create(gridRef.current, {
      animation: 120,
      draggable: '.widgetWrap',
      handle: '.dragHandle6',     // 6-dot only
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

  const ConfigBtn = ({w})=>{
    if (w.k==='quotenote'){
      return (
        <button className="btn btn-ghost xs" onClick={()=>{
          const text = prompt('Quote text:', w.text || '“Small steps every day.”'); if(text==null) return
          const author = prompt('Author:', w.author || 'Unknown'); setConfig(w.id, { text, author })
        }}>✎</button>
      )
    }
    if (w.k==='gifnote'){
      return (
        <button className="btn btn-ghost xs" onClick={()=>{
          const url = prompt('GIF URL:', w.url || ''); if(url==null) return
          const caption = prompt('Caption:', w.caption || 'You got this!'); setConfig(w.id, { url, caption })
        }}>✎</button>
      )
    }
    return null
  }

  const REG = REGISTRY

  return (
    <div className="widgetsArea" ref={areaRef}>
      <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
        <h2>Overview</h2>
        <div className="flex" style={{gap:8}}>
          <button className="btn xs" onClick={reset}>Reset</button>
          <button className="btn btn-primary xs" onClick={()=>setAdding(true)}>＋ Add</button>
        </div>
      </div>

      {showGrid && <div className="fineGrid" aria-hidden="true" style={{position:'absolute', inset:'34px 0 0 0'}}/>}

      <div className="widgetsGrid" ref={gridRef}>
        {widgets.map((w)=>{
          const def = REG[w.k]; if(!def) return null
          return (
            <div key={w.id} className={`widgetWrap widget-size-${w.size}`} data-id={w.id}>
              <div className="widgetToolbar glass">
                <button className="dragHandle6" aria-label="Drag widget" title="Drag">⠿</button>
                <span className="small">{def.label}</span>
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
                  <option value="compact">Compact</option>
                  <option value="comfortable">Comfortable</option>
                </select>
                <ConfigBtn w={w}/>
                <button className="btn btn-ghost xs" title="Remove" onClick={()=>remove(w.id)}>✕</button>
              </div>
              <div className="widgetBody">
                {def.render({ ...user }, w)}
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

            <h4 style={{margin:'10px 0 6px'}}>Core</h4>
            <div className="widgetPicker">
              {Object.entries(REG).filter(([k,v])=>v.group==='Core').map(([k,def])=>(
                <button key={k} className="glass card pickBtn" onClick={()=>add(k)}>{def.label}</button>
              ))}
            </div>

            {(user.role!=='student') && (
              <>
                <h4 style={{margin:'14px 0 6px'}}>Staff</h4>
                <div className="widgetPicker">
                  {Object.entries(REG).filter(([k,v])=>v.group==='Staff').map(([k,def])=>(
                    <button key={k} className="glass card pickBtn" onClick={()=>add(k)}>{def.label}</button>
                  ))}
                </div>
              </>
            )}

            {/* Personalisation entries are added elsewhere by admin; keep placeholders if you wish */}
            <h4 style={{margin:'14px 0 6px'}}>Personalisation</h4>
            <div className="widgetPicker">
              <button className="glass card pickBtn" onClick={()=>add('quotenote',{ text:'“Small steps every day.”', author:'Unknown' })}>
                Quote Note
              </button>
              <button className="glass card pickBtn" onClick={()=>add('gifnote',{ url:'', caption:'You got this!' })}>
                GIF Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
