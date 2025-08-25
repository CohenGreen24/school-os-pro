// src/components/MapPanel.jsx
import React from 'react'
import { supabase } from '../supabase'

/** ✅ Your public map URL */
const MAP_URL = 'https://awxltfgbgnylacrklmik.supabase.co/storage/v1/object/public/maps/campus-map.png'

/** Class code → building name */
function buildingFromClass(codeRaw='') {
  const code = codeRaw.trim().toLowerCase()
  if (!code) return null
  if (/^a\d{1,2}$/.test(code)) return 'Building A'
  if (/^b\d{1,2}$/.test(code)) return 'Building B'
  if (/^c\d{1,2}$/.test(code)) return 'Building C'
  if (code.startsWith('tech') || code.includes('technolog') || code.includes('lab')) return 'Technologies'
  if (code.includes('admin') || code.includes('principal') || code.includes('student services') || code.includes('meeting')) return 'Administration'
  if (code.includes('gym') || code.includes('studio') || code.includes('storage') || code.includes('sports')) return 'Sports'
  return null
}

function normPoint(x, y, w, h) { return [x / w, y / h] }
function denormPoint(nx, ny, w, h) { return [nx * w, ny * h] }

/** Wait for OpenCV to be ready (loaded via <script>) */
function useOpenCV() {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => {
    let mounted = true
    const tick = () => {
      // opencv.js signals onRuntimeInitialized, but polling is simple & robust here
      if (window.cv && window.cv.Mat) { mounted && setReady(true) }
      else setTimeout(tick, 120)
    }
    tick()
    return () => { mounted = false }
  }, [])
  return ready
}

export default function MapPanel({ user }) {
  const [areas, setAreas] = React.useState([])
  const [selected, setSelected] = React.useState(null)
  const [search, setSearch] = React.useState('')

  const isStaff = user?.role && user.role !== 'student'

  // Simple per-building workflow
  const [currentBuilding, setCurrentBuilding] = React.useState('Building A')
  const [autoMode, setAutoMode] = React.useState(false)         // “Auto Detect” on/off
  const [edgeSens, setEdgeSens] = React.useState(120)           // Canny high threshold (low = high/2)
  const [previewPts, setPreviewPts] = React.useState(null)      // [[x,y], ...] in rendered px

  const [imgOk, setImgOk] = React.useState(true)
  const imgRef = React.useRef(null)
  const svgRef = React.useRef(null)
  const cvReady = useOpenCV()

  // Load saved polygons
  const loadAreas = React.useCallback(async () => {
    const { data, error } = await supabase
      .from('school_map_areas')
      .select('id,name,points,center_x,center_y,info')
      .order('name', { ascending: true })
    if (!error && Array.isArray(data)) setAreas(data)
  }, [])
  React.useEffect(() => { loadAreas() }, [loadAreas])

  const onImgLoad = () => setImgOk(true)
  const onImgErr  = () => setImgOk(false)

  // Convert stored normalized coords → current px
  const toPixels = (normPts) => {
    const img = imgRef.current
    if (!img || !normPts?.length) return []
    const rW = img.clientWidth, rH = img.clientHeight
    return normPts.map(([nx, ny]) => denormPoint(nx, ny, rW, rH))
  }
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

  /* ------------------------------------------------------------------
     AUTO-DETECT: Click inside a building → detect black-edge contour
     Algorithm:
      1) Draw the rendered <img> to a canvas sized to rendered pixels.
      2) Canny edge detection (low=high/2).
      3) Find all external contours.
      4) Pick the contour whose polygon contains the click point; if
         several, choose the largest by area (most building-like).
      5) Approximate polygon (approxPolyDP) for neatness.
      6) Preview (cyan). “Save to Building” commits to DB (normalized).
  ------------------------------------------------------------------- */
  const onMapClick = (e) => {
    if (!autoMode || !cvReady) return
    const svg = svgRef.current
    const img = imgRef.current
    if (!svg || !img) return

    const rect = svg.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top

    try {
      const rW = img.clientWidth, rH = img.clientHeight

      // Draw rendered image to canvas
      const canvas = document.createElement('canvas')
      canvas.width = rW; canvas.height = rH
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      ctx.drawImage(img, 0, 0, rW, rH)

      const cv = window.cv
      let src = cv.imread(canvas)
      let gray = new cv.Mat()
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0)

      // Slight blur then edges
      let blur = new cv.Mat()
      cv.GaussianBlur(gray, blur, new cv.Size(3,3), 0, 0)

      const high = Math.max(30, Math.min(255, Number(edgeSens)))
      const low  = Math.floor(high / 2)
      let edges = new cv.Mat()
      cv.Canny(blur, edges, low, high)

      // Find contours
      let contours = new cv.MatVector()
      let hierarchy = new cv.Mat()
      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

      if (contours.size() === 0) {
        setPreviewPts(null)
        alert('No edges found here. Try clicking closer to the building interior or raise sensitivity.')
      } else {
        // Choose contour that contains the click (point-in-polygon test)
        let bestIdx = -1, bestArea = 0
        for (let i = 0; i < contours.size(); i++) {
          const cnt = contours.get(i)
          // cv.pointPolygonTest needs a contour; build a MatOfPoint2f if needed
          const inside = cv.pointPolygonTest(cnt, new cv.Point(x, y), false)
          if (inside >= 0) {
            const area = cv.contourArea(cnt)
            if (area > bestArea) { bestArea = area; bestIdx = i }
          }
        }

        if (bestIdx < 0) {
          // As fallback: pick the nearest contour by distance (abs pointPolygonTest value minimal)
          let minDist = Infinity, minIdx = -1
          for (let i = 0; i < contours.size(); i++) {
            const cnt = contours.get(i)
            const dist = Math.abs(cv.pointPolygonTest(cnt, new cv.Point(x, y), true))
            if (dist < minDist) { minDist = dist; minIdx = i }
          }
          bestIdx = minIdx
        }

        if (bestIdx < 0) {
          setPreviewPts(null)
          alert('Could not associate your click with a shape. Try again with a different point/sensitivity.')
        } else {
          const cnt = contours.get(bestIdx)
          const peri = cv.arcLength(cnt, true)
          const eps  = Math.max(1, 0.015 * peri)   // ~1.5% simplification
          let approx = new cv.Mat()
          cv.approxPolyDP(cnt, approx, eps, true)

          const pts = []
          for (let i = 0; i < approx.rows; i++) {
            const p = approx.intPtr(i)
            pts.push([p[0], p[1]])  // already in rendered px
          }
          setPreviewPts(pts)
        }
      }

      // Cleanup
      gray.delete(); blur.delete(); edges.delete(); contours.delete(); hierarchy.delete(); src.delete()
    } catch (err) {
      console.error(err)
      alert('Auto-detect failed here. Try a different click or adjust sensitivity.')
    }
  }

  const savePreviewToBuilding = async () => {
    const img = imgRef.current
    if (!img || !previewPts || previewPts.length < 3) return
    const rW = img.clientWidth, rH = img.clientHeight
    const norm = previewPts.map(([x, y]) => normPoint(x, y, rW, rH))

    const existing = areas.find(a => a.name === currentBuilding)
    if (existing) {
      const { error } = await supabase
        .from('school_map_areas')
        .update({ points: norm, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) return alert(error.message)
    } else {
      const { error } = await supabase
        .from('school_map_areas')
        .insert({ name: currentBuilding, points: norm })
      if (error) return alert(error.message)
    }
    setPreviewPts(null)
    await loadAreas()
    alert(`Saved outline for ${currentBuilding}`)
  }

  return (
    <div className="glass card" style={{ padding: 10 }}>
      {/* Top controls */}
      <div className="flex" style={{ justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:8 }}>
        {/* Quick finder (unchanged) */}
        <form className="flex" onSubmit={(e)=>{e.preventDefault(); const b=buildingFromClass(search); if(b) setSelected(b)}} style={{ gap:8 }}>
          <input
            className="input"
            placeholder="Find class or area (e.g., A2, Tech 1, Gym 1, Admin)"
            value={search}
            onChange={e=>setSearch(e.target.value)}
            style={{ width: 320 }}
          />
          <button className="btn btn-primary" type="submit">Find</button>
        </form>

        {/* Staff: simple per-building detection */}
        {isStaff && (
          <div className="flex" style={{ gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <select
              className="input xs"
              value={currentBuilding}
              onChange={e=>setCurrentBuilding(e.target.value)}
              title="Select building to save into"
            >
              <option>Building A</option>
              <option>Building B</option>
              <option>Building C</option>
              <option>Technologies</option>
              <option>Administration</option>
              <option>Sports</option>
            </select>

            <button
              className="btn xs"
              onClick={()=> setAutoMode(m=>!m)}
              title="Click inside a building to auto-detect edges"
              disabled={!cvReady}
            >
              {autoMode ? '✅ Auto Detect On' : '✨ Auto Detect'}
            </button>

            <label className="small" title="Higher = find more edges">
              Edge sensitivity: {edgeSens}
              <input
                type="range" min="40" max="220" step="5"
                value={edgeSens} onChange={e=>setEdgeSens(e.target.value)}
                style={{ verticalAlign:'middle', marginLeft: 8 }}
              />
            </label>

            {previewPts && (
              <>
                <button className="btn xs btn-primary" onClick={savePreviewToBuilding}>
                  Save to {currentBuilding}
                </button>
                <button className="btn xs" onClick={()=>setPreviewPts(null)}>Discard</button>
              </>
            )}
            {!cvReady && <span className="small" style={{opacity:.8}}>Loading OpenCV…</span>}
          </div>
        )}
      </div>

      {/* Map + overlay */}
      <div style={{ position:'relative', width:'100%', overflow:'hidden', borderRadius:12 }}>
        {!imgOk && (
          <div className="glass card small" style={{ marginBottom:6, color:'#ef4444' }}>
            Image failed to load. Check MAP_URL.
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
          onClick={onMapClick}
          style={{
            position:'absolute', inset:0, width:'100%', height:'100%',
            pointerEvents: autoMode ? 'auto' : 'none', /* only capture clicks in auto mode */
            cursor: autoMode ? 'crosshair' : 'default'
          }}
        >
          {/* Saved polygons */}
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
                  <div className="badge" style={{ justifyContent:'center', fontWeight:700, textAlign:'center' }}>{a.name}</div>
                </foreignObject>
              </g>
            )
          })}

          {/* Preview of detected polygon (cyan) */}
          {previewPts && previewPts.length>2 && (
            <>
              <polyline
                points={previewPts.map(([x,y])=>`${x},${y}`).join(' ')}
                fill="rgba(14,165,233,0.18)"
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

      {/* Helper text */}
      {isStaff && (
        <div className="small" style={{ marginTop:8, opacity:.8 }}>
          {autoMode
            ? <>Click <b>inside</b> the {currentBuilding} shape. Adjust sensitivity if needed, then <b>Save</b>.</>
            : <>To outline a building fast, choose it then click <b>Auto Detect</b>, and click inside the building.</>}
        </div>
      )}

      {/* Quick select buttons for students */}
      <div className="flex" style={{ marginTop:8, flexWrap:'wrap', gap:6 }}>
        {['Building A','Building B','Building C','Technologies','Administration','Sports'].map(n=>(
          <button key={n} className="btn xs" onClick={()=>setSelected(n)}>{n}</button>
        ))}
      </div>
    </div>
  )
}
