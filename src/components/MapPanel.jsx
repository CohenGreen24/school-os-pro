// src/components/MapPanel.jsx
import React from 'react'
import { supabase } from '../supabase'

/** 🔧 SET THIS to your uploaded Storage public URL */
const MAP_URL = 'https://YOUR-PROJECT.supabase.co/storage/v1/object/public/maps/campus-map.png'

/** Map class codes to building names */
function buildingFromClass(codeRaw='') {
  const code = codeRaw.trim().toLowerCase()
  if (!code) return null
  // A1..A8
  if (/^a\d{1,2}$/.test(code)) return 'Building A'
  if (/^b\d{1,2}$/.test(code)) return 'Building B'
  if (/^c\d{1,2}$/.test(code)) return 'Building C'
  // technologies / labs
  if (code.startsWith('tech') || code.startsWith('t ')) return 'Technologies'
  if (code.includes('lab')) return 'Technologies'
  // admin
  if (code.includes('admin') || code.includes('principal') || code.includes('student services')) return 'Administration'
  // sports
  if (code.includes('gym') || code.includes('studio') || code.includes('storage') || code.includes('sports')) return 'Sports'
  return null
}

/** Utility: normalize [x,y] to [0..1] based on image natural size */
function normPoint(x, y, w, h) { return [x / w, y / h] }
function denormPoint(nx, ny, w, h) { return [nx * w, ny * h] }

export default function MapPanel({ user }) {
  const [imgDim, setImgDim] = React.useState({ w: 0, h: 0 })
  const [areas, setAreas] = React.useState([]) // [{id,name,points,center_x,center_y,info}]
  const [selected, setSelected] = React.useState(null) // name
  const [search, setSearch] = React.useState('')

  // Draw mode (staff only)
  const isStaff = user?.role && user.role !== 'student'
  const [drawMode, setDrawMode] = React.useState(false)
  const [drawingFor, setDrawingFor] = React.useState('Building A')
  const [points, setPoints] = React.useState([]) // working points in *pixel space* during draw
  const imgRef = React.useRef(null)
  const svgRef = React.useRef(null)

  // Load existing shapes
  const loadAreas = React.useCallback(async () => {
    const { data, error } = await supabase
      .from('school_map_areas')
      .select('id,name,points,center_x,center_y,info')
      .order('name', { ascending: true })
    if (!error && Array.isArray(data)) setAreas(data)
  }, [])
  React.useEffect(() => { loadAreas() }, [loadAreas])

  // Handle image natural size
  const onImgLoad = (e) => {
    const img = e.target
    setImgDim({ w: img.naturalWidth, h: img.naturalHeight })
  }

  // Convert stored normalized points into pixel coords (for current rendered size)
  const getPolyPixels = (pts) => {
    const img = imgRef.current
    if (!img || !pts || !imgDim.w || !imgDim.h) return []
    const rW = img.clientWidth
    const rH = img.clientHeight
    return pts.map(([nx, ny]) => {
      const [px, py] = denormPoint(nx, ny, rW, rH)
      return [px, py]
    })
  }

  // Click on image to add points (draw mode)
  const onSvgClick = (e) => {
    if (!drawMode) return
    const svg = svgRef.current
    const img = imgRef.current
    if (!svg || !img) return
    const rect = svg.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPoints(prev => [...prev, [x, y]])
  }

  const undoPoint = () => setPoints(p => p.slice(0, -1))
  const clearPoints = () => setPoints([])

  const savePolygon = async () => {
    const img = imgRef.current
    if (!img || !imgDim.w || !imgDim.h || points.length < 3) {
      alert('Add at least 3 points.')
      return
    }
    // normalize against *rendered* size to be resolution-agnostic
    const rW = img.clientWidth, rH = img.clientHeight
    const norm = points.map(([x, y]) => normPoint(x, y, rW, rH))

    const existing = areas.find(a => a.name === drawingFor)
    if (existing) {
      const { error } = await supabase
        .from('school_map_areas')
        .update({ points: norm, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await supabase
        .from('school_map_areas')
        .insert({ name: drawingFor, points: norm })
      if (error) { alert(error.message); return }
    }
    clearPoints()
    await loadAreas()
    alert('Saved!')
  }

  // Search & select
  const onSearchGo = (e) => {
    e.preventDefault()
    const b = buildingFromClass(search)
    if (b) setSelected(b)
  }

  // Tooltip/label center
  const getCenterPx = (area) => {
    const img = imgRef.current
    if (!img) return [0,0]
    const rW = img.clientWidth, rH = img.clientHeight
    if (area.center_x != null && area.center_y != null) {
      return denormPoint(Number(area.center_x), Number(area.center_y), rW, rH)
    }
    // fallback: average polygon
    if (Array.isArray(area.points) && area.points.length) {
      const xs = area.points.map(p => p[0])
      const ys = area.points.map(p => p[1])
      const cx = xs.reduce((a,b)=>a+b,0)/xs.length
      const cy = ys.reduce((a,b)=>a+b,0)/ys.length
      return denormPoint(cx, cy, rW, rH)
    }
    return [0,0]
  }

  // Denormalized polygons for render
  const renderPolys = areas.map(a => ({
    ...a,
    pix: getPolyPixels(a.points || [])
  }))

  return (
    <div className="glass card" style={{ padding: 10 }}>
      {/* Top row: search + draw controls */}
      <div className="flex" style={{ justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:8 }}>
        <form className="flex" onSubmit={onSearchGo} style={{ gap:8 }}>
          <input
            className="input"
            placeholder="Find class or area (e.g., A2, Tech 1, Gym 1, Admin)"
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{ width: 320 }}
          />
          <button className="btn btn-primary">Find</button>
        </form>

        {isStaff && (
          <div className="flex" style={{ gap:8 }}>
            <button className="btn xs" onClick={()=>setDrawMode(m=>!m)}>
              {drawMode ? '✅ Finish Draw' : '✏️ Draw Mode'}
            </button>
            <select
              className="input xs"
              value={drawingFor}
              onChange={e=>setDrawingFor(e.target.value)}
              style={{ width:180 }}
              title="Which building are you outlining?"
            >
              <option>Building A</option>
              <option>Building B</option>
              <option>Building C</option>
              <option>Technologies</option>
              <option>Administration</option>
              <option>Sports</option>
            </select>
            {drawMode && (
              <>
                <button className="btn xs" onClick={undoPoint} type="button">Undo point</button>
                <button className="btn xs" onClick={clearPoints} type="button">Clear</button>
                <button className="btn xs btn-primary" onClick={savePolygon} type="button">Save polygon</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Image + SVG overlay */}
      <div style={{ position:'relative', width:'100%', overflow:'hidden', borderRadius:12 }}>
        <img
          src={MAP_URL}
          alt="School map"
          ref={imgRef}
          onLoad={onImgLoad}
          style={{ width:'100%', height:'auto', display:'block', userSelect:'none' }}
        />
        <svg
          ref={svgRef}
          onClick={onSvgClick}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents: drawMode ? 'auto':'none' }}
        >
          {/* Existing saved polygons */}
          {renderPolys.map(a => {
            if (!a.pix.length) return null
            const d = 'M ' + a.pix.map(([x,y])=>`${x},${y}`).join(' L ') + ' Z'
            const active = selected === a.name
            return (
              <g key={a.id} className={`building ${active ? 'selected' : ''}`} onClick={(e)=>{ e.stopPropagation(); setSelected(a.name) }} style={{ pointerEvents:'auto', cursor:'pointer' }}>
                <path d={d}
                  fill={active ? 'rgba(14,165,233,0.25)' : 'rgba(255,255,255,0.22)'}
                  stroke={active ? 'rgba(14,165,233,0.9)' : 'rgba(0,0,0,0.35)'}
                  strokeWidth={active ? 3 : 2}
                />
                {/* Label */}
                <foreignObject x={getCenterPx(a)[0]-60} y={getCenterPx(a)[1]-16} width="120" height="32" style={{ pointerEvents:'none' }}>
                  <div className="badge" style={{ justifyContent:'center', fontWeight:700, textAlign:'center' }}>{a.name}</div>
                </foreignObject>
              </g>
            )
          })}

          {/* Drawing preview (current polygon) */}
          {drawMode && points.length > 0 && (
            <>
              <polyline
                points={points.map(([x,y])=>`${x},${y}`).join(' ')}
                fill="rgba(14,165,233,0.18)"
                stroke="rgba(14,165,233,1)"
                strokeWidth="2"
              />
              {points.map(([x,y],i)=>(
                <circle key={i} cx={x} cy={y} r="4" fill="rgba(14,165,233,1)" />
              ))}
            </>
          )}
        </svg>
      </div>

      {/* Selected info */}
      <div style={{ marginTop:8 }}>
        {selected ? (
          <div className="small">Selected: <b>{selected}</b></div>
        ) : (
          <div className="small" style={{ opacity:.8 }}>Tip: search a class (e.g., <code>A3</code>) or tap a building.</div>
        )}
      </div>

      {/* Quick actions for common rooms */}
      <div className="flex" style={{ marginTop:8, flexWrap:'wrap', gap:6 }}>
        {['Building A','Building B','Building C','Technologies','Administration','Sports'].map(n=>(
          <button key={n} className="btn xs" onClick={()=>setSelected(n)}>{n}</button>
        ))}
      </div>
    </div>
  )
}
