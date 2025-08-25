// src/components/Calendar.jsx
import React from 'react'
import { supabase } from '../supabase'

const TZ = 'Australia/Adelaide'

export default function Calendar({ user }) {
  const [ym, setYm] = React.useState(() => {
    const d = new Date()
    return { y: d.getFullYear(), m: d.getMonth() }  // 0-based month
  })
  const [items,setItems] = React.useState([])

  React.useEffect(()=>{ (async()=>{
    const first = new Date(ym.y, ym.m, 1)
    const next  = new Date(ym.y, ym.m+1, 1)
    const { data } = await supabase
      .from('v_calendar_month_items')
      .select('*')
      .gte('day', first.toISOString().slice(0,10))
      .lt('day', next.toISOString().slice(0,10))
    setItems(data||[])
  })() },[ym.y, ym.m])

  const daysInMonth = new Date(ym.y, ym.m+1, 0).getDate()
  const startDow = new Date(ym.y, ym.m, 1).getDay() || 7  // make Monday=1..Sunday=7
  const weeks = []
  let day = 1 - (startDow-1)
  while (day <= daysInMonth) {
    const row = []
    for (let i=0;i<7;i++) { row.push(day); day++ }
    weeks.push(row)
  }
  const dayItems = (d) => items.filter(x => (new Date(x.day)).getDate() === d)
  const label = (d) => new Intl.DateTimeFormat('en-AU', { month:'long', year:'numeric', timeZone:TZ }).format(new Date(ym.y, ym.m, 1))

  return (
    <div className="glass card" style={{padding:10}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <button className="btn xs" onClick={()=>setYm(s=>({y:s.m? s.y : s.y-1, m:(s.m+11)%12}))}>◀</button>
        <h3 style={{margin:0}}>{label()}</h3>
        <button className="btn xs" onClick={()=>setYm(s=>({y:s.m===11? s.y+1 : s.y, m:(s.m+1)%12}))}>▶</button>
      </div>

      <div className="glass card" style={{padding:8, margin:'8px 0'}}>
        <span className="badge" style={{marginRight:6}}>🔴 Assignment due</span>
        <span className="badge">🔵 Appointment</span>
      </div>

      <div className="glass card" style={{padding:8}}>
        <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6}}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(h=><div key={h} className="small" style={{textAlign:'center', opacity:.7}}>{h}</div>)}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:6, marginTop:6}}>
          {weeks.map((row,i)=>row.map((d,j)=>{
            const valid = d>=1 && d<=daysInMonth
            const list = valid? dayItems(d) : []
            return (
              <div key={`${i}-${j}`} className="glass card" style={{padding:6, minHeight:90, opacity: valid?1:.35}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <strong>{valid? d:''}</strong>
                  <div>
                    {list.some(x=>x.kind==='assignment') && <span title="Assignment" style={{marginLeft:4}}>🔴</span>}
                    {list.some(x=>x.kind==='appointment') && <span title="Appointment" style={{marginLeft:4}}>🔵</span>}
                  </div>
                </div>
                <div className="small" style={{marginTop:6, display:'flex', flexDirection:'column', gap:4, maxHeight:60, overflow:'auto'}}>
                  {list.map(x=>(
                    <div key={x.id}>{x.kind==='assignment'?'📕':'🧑‍⚕️'} {x.title}</div>
                  ))}
                </div>
              </div>
            )
          }))}
        </div>
      </div>
    </div>
  )
}
