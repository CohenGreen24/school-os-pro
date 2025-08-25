// src/components/MapPanel.jsx
import React from 'react'
import { supabase } from '../supabase'

const MAP_VER = 'v6'
const MAP_URL = `https://awxltfgbgnylacrklmik.supabase.co/storage/v1/object/public/maps/campus-map.png?${MAP_VER}`

function norm([x,y], w, h){ return [x/w, y/h] }
function denorm([nx,ny], w, h){ return [nx*w, ny*h] }

const BUILDINGS = [
  'Building A', 'Building B', 'Building C',
  'Technologies', 'Administration', 'Sports'
]

export default function MapPanel({ user }) {
  const isStaff = ['admin','teacher','wellbeing'].includes(user?.role)
  const imgRef = React.useRef(null)
  const svgRef = React.useRef(null)

  const [areas, setAreas] = React.useState([])   // {id,name,points:[[nx,ny]...]}
  const [sel, setSel] = React.useState('Building A')
  const [editing, setEditing] = React.useState(false)
  const [pointsPx, setPointsPx] = React.useState([]) // current polygon in pixels
  const [search, setSearch] = React.useState('')

  React.useEffect(()=>{ (async()=>{
    const { data } = await supabase.from('school_map_areas').select('id,name,points').order('name')
    setAreas(data||[])
  })() },[])

  // when selection changes, load polygon → px
  React.useEffect(()=>{
    const img = imgRef.current
    if (!img) return
    const found = areas.find(a => a.name===sel)
    const rW = img.clientWidth, rH = img.clientHeight
    if (found?.points?.length) setPointsPx(found.points.map(p => denorm(p, rW, rH)))
    else setPointsPx([])
  }, [sel, areas])

  const onImgLoad = () => {
    // reproject current selection if needed
    const found = areas.find(a => a.name===sel)
    if (!found?.points?.length) return
    const img = imgRef.current
    const rW = img.clientWidth, rH = img.clientHeight
    setPointsPx(found.points.map(p => denorm(p, rW, rH)))
  }

  // Add vertex by clicking on an edge midpoint
  const onSvgClick = (e) => {
    if (!editing) return
    const svg = svgRef.current; if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    // insert at nearest edge
    if (pointsPx.length < 2) { setPointsPx([...pointsPx, [x,y]]); return }
    let bestI=0, bestD=1e12
    for (let i=0;i<pointsPx.length;i++){
      const a = pointsPx[i], b = pointsPx[(i+1)%pointsPx.length]
      const d = pointToSegment(x,y,a,b)
      if (d < bestD){ bestD=d; bestI=i }
    }
    const next = [...pointsPx]
    next.splice(bestI+1, 0, [x,y])
    setPointsPx(next)
  }

  // Drag handles
  const dragIx = React.useRef(-1)
  const onHandleDown = (i) => (e) => {
    if (!editing) return
    dragIx.current = i
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp, { once:true })
  }
  const onMove = (e) => {
    const svg = svgRef.current; if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left, y = e.clientY - rect.top
    setPointsPx(prev => {
      const next=[...prev]; if (dragIx.current>=0) next[dragIx.current]=[x,y]; return next
    })
  }
  const onUp = () => {
    dragIx.current = -1
    window.removeEventListener('pointermove', onMove)
  }

  const undo = () => setPointsPx(p => p.slice(0,-1))
  const clear = () => setPointsPx([])

  const save = async () => {
    const img = imgRef.current; if (!img) return
    if (pointsPx.length < 3) return alert('Add at least 3 points.')
    const normPts = pointsPx.map(p => norm(p, img.clientWidth, img.clientHeight))
    const exists = areas.find(a => a.name===sel)
    try {
      if (exists) {
        await supabase.from('school_map_areas').update({ points: normPts, updated_at: new Date().toISOString() }).eq('id', exists.id)
      } else {
        await supabase.from('school_map_areas').insert({ name: sel, points: normPts })
      }
      const { data } = await supabase.from('school_map_areas').select('id,name,points').order('name')
      setAreas(data||[])
      setEditing(false)
      alert('Saved ✔️')
    } catch (e) {
      console.error(e); alert(e.message || 'Save failed')
    }
  }

  // Find class → focus building (A1→Building A, etc.)
  const findClass = (e) => {
    e.preventDefault()
    const v = (search||'').trim().toUpperCase()
    if (!v) return
    const letter = v[0]
    const map = { A:'Building A', B:'Building B', C:'Building C' }
    if (map[letter]) setSel(map[letter])
  }

  // Render helpers
  const selectedArea = areas.find(a => a.name===sel)
  const imgW = imgRef.current?.clientWidth || 0
  const imgH = imgRef.current?.clientHeight || 0
  const storedPx = (selectedArea?.points||[]).map(p => denorm(p, imgW, imgH))
  const showPx = editing ? pointsPx : storedPx

  return (
    <div className="glass card" style={{padding:10}}>
      <div className="flex" style={{justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8, marginBottom:8}}>
        <div className="flex" style={{gap:8, alignItems:'center'}}>
          <strong>Map</strong>
          <select className="input xs" value={sel} onChange={e=>setSel(e.target.value)}>
            {BUILDINGS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <form onSubmit={findClass} className="flex" style={{gap:6, alignItems:'center'}}>
          <input className="input xs" placeholder="Find class (e.g. A2)" value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="btn xs">Find</button>
        </form>
        {isStaff && (
          <div className="flex" style={{gap:6, alignItems:'center'}}>
            <button className="btn xs" onClick={()=>setEditing(v=>!v)}>{editing?'✅ Done':'✏️ Edit outline'}</button>
            {editing && (
              <>
                <button className="btn xs" type="button" onClick={undo}>Undo</button>
                <button className="btn xs" type="button" onClick={clear}>Clear</button>
                <button className="btn xs btn-primary" type="button" onClick={save}>Save</button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{position:'relative', width:'100%', overflow:'hidden', borderRadius:12}}>
        <img
          ref={imgRef}
          src={MAP_URL}
          alt="School map"
          crossOrigin="anonymous"
          onLoad={onImgLoad}
          style={{ width:'100%', height:'auto', display:'block', userSelect:'none' }}
        />
        <svg
          ref={svgRef}
          onClick={onSvgClick}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', touchAction:'none' }}
        >
          {/* All stored areas (non-selected faint) */}
          {areas.map(a => {
            const pts = a.points?.length ? a.points.map(p=>denorm(p, imgW, imgH)) : []
            if (!pts.length) return null
            const d = 'M ' + pts.map(([x,y])=>`${x},${y}`).join(' L ') + ' Z'
            const isSel = a.name===sel
            return (
              <g key={a.id} className={`building ${isSel ? 'selected' : ''}`} onClick={()=>setSel(a.name)} style={{cursor:'pointer'}}>
                <path d={d}
                      fill={isSel ? 'rgba(14,165,233,.25)' : 'rgba(255,255,255,.2)'}
                      stroke={isSel ? 'rgba(14,165,233,.9)' : 'rgba(0,0,0,.4)'}
                      strokeWidth={isSel ? 3 : 1.5}/>
              </g>
            )
          })}

          {/* Editing overlay for selected */}
          {editing && showPx.length>0 && (
            <>
              <polyline
                points={showPx.map(([x,y])=>`${x},${y}`).join(' ')}
                fill="rgba(14,165,233,.15)"
                stroke="rgba(14,165,233,1)"
                strokeWidth="2"
              />
              {showPx.map(([x,y],i)=>(
                <g key={i}>
                  <circle cx={x} cy={y} r="5" fill="#0ea5e9" style={{cursor:'grab'}} onPointerDown={onHandleDown(i)}/>
                </g>
              ))}
            </>
          )}
        </svg>
      </div>

      <div className="small" style={{marginTop:8, opacity:.85}}>
        Tip: In edit mode, **click the outline** to add a new vertex; **drag blue nodes** to adjust; Save when done.
      </div>
    </div>
  )
}

/* distance from point to segment helper */
function pointToSegment(px, py, [x1,y1], [x2,y2]){
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1
  const dot = A*C + B*D
  const len_sq = C*C + D*D
  let t = len_sq ? dot / len_sq : -1
  t = Math.max(0, Math.min(1, t))
  const x = x1 + t*C, y = y1 + t*D
  const dx = px - x, dy = py - y
  return Math.hypot(dx, dy)
}
