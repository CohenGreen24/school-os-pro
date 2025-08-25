// src/components/MapPanel.jsx
import React from 'react'
import { supabase } from '../supabase'

/** ✅ Your public map URL + a tiny cache-buster.
 *  Update MAP_VER when you change the image (e.g. bump to 'v2').
 *  This fixes "updated on iPad but not PC" due to CDN caching.
 */
const MAP_VER = 'v1'  // <-- bump to 'v2', 'v3' whenever you upload a new map
const MAP_BASE = 'https://awxltfgbgnylacrklmik.supabase.co/storage/v1/object/public/maps/campus-map.png'
const MAP_URL = `${MAP_BASE}?${MAP_VER}`

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
  const [autoMode, setAutoMode] = React.useState(false)       // Auto detect toggle
  const [edgeSens, setEdgeSens] = React.useState(140)         // Canny high (low=high/2)
  const [invert, setInvert] = React.useState(false)           // for maps where buildings are darker/lighter
  const [previewPts, setPreviewPts] = React.useState(null)    // [[x,y],...] in rendered px

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

  const onSearchGo = (e) => {
    e.preventDefault()
    const b = buildingFromClass(search)
    if (b) setSelected(b)
  }

  /** ---------- Robust one-click detector ----------
   * Strategy:
   *  1) Rendered image → gray → optional invert → light blur.
   *  2) Try Canny edges (low=high/2). If no contour contains the click,
   *     fallback to Adaptive Threshold (binary) to find shapes with weak edges.
   *  3) Among contours that contain the click, choose the largest by area.
   *  4) Simplify with approxPolyDP and preview.
   */
  const detectAtPoint = (x, y) => {
    const img = imgRef.current
    if (!img || !cvReady) return false

    const rW = img.clientWidth, rH = img.clientHeight
    const canvas = document.createElement('canvas')
    canvas.width = rW; canvas.height = rH
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, rW, rH)

    const cv = window.cv
    let src = cv.imread(canvas)
    let gray = new cv.Mat()
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0)

    // Optional invert: some maps have dark buildings on light background or vice versa
    if (invert) cv.bitwise_not(gray, gray)

    // A little blur smooths noise
    let blur = new cv.Mat()
    cv.GaussianBlur(gray, blur, new cv.Size(3,3), 0, 0)

    // -------- attempt 1: Canny
    const high = Math.max(40, Math.min(220, Number(edgeSens)))
    const low  = Math.floor(high / 2)
    let edges = new cv.Mat()
    cv.Canny(blur, edges, low, high)

    const found1 = findContourContainingPoint(cv, edges, x, y, true /*isEdge*/)

    // -------- attempt 2: Adaptive Threshold (fallback when edges are faint)
    let found = found1
    if (!found1) {
      let bin = new cv.Mat()
      // Mean adaptive is more forgiving across lighting variations
      cv.adaptiveThreshold(blur, bin, 255, cv.ADAPTIVE_THRESH_MEAN_C, cv.THRESH_BINARY, 15, 2)
      // Post-process: close small gaps so contours are closed
      let kernel = cv.Mat.ones(3,3, cv.CV_8U)
      cv.morphologyEx(bin, bin, cv.MORPH_CLOSE, kernel)
      found = findContourContainingPoint(cv, bin, x, y, false /*binary*/)
      kernel.delete(); bin.delete()
    }

    gray.delete(); blur.delete(); edges.delete(); src.delete()

    if (found && found.length >= 3) {
      setPreviewPts(found)
      return true
    }
    return false
  }

  /** Find the largest contour that contains (x,y). Returns simplified pts (px) or null. */
  function findContourContainingPoint(cv, mat, x, y, isEdgeMask) {
    let input = mat
    // If we got an edge image, convert edges to filled contours by dilating a touch
    let temp = null
    if (isEdgeMask) {
      temp = new cv.Mat()
      const k = cv.Mat.ones(3,3, cv.CV_8U)
      cv.dilate(mat, temp, k)  // thicken edges so contours are easier to close
      k.delete()
      input = temp
    }

    let contours = new cv.MatVector()
    let hierarchy = new cv.Mat()
    cv.findContours(input, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    let bestIdx = -1, bestArea = 0
    for (let i = 0; i < contours.size(); i++) {
      const cnt = contours.get(i)
      const inside = cv.pointPolygonTest(cnt, new cv.Point(x, y), false)
      if (inside >= 0) {
        const area = cv.contourArea(cnt)
        if (area > bestArea) { bestArea = area; bestIdx = i }
      }
    }

    let result = null
    if (bestIdx >= 0) {
      const cnt = contours.get(bestIdx)
      const peri = cv.arcLength(cnt, true)
      const eps  = Math.max(1, 0.015 * peri)  // 1.5% simplification looks neat
      let approx = new cv.Mat()
      cv.approxPolyDP(cnt, approx, eps, true)
      const pts = []
      for (let i = 0; i < approx.rows; i++) {
        const p = approx.intPtr(i)
        pts.push([p[0], p[1]])
      }
      approx.delete()
      result = pts
    }

    hierarchy.delete(); contours.delete()
    if (temp) temp.delete()
    return result
  }

  const onMapClick = (e) => {
    if (!autoMode || !cvReady) return
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top

    const ok = detectAtPoint(x, y)
    if (!ok) {
      alert('Could not detect a closed shape at that point. Toggle “Invert”, or adjust sensitivity, then click again closer to the interior border.')
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

        {/* Staff: simplest per-building one-click detection */}
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
              onClick={()=> { setAutoMode(m=>!m); setPreviewPts(null) }}
              title="Click inside a building to auto-detect edges"
              disabled={!cvReady}
            >
              {autoMode ? '✅ Auto Detect On' : '✨ Auto Detect'}
            </button>

            <label className="small" title="Higher = finds more edges">
              Sensitivity: {edgeSens}
              <input
                type="range" min="60" max="220" step="5"
                value={edgeSens} onChange={e=>setEdgeSens(e.target.value)}
                style={{ verticalAlign:'middle', marginLeft: 8 }}
              />
            </label>

            <label className="small" title="Toggle if your buildings are darker/lighter than background">
              Invert
              <input type="checkbox" checked={invert} onChange={e=>setInvert(e.target.checked)} style={{ marginLeft:6 }} />
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
            pointerEvents: autoMode ? 'auto' : 'none',
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
            ? <>Click <b>inside</b> the {currentBuilding} shape. If it doesn’t snap, toggle <b>Invert</b> or adjust <b>Sensitivity</b>, then click again.</>
            : <>Choose a building → click <b>Auto Detect</b> → click inside the building to outline & save.</>}
        </div>
      )}

      {/* Quick select for students/admins */}
      <div className="flex" style={{ marginTop:8, flexWrap:'wrap', gap:6 }}>
        {['Building A','Building B','Building C','Technologies','Administration','Sports'].map(n=>(
          <button key={n} className="btn xs" onClick={()=>setSelected(n)}>{n}</button>
        ))}
      </div>
    </div>
  )
}
