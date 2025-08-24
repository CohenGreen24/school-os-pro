// src/components/MapPanel.jsx
import React from 'react'
import { supabase } from '../supabase'

/** ✅ Your actual public URL (no storage calls needed) */
const MAP_URL = 'https://awxltfgbgnylacrklmik.supabase.co/storage/v1/object/public/maps/campus-map.png'

/** Class code → building */
function buildingFromClass(codeRaw='') {
  const code = codeRaw.trim().toLowerCase()
  if (!code) return null
  if (/^a\d{1,2}$/.test(code)) return 'Building A'
  if (/^b\d{1,2}$/.test(code)) return 'Building B'
  if (/^c\d{1,2}$/.test(code)) return 'Building C'
  if (code.startsWith('tech') || code.includes('technolog')) return 'Technologies'
  if (code.includes('lab')) return 'Technologies'
  if (code.includes('admin') || code.includes('principal') || code.includes('student services') || code.includes('meeting')) return 'Administration'
  if (code.includes('gym') || code.includes('studio') || code.includes('storage') || code.includes('sports')) return 'Sports'
  return null
}

function normPoint(x, y, w, h) { return [x / w, y / h] }
function denormPoint(nx, ny, w, h) { return [nx * w, ny * h] }

export default function MapPanel({ user }) {
  const [imgDim, setImgDim] = React.useState({ w:0, h:0 })
  const [imgOk, setImgOk]   = React.useState(true)
  const [areas, setAreas]   = React.useState([])   // [{id,name,points[],center_x,center_y,info}]
  const [selected, setSelected] = React.useState(null)
  const [search, setSearch] = React.useState('')

  const isStaff = user?.role && user.role !== 'student'
  const [drawMode, setDrawMode] = React.useState(false)
  const [drawingFor, setDrawingFor] = React.useState('Building A')
  const [points, setPoints] = React.useState([])   // current polygon in rendered (px) space

  const imgRef = React.useRef(null)
  const svgRef = React.useRef(null)

  // Load saved polygons
  const loadAreas = React.useCallback(async () => {
    const { data, error } = await supabase
      .from('school_map_areas')
      .select('id,name,points,center_x,center_y,info')
      .order('name', { ascending: true })
    if (!error && Array.isArray(data)) setAreas(data)
  }, [])
  React.useEffect(() => { loadAreas() }, [loadAreas])

  const onImgLoad = (e) => {
    const img = e.target
    setImgDim({ w: img.naturalWidth, h: img.naturalHeight })
    setImgOk(true)
  }
  const onImgErr = () => setImgOk(false)

  // Denormalize stored points to pixel coords for current render size
  const toPixels = (normPts) => {
    const img = imgRef.current
    if (!img || !normPts?.length) return []
    const rW = img.clientWidth, rH = img.clientHeight
    return normPts.map(([nx, ny]) => denormPoint(nx, ny, rW, rH))
  }

  // Draw mode: click to add points
  const onSvgClick = (e) => {
    if (!drawMode) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPoints(prev => [...prev, [x, y]])
  }
  const undoPoint  = () => setPoints(p => p.slice(0, -1))
  const clearPoints= () => setPoints([])
  const savePolygon = async () => {
    const img = imgRef.current
    if (!img || points.length < 3) return alert('Add at least 3 points.')
    const rW = img.clientWidth, rH = img.clientHeight
    const norm = points.map(([x, y]) => normPoint(x, y, rW, rH))

    const existing = areas.find(a => a.name === drawingFor)
    if (existing) {
      const { error } = await supabase
        .from('school_map_areas')
        .update({ points: norm, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) return alert(error.message)
    } else {
      const { error } = await supabase
        .from('school_map_areas')
        .insert({ name: drawingFor, points: norm })
      if (error) return alert(error.message)
    }
    clearPoints()
    await loadAreas()
    alert('Saved!')
  }

  // Search → select building
  const onSearchGo = (e) => {
    e.preventDefault()
    const b = buildingFromClass(search)
    if (b) setSelected(b)
  }

  // Center for label
  const centerPx = (area) => {
    const img = imgRef.current
    if (!img) return [0,0]
    const rW = img.clientWidth, rH = img.clientHeight
    if (area.center_x != null && area.center_y != null) {
      return denormPoint(Number(area.center_x), Number(area.center_y), rW, rH)
    }
    if (Array.isArray(area.points) && area.points.length) {
      const xs = area.points.map(p => p[0])
      const ys = area.points.map(p => p[1])
      const cx = xs.reduce((a,b)=>a+b,0)/xs.length
      const cy = ys.reduce((a,b)=>a+b,0)/ys.length
      return denormPoint(cx, cy, rW, rH)
    }
    return [0,0]
  }

  const renderPolys = areas.map(a => ({ ...a, pix: toPixels(a.points || []) }))

  return (
    <div className="glass card" style={{ padding: 10 }}>
      {/* Controls */}
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
                <button className="btn xs" onClick={undoPoint} type="button">Undo</button>
                <button className="btn xs" onClick={clearPoints} type="button">Clear</button>
                <button className="btn xs btn-primary" onClick={savePolygon} type="button">Save</button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div style={{ position:'relative', width:'100%', overflow:'hidden', borderRadius:12 }}>
        {!imgOk && (
          <div className="glass card small" style={{ marginBottom:6, color:'#ef4444' }}>
            Image failed to load. Check URL and that the bucket/file are public.
          </div>
        )}
        <img
          ref={imgRef}
          src={MAP_URL}
          alt="School map"
          onLoad={onImgLoad}
          onError={onImgErr}
          style={{ width:'100%', height:'auto', display:'block', userSelect:'none' }}
        />
        <svg
          ref={svgRef}
          onClick={onSvgClick}
          style={{ position:'absolute', inset:0, width:'100%', height:'100%', pointerEvents: drawMode ? 'auto':'none' }}
        >
          {renderPolys.map(a => {
            if (!a.pix.length) return null
            const d = 'M ' + a.pix.map(([x,y])=>`${x},${y}`).join(' L ') + ' Z'
            const active = selected === a.name
            const [cx, cy] = centerPx(a)
            return (
              <g key={a.id} className={`building ${active ? 'selected' : ''}`}
                 onClick={(e)=>{ e.stopPropagation(); setSelected(a.name) }}
                 style={{ pointerEvents:'auto', cursor:'pointer' }}>
                <path d={d}
                  fill={active ? 'rgba(14,165,233,0.25)' : 'rgba(255,255,255,0.22)'}
                  stroke={active ? 'rgba(14,165,233,0.9)' : 'rgba(0,0,0,0.35)'}
                  strokeWidth={active ? 3 : 2}
                />
                <foreignObject x={cx-60} y={cy-16} width="120" height="32" style={{ pointerEvents:'none' }}>
                  <div className="badge" style={{ justifyContent:'center', fontWeight:700, textAlign:'center' }}>
                    {a.name}
                  </div>
                </foreignObject>
              </g>
            )
          })}

          {/* Drawing preview */}
          {drawMode && points.length > 0 && (
            <>
              <polyline
                points={points.map(([x,y])=>`${x},${y}`).join(' ')}
                fill="rgba(14,165,233,0.18)"
                stroke="rgba(14,165,233,1)" strokeWidth="2"
              />
              {points.map(([x,y],i)=>(
                <circle key={i} cx={x} cy={y} r="4" fill="rgba(14,165,233,1)" />
              ))}
            </>
          )}
        </svg>
      </div>

      <div style={{ marginTop:8 }}>
        {selected
          ? <div className="small">Selected: <b>{selected}</b></div>
          : <div className="small" style={{ opacity:.8 }}>Tip: search a class (e.g., <code>A3</code>) or tap a building.</div>}
      </div>

      <div className="flex" style={{ marginTop:8, flexWrap:'wrap', gap:6 }}>
        {['Building A','Building B','Building C','Technologies','Administration','Sports'].map(n=>(
          <button key={n} className="btn xs" onClick={()=>setSelected(n)}>{n}</button>
        ))}
      </div>
    </div>
  )
}
