import React from 'react'

// Data model for buildings and rooms
const bdef = (id, name, rooms, floor, area, desc) => ({ id, name, rooms, floor, area, desc })
const BUILDINGS = [
  bdef('A', 'Building A', Array.from({length:8}, (_,i)=>`A${i+1}`),           'Ground/First', 'North', 'General classrooms A1–A8.'),
  bdef('B', 'Building B', Array.from({length:8}, (_,i)=>`B${i+1}`),           'Ground/First', 'North-East', 'General classrooms B1–B8.'),
  bdef('C', 'Building C', Array.from({length:8}, (_,i)=>`C${i+1}`),           'Ground/First', 'East', 'General classrooms C1–C8.'),
  bdef('TECH', 'Technologies', ['TECH1','TECH2','TECH3','LAB1','LAB2','LAB3'],'Ground', 'West', 'Workshops and computer labs.'),
  bdef('ADMIN', 'Administration', ['STUDENT SERVICES','PRINCIPAL OFFICE','STAFF LOUNGE','MEETING ROOM 1','MEETING ROOM 2','MEETING ROOM 3'], 'Ground', 'Central', 'School administration & services.'),
  bdef('SPORTS', 'Sports', ['GYM 1','GYM 2','STUDIO 1','STORAGE 1','STORAGE 2','STORAGE 3'], 'Ground', 'South', 'Gyms and athletics.'),
]
const norm = s => (s||'').toString().trim().toUpperCase().replace(/\s+/g,' ')

export default function MapPanel({ styleVariant='glass' }){
  const [highlight,setHighlight]=React.useState('')
  const [query,setQuery]=React.useState('')
  const match = React.useMemo(()=>{ const q=norm(query); if(!q) return null
    const direct = BUILDINGS.find(B => B.rooms.some(r => norm(r) === q)); if (direct) return direct
    const aliases = [
      [/^TECHNOLOG(Y|IES)\s*(\d)$/, 'TECH$2'], [/^TECH\s*(\d)$/, 'TECH$1'], [/^LAB\s*(\d)$/, 'LAB$1'],
      [/^GYM\s*(\d)$/, 'GYM $1'], [/^STORAGE\s*(\d)$/, 'STORAGE $1'], [/^MEETING\s*ROOM\s*(\d)$/, 'MEETING ROOM $1'],
      [/^PRINCIPAL'?S?\s*OFFICE$/, 'PRINCIPAL OFFICE'], [/^STUDENT\s*SERVICES$/, 'STUDENT SERVICES'], [/^STAFF\s*LOUNGE$/, 'STAFF LOUNGE'],
    ]
    for (const [re, repl] of aliases) { if (re.test(q)) { const token = q.replace(re, repl); const found = BUILDINGS.find(B => B.rooms.some(r => norm(r) === token)); if (found) return found } }
    const byName = BUILDINGS.find(B => norm(B.name) === q); if(byName) return byName
    return null
  },[query])
  const select = (id)=> setHighlight(id)
  const go = ()=> { if(match) setHighlight(match.id) }

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'

  return (
    <div className={cardClass}>
      <h2>Class Location Finder</h2>
      <div className="row narrow" style={{gridTemplateColumns:'2fr 1fr'}}>
        <input className="input" placeholder="A1, B6, C8, Technologies 2, Lab 3, Student Services, Gym 2, Storage 1…" value={query} onChange={e=>setQuery(e.target.value)} />
        <button className="btn btn-primary" onClick={go}>Find</button>
      </div>
      <svg className="glass" viewBox="0 0 500 260" style={{width:'100%',height:260,borderRadius:16, marginTop:12}}>
        <g className={highlight==='A' ? 'bob' : ''} onClick={()=>select('A')}>
          <rect x="20" y="20" width="140" height="80" rx="12" fill={highlight==='A'?'#90EE90':'rgba(255,255,255,.4)'} stroke="rgba(0,0,0,.1)" />
          <text x="90" y="65" textAnchor="middle" fontSize="12">Building A</text>
        </g>
        <g className={highlight==='B' ? 'bob' : ''} onClick={()=>select('B')}>
          <rect x="180" y="20" width="140" height="80" rx="12" fill={highlight==='B'?'#90EE90':'rgba(255,255,255,.4)'} stroke="rgba(0,0,0,.1)" />
          <text x="250" y="65" textAnchor="middle" fontSize="12">Building B</text>
        </g>
        <g className={highlight==='C' ? 'bob' : ''} onClick={()=>select('C')}>
          <rect x="340" y="20" width="140" height="80" rx="12" fill={highlight==='C'?'#90EE90':'rgba(255,255,255,.4)'} stroke="rgba(0,0,0,.1)" />
          <text x="410" y="65" textAnchor="middle" fontSize="12">Building C</text>
        </g>
        <g className={highlight==='TECH' ? 'bob' : ''} onClick={()=>select('TECH')}>
          <rect x="20" y="120" width="140" height="120" rx="12" fill={highlight==='TECH'?'#90EE90':'rgba(255,255,255,.4)'} stroke="rgba(0,0,0,.1)" />
          <text x="90" y="180" textAnchor="middle" fontSize="12">Technologies</text>
        </g>
        <g className={highlight==='ADMIN' ? 'bob' : ''} onClick={()=>select('ADMIN')}>
          <rect x="180" y="120" width="140" height="120" rx="12" fill={highlight==='ADMIN'?'#90EE90':'rgba(255,255,255,.4)'} stroke="rgba(0,0,0,.1)" />
          <text x="250" y="180" textAnchor="middle" fontSize="12">Administration</text>
        </g>
        <g className={highlight==='SPORTS' ? 'bob' : ''} onClick={()=>select('SPORTS')}>
          <rect x="340" y="120" width="140" height="120" rx="12" fill={highlight==='SPORTS'?'#90EE90':'rgba(255,255,255,.4)'} stroke="rgba(0,0,0,.1)" />
          <text x="410" y="180" textAnchor="middle" fontSize="12">Sports</text>
        </g>
      </svg>
      <div className={cardClass}>
        <b>Result</b>
        {!highlight && <div className="small">Type a query and press Find to highlight a building.</div>}
        {highlight && (()=>{ const B = BUILDINGS.find(x=>x.id===highlight); if(!B) return <div className="small">Unknown building.</div>; return (
          <div className="flex" style={{justifyContent:'space-between', gap:12}}>
            <div style={{minWidth:0}}>
              <div><b>{B.name}</b></div>
              <div className="small">Floor: {B.floor} • Area: {B.area}</div>
              <div className="small clamp">{B.desc}</div>
            </div>
            <div className="small" style={{textAlign:'right'}}>Rooms: {B.rooms.join(', ')}</div>
          </div>
        )})()}
      </div>
      <div className="small">Tip: swap the SVG and BUILDINGS data with your real map when ready.</div>
    </div>
  )
}
