// src/components/MapPanel.jsx
import React from 'react'
import { supabase } from '../supabase'

/** Cache-busted map URL (bump VER when you replace the image) */
const MAP_VER = 'v5'
const MAP_URL = `https://awxltfgbgnylacrklmik.supabase.co/storage/v1/object/public/maps/campus-map.png?${MAP_VER}`

function normPoint(x, y, w, h) { return [x / w, y / h] }
function denormPoint(nx, ny, w, h) { return [nx * w, ny * h] }

export default function MapPanel({ user }) {
  const isStaff = user?.role && user.role !== 'student'

  const [areas, setAreas] = React.useState([])
  const [selected, setSelected] = React.useState(null)
  const [currentBuilding, setCurrentBuilding] = React.useState('Building A')
  const [edgeSnap, setEdgeSnap] = React.useState(false)

  const [previewPts, setPreviewPts] = React.useState([]) // points in rendered px
  const [imgOk, setImgOk] = React.useState(true)

  const imgRef = React.useRef(null)
  const svgRef = React.useRef(null)

  // gradient magnitude cache (rendered size)
  const [grad, setGrad] = React.useState(null) // {w,h,data:Float32Array, max:number}

  React.useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('school_map_areas')
        .select('id,name,points,center_x,center_y,info')
        .order('name', { ascending: true })
      if (!error && Array.isArray(data)) setAreas(data)
    })()
  }, [])

  const computeGradient = () => {
    const img = imgRef.current
    if (!img) return
    const w = img.clientWidth, h = img.clientHeight
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, w, h)
    const imgData = ctx.getImageData(0,0,w,h)
    const g = sobelMagnitude(imgData, w, h)
    setGrad(g)
  }

  const onImgLoad = () => { setImgOk(true); setTimeout(computeGradient, 0) }
  const onImgErr  = () => setImgOk(false)

  // helpers
  const toPixels = (normPts) => {
    const img = imgRef.current
    if (!img || !normPts?.length) return []
    const rW = img.clientWidth, rH = img.clientHeight
    return normPts.map(([nx, ny]) => denormPoint(nx, ny, rW, rH))
  }
  const centerPx = (area) => {
    const img = imgRef.current; if (!img) return [0,0]
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

  // Edge-snap click handler
  const onMapPointerDown = (e) => {
    if (!edgeSnap) return
    const svg = svgRef.current
    if (!svg || !grad) return
    const pt = ('clientX' in e) ? e : (e.touches ? e.touches[0] : null)
    if (!pt) return
    const rect = svg.getBoundingClientRect()
    const x = Math.round(pt.clientX - rect.left)
    const y = Math.round(pt.clientY - rect.top)
    const snapped = snapToEdge(grad, x, y, 22) // search radius ~ 22px
    if (!snapped) return
    setPreviewPts(prev => [...prev, snapped])
  }

  const undo = () => setPreviewPts(p => p.slice(0, -1))
  const clear = () => setPreviewPts([])
  const save = async () => {
    const img = imgRef.current
    if (!img || previewPts.length < 3) return alert('Add at least 3 points.')
    const rW = img.clientWidth, rH = img.clientHeight
    const norm = previewPts.map(([x, y]) => normPoint(x, y, rW, rH))
    const existing = areas.find(a => a.name === currentBuilding)
    try {
      if (existing) {
        const { error } = await supabase
          .from('school_map_areas')
          .update({ points: norm, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('school_map_areas')
          .insert({ name: currentBuilding, points: norm })
        if (error) throw error
      }
      setPreviewPts([])
      const { data } = await supabase.from('school_map_areas')
        .select('id,name,points').order('name')
      setAreas(data || [])
      alert(`Saved outline for ${currentBuilding}`)
    } catch (e) {
      console.error(e)
      alert(e.message || 'Save failed')
    }
  }

  return (
    <div className="glass card" style={{padding:10}}>
      <div className="flex" style={{justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:8}}>
        <div className="flex" style={{gap:8, alignItems:'center'}}>
          <strong>Map</strong>
        </div>
        {isStaff && (
          <div className="flex" style={{gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <select className="input xs" value={currentBuilding} onChange={e=>setCurrentBuilding(e.target.value)}>
              <option>Building A</option>
              <option>Building B</option>
              <option>Building C</option>
              <option>Technologies</option>
              <option>Administration</option>
              <option>Sports</option>
            </select>
            <button className="btn xs" onClick={()=> setEdgeSnap(v=>!v)}>
              {edgeSnap ? '✅ Edge-Snap On' : '✨ Edge-Snap'}
            </button>
            {edgeSnap && (
              <>
                <button className="btn xs" onClick={undo} type="button">Undo</button>
                <button className="btn xs" onClick={clear} type="button">Clear</button>
                <button className="btn xs btn-primary" onClick={save} type="button">Save</button>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{position:'relative', width:'100%', overflow:'hidden', borderRadius:12}}>
        {!imgOk && <div className="glass card small" style={{marginBottom:6, color:'#ef4444'}}>Image failed to load.</div>}
        <img
          ref={imgRef}
          src={MAP_URL}
          alt="School map"
          crossOrigin="anonymous"
          onLoad={onImgLoad}
          onError={onImgErr}
          style={{ width:'100%', height:'auto', display:'block', userSelect:'none' }}
        />
        <svg
          ref={svgRef}
          onPointerDown={onMapPointerDown}
          style={{
            position:'absolute', inset:0, width:'100%', height:'100%',
            pointerEvents: edgeSnap ? 'auto' : 'none',
            cursor: edgeSnap ? 'crosshair' : 'default',
            touchAction:'none'
          }}
        >
          {/* Stored polygons */}
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
                  fill={active ? 'var(--map-fill-active)' : 'var(--map-fill)'}
                  stroke={active ? 'var(--map-stroke-active)' : 'var(--map-stroke)'}
                  strokeWidth={active ? 3 : 2}
                />
                <foreignObject x={cx-60} y={cy-16} width="120" height="32" style={{ pointerEvents:'none' }}>
                  <div className="badge" style={{ justifyContent:'center', fontWeight:700, textAlign:'center' }}>{a.name}</div>
                </foreignObject>
              </g>
            )
          })}

          {/* Edge-snap preview polyline */}
          {previewPts.length>0 && (
            <>
              <polyline
                points={previewPts.map(([x,y])=>`${x},${y}`).join(' ')}
                fill="rgba(14,165,233,0.15)"
                stroke="rgba(14,165,233,1)"
                strokeWidth="2"
              />
              {previewPts.map(([x,y],i)=>(
                <circle key={i} cx={x} cy={y} r="4" fill="rgba(14,165,233,1)" />
              ))}
            </>
          )}
        </svg>
      </div>

      {isStaff && (
        <div className="small" style={{marginTop:8,opacity:.8}}>
          Edge-Snap: click around the building corners (3–8 clicks). Points snap to the nearest edge. Use <b>Undo</b>/<b>Clear</b>, then <b>Save</b>.
        </div>
      )}
    </div>
  )
}

/* ---------- image gradient + snap helpers (no libs) ---------- */
function sobelMagnitude(imgData, w, h) {
  // grayscale already (we’ll compute from RGB)
  const { data } = imgData
  const gray = new Float32Array(w*h)
  for (let i=0, p=0; i<data.length; i+=4, p++){
    const r=data[i], g=data[i+1], b=data[i+2]
    gray[p] = 0.299*r + 0.587*g + 0.114*b
  }
  const G = new Float32Array(w*h)
  let max = 0
  // Sobel kernels
  const gx = [-1,0,1, -2,0,2, -1,0,1]
  const gy = [-1,-2,-1, 0,0,0, 1,2,1]
  for (let y=1; y<h-1; y++){
    for (let x=1; x<w-1; x++){
      let sx=0, sy=0
      let k=0
      for (let j=-1;j<=1;j++){
        for (let i=-1;i<=1;i++){
          const v = gray[(y+j)*w + (x+i)]
          sx += v * gx[k]
          sy += v * gy[k]
          k++
        }
      }
      const mag = Math.hypot(sx, sy)
      G[y*w + x] = mag
      if (mag>max) max=mag
    }
  }
  return { w, h, data: G, max }
}

function snapToEdge(grad, x, y, radius=20) {
  const { w, h, data } = grad
  let best = null, bestVal = -1
  const x0 = Math.max(1, x - radius), x1 = Math.min(w-2, x + radius)
  const y0 = Math.max(1, y - radius), y1 = Math.min(h-2, y + radius)
  for (let j=y0; j<=y1; j++){
    for (let i=x0; i<=x1; i++){
      const v = data[j*w + i]
      if (v > bestVal) { bestVal = v; best = [i,j] }
    }
  }
  return best
}
