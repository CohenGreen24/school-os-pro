// src/components/Overview.jsx — DROP-IN (compact Mon–Fri + upcoming)
import React from 'react'
import { supabase } from '../supabase'

const DAYS = ['Mon','Tue','Wed','Thu','Fri']

export default function Overview({ user, go }) {
  const [tt, setTt] = React.useState([])     // timetable entries
  const [upAsn, setUpAsn] = React.useState([])
  const [upAppt, setUpAppt] = React.useState([])
  const [wallet, setWallet] = React.useState(0)

  React.useEffect(() => {
    if (!user?.id) return
    ;(async ()=>{
      // timetable: expected schema timetable(user_id, day_idx 0-4, slot_idx 0.., label, room)
      const { data: t } = await supabase
        .from('timetable')
        .select('day_idx,slot_idx,label,room')
        .eq('user_id', user.id)
        .order('day_idx,slot_idx')
      setTt(t || [])

      const now = new Date()
      const in5 = new Date(now.getTime() + 5*24*60*60*1000).toISOString()
      const { data: a } = await supabase
        .from('assignments_due_view')
        .select('title,due_at')
        .gte('due_at', now.toISOString())
        .lte('due_at', in5)
        .order('due_at')
        .limit(5)
      setUpAsn(a || [])

      const { data: ap } = await supabase
        .from('appointments')
        .select('with_name,start_at')
        .gte('start_at', now.toISOString())
        .lte('start_at', in5)
        .order('start_at')
        .limit(5)
      setUpAppt(ap || [])

      const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
      setWallet(w?.balance || 0)
    })()
  }, [user?.id])

  const byDay = React.useMemo(() => {
    const g = [[],[],[],[],[]]
    tt.forEach(r => { if (r.day_idx>=0 && r.day_idx<5) g[r.day_idx].push(r) })
    g.forEach(list => list.sort((a,b)=>a.slot_idx-b.slot_idx))
    return g
  }, [tt])

  return (
    <div className="glass card" style={{ padding: 10 }}>
      {/* Top quick actions */}
      <div className="row" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', marginBottom: 8 }}>
        <button className="btn" onClick={()=>go('map')}>🗺️ Map</button>
        <button className="btn" onClick={()=>go('appointments')}>🧑‍⚕️ Appointments</button>
        <button className="btn" onClick={()=>go('assignments')}>✅ Assignments</button>
        <button className="btn" onClick={()=>go('lunch')}>🍽️ Lunch (Balance: ${Number(wallet).toFixed(2)})</button>
      </div>

      <div className="row" style={{ gridTemplateColumns: '2fr 1fr', alignItems:'start' }}>
        {/* Timetable Mon–Fri */}
        <section className="glass card">
          <h3 style={{ margin: '4px 0 8px' }}>This Week</h3>
          <div className="weekGrid">
            {DAYS.map((d, idx) => (
              <div key={d} className="dayCol">
                <div className="dayHeader">{d}</div>
                <div className="slots">
                  {(byDay[idx] || []).map(s => (
                    <div key={`${idx}-${s.slot_idx}`} className="slot">
                      <div className="slotLabel">{labelForSlot(s.slot_idx)}: {s.label}</div>
                      {s.room && <div className="slotSub">{s.room}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Upcoming */}
        <aside className="glass card">
          <h3 style={{ margin: '4px 0 8px' }}>Upcoming</h3>
          <div className="list">
            <div className="small" style={{ opacity: .7, marginBottom: 4 }}>Assignments</div>
            {(upAsn||[]).length===0 && <div className="small">No assignments due in 5 days.</div>}
            {(upAsn||[]).map((a,i)=>(
              <div className="item" key={i}>
                <div style={{fontWeight:600}}>{a.title}</div>
                <div className="small">{fmtDate(a.due_at)}</div>
              </div>
            ))}
          </div>
          <div className="list" style={{ marginTop: 10 }}>
            <div className="small" style={{ opacity: .7, marginBottom: 4 }}>Appointments</div>
            {(upAppt||[]).length===0 && <div className="small">No appointments in 5 days.</div>}
            {(upAppt||[]).map((a,i)=>(
              <div className="item" key={i}>
                <div style={{fontWeight:600}}>{a.with_name}</div>
                <div className="small">{fmtDate(a.start_at)}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  )
}

function labelForSlot(si){
  // Matches your structure:
  // 0 Caregroup (10m), 1 L1, 2 L2, 3 Recess, 4 L3, 5 L4, 6 Lunch, 7 L5, 8 L6
  const map = ['Caregroup','Lesson 1','Lesson 2','Recess','Lesson 3','Lesson 4','Lunch','Lesson 5','Lesson 6']
  return map[si] ?? `Slot ${si}`
}
function fmtDate(s){
  try{
    const d = new Date(s)
    return d.toLocaleString('en-AU', { dateStyle:'medium', timeStyle:'short' })
  }catch{ return s }
}
