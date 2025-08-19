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

/* --------- Personalisation widgets --------- */
function QuoteWidget({ config }){
  const text = config?.text || '“Believe you can and you’re halfway there.”'
  const author = config?.author || 'Theodore Roosevelt'
  return (
    <div className="list">
      <div className="item">
        <div style={{fontSize:'1.05rem', fontWeight:600}}>{text}</div>
        <div className="small" style={{marginTop:4}}>— {author}</div>
      </div>
    </div>
  )
}
function AnimatedWidget({ config }){
  const src = config?.url || 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaXU2bmN0aWhxczlqcmEzbGp5OGM2dnB2eG5sN2NtNDh6c3ZxY2VqNiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3oEjI6SIIHBdRxXI40/giphy.gif'
  const cap = config?.caption || 'Keep going!'
  return (
    <div className="list">
      <div className="item" style={{padding:6}}>
        <img src={src} alt="animated" style={{borderRadius:12}} />
        <div className="small" style={{marginTop:6, textAlign:'center'}}>{cap}</div>
      </div>
    </div>
  )
}

/* --------- Registry --------- */
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
  quote:        { group:'Personalisation', label:'Motivational Quote', render: (u,c)=> <QuoteWidget config={c}/> },
  animated:     { group:'Personalisation', label:'Animated Image',     render: (u,c)=> <AnimatedWidget config={c}/> },
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
    // compact by default (S)
    return seed.map((k,i)=>({id:String(i+1), k, size:'s', style:'glass', density:'compact'}))
  })
  const [adding,setAdding]   = React.useState(false)
  const [showGrid,setShowGrid] = React.useState(false)
  const [dragging,setDragging] = React.useState(false)
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

  // Scoped overlay visibility
  React.useEffect(()=>{
    const onDocDown = (e)=>{ if(areaRef.current && !areaRef.current.contains(e.target)) setShowGrid(false) }
    document.addEventListener('pointerdown', onDocDown)
    return ()=> document.removeEventListener('pointerdown', onDocDown)
  },[])

  // Sortable: long-press 2s, neat auto-swap as you hover others
  React.useEffect(()=>{
    if(!gridRef.current) return
    const sortable = Sortable.create(gridRef.current, {
      animation: 120,
      draggable: '.widgetWrap',
      handle: '.widgetToolbar',      // drag by toolbar (or long-press anywhere due to delay)
      delay: 2000,                   // 2 seconds long-press
      delayOnTouchOnly: true,
      forceFallback: true,
      setData(){},
      ghostClass: 'drag-ghost',
      fallbackClass: 'drag-fallback',
      filter: 'input,select,textarea,button,a,.no-drag',
      preventOnFilter: true,
      onChoose: (evt)=>{ setDragging(true); setShowGrid(true); evt.item.classList.add('draggingPulseSoft') },
      onEnd:    (evt)=>{
        setDragging(false); setShowGrid(false); evt.item.classList.remove('draggingPulseSoft')
        if (evt.oldIndex===evt.newIndex) return
        const arr=[...widgets]; const [m]=arr.splice(evt.oldIndex,1); arr.splice(evt.newIndex,0,m)
        setWidgets(arr); save(arr)
      }
    })
    return ()=> sortable.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgets])

  // Simple config editors for personalisation items (inline)
  const ConfigButton = ({w})=>{
    if (w.k==='quote'){
      return (
        <button className="btn btn-ghost xs" onClick={()=>{
          const text = prompt('Quote text:', w.text || '“Believe you can and you’re halfway there.”')
          if (text==null) return
          const author = prompt('Author:', w.author || 'Theodore Roosevelt')
          setConfig(w.id, { text, author })
        }}>✎</button>
      )
    }
    if (w.k==='animated'){
      return (
        <button className="btn btn-ghost xs" onClick={()=>{
          const url = prompt('Animated image URL (GIF/MP4):', w.url || '')
          if (url==null) return
          const caption = prompt('Caption:', w.caption || 'Keep going!')
          setConfig(w.id, { url, caption })
        }}>✎</button>
      )
    }
    return null
  }

  // Two-square spacing guideline (visual): keep a generous gap
  // (CSS grid gap handles this neatly for half/full width cards)

  return (
    <div className="widgetsArea" ref={areaRef} style={{position:'relative'}}>
      <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
        <h2>Overview</h2>
        <div className="flex" style={{gap:8}}>
          <button className="btn xs" onClick={reset}>Reset</button>
          <button className="btn btn-primary xs" onClick={()=>setAdding(true)}>＋ Add</button>
        </div>
      </div>

      {showGrid && (
        <div className="fineGrid" aria-hidden="true" style={{position:'absolute', inset:'38px 0 0 0'}}></div>
      )}

      <div className="widgetsGrid" ref={gridRef}>
        {widgets.map((w)=>{
          const def = REGISTRY[w.k]; if(!def) return null
          return (
            <div key={w.id} className={`widgetWrap widget-size-${w.size}`} data-id={w.id}>
              <div className="widgetToolbar glass">
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
                <ConfigButton w={w}/>
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
              {Object.entries(REGISTRY).filter(([k,v])=>v.group==='Core').map(([k,def])=>(
                <button key={k} className="glass card pickBtn" onClick={()=>add(k)}>{def.label}</button>
              ))}
            </div>

            {(user.role!=='student') && (
              <>
                <h4 style={{margin:'14px 0 6px'}}>Staff</h4>
                <div className="widgetPicker">
                  {Object.entries(REGISTRY).filter(([k,v])=>v.group==='Staff').map(([k,def])=>(
                    <button key={k} className="glass card pickBtn" onClick={()=>add(k)}>{def.label}</button>
                  ))}
                </div>
              </>
            )}

            <h4 style={{margin:'14px 0 6px'}}>Personalisation</h4>
            <div className="widgetPicker">
              <button className="glass card pickBtn" onClick={()=>add('quote',{ text:'“Small steps every day.”', author:'Unknown' })}>
                Motivational Quote
              </button>
              <button className="glass card pickBtn" onClick={()=>add('animated',{ url:'', caption:'Keep going!' })}>
                Animated Image
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
