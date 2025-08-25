// src/components/Overview.jsx
import React from 'react'
import { supabase } from '../supabase'

const PERIODS = [
  { key:'caregroup', label:'Caregroup',  period:0, start:'08:50', end:'09:00' },
  { key:'1',        label:'Lesson 1',   period:1, start:'09:00', end:'09:50' },
  { key:'2',        label:'Lesson 2',   period:2, start:'09:50', end:'10:40' },
  { key:'recess',   label:'Recess',     period:3, start:'10:40', end:'11:00' },
  { key:'3',        label:'Lesson 3',   period:4, start:'11:00', end:'11:50' },
  { key:'4',        label:'Lesson 4',   period:5, start:'11:50', end:'12:40' },
  { key:'lunch',    label:'Lunch',      period:6, start:'12:40', end:'13:30' },
  { key:'5',        label:'Lesson 5',   period:7, start:'13:30', end:'14:20' },
  { key:'6',        label:'Lesson 6',   period:8, start:'14:20', end:'15:10' },
]

function inAdelaideBetween(startHHMM, endHHMM) {
  const now = new Date()
  const toZ = (hhmm) => {
    const [hh,mm] = hhmm.split(':').map(Number)
    // build a date today in Australia/Adelaide
    const f = new Intl.DateTimeFormat('en-AU', { timeZone:'Australia/Adelaide',
      year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false })
    const [{value:month},, {value:day},, {value:year}] = f.formatToParts(now)
    return new Date(`${year}-${month}-${day}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00+09:30`)
  }
  const s = toZ(startHHMM).getTime()
  const e = toZ(endHHMM).getTime()
  const n = new Date().getTime()
  return n >= s && n <= e
}

export default function Overview({ user, go }) {
  const [tt, setTt] = React.useState([])     -- entries
  const [upAsn, setUpAsn] = React.useState([])
  const [upAppt, setUpAppt] = React.useState([])
  const [wallet, setWallet] = React.useState(0)

  React.useEffect(() => {
    if (!user?.id) return
    ;(async () => {
      const { data: t } = await supabase
        .from('timetable_entries')
        .select('*')
        .eq('user_id', user.id)
      setTt(t||[])

      const in5d = new Date(); in5d.setDate(in5d.getDate()+5)
      const { data: a } = await supabase
        .from('assignments')
        .select('*')
        .gte('due_at', new Date().toISOString())
        .lte('due_at', in5d.toISOString())
      setUpAsn(a||[])
      const { data: ap } = await supabase
        .from('appointments')
        .select('*')
        .eq('student_id', user.id)
        .gte('starts_at', new Date().toISOString())
        .lte('starts_at', in5d.toISOString())
      setUpAppt(ap||[])

      const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
      if (w) setWallet(Number(w.balance)||0)
    })()
  }, [user?.id])

  const days = [1,2,3,4,5]
  const byDay = (dow) => tt.filter(r => r.day_of_week === dow && !r.date_override)

  return (
    <div className="glass card" style={{padding:10}}>
      <div className="row" style={{gridTemplateColumns:'2fr 1fr', alignItems:'start'}}>
        {/* Left: Mon–Fri timetable compact */}
        <section className="glass card">
          <div className="timetable">
            {days.map((dow, i) => (
              <div key={dow} className="glass card dayCard">
                <div className="dayHeader">
                  <span>{['Mon','Tue','Wed','Thu','Fri'][i]}</span>
                  <button className="btn xs" onClick={()=>go?.('calendar')}>Open day</button>
                </div>
                <div className="periodList">
                  {PERIODS.map(p => {
                    const row = byDay(dow).find(r => r.period === p.period)
                    const active = inAdelaideBetween(p.start, p.end)
                    return (
                      <div key={p.period} className="period" style={{
                        outline: active ? '2px solid #22c55e' : 'none',
                        background: active ? 'rgba(34,197,94,.12)' : undefined
                      }}>
                        <div style={{fontWeight:700}}>
                          {row?.subject || p.label}
                        </div>
                        <div className="meta">
                          {row?.location || ''}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Right: shortcuts + upcoming + wallet + photo */}
        <aside className="glass card" style={{display:'grid', gap:10}}>
          <div className="shortcuts">
            <button className="btn shortcut" onClick={()=>go?.('map')}>📍 Map</button>
            <button className="btn shortcut" onClick={()=>go?.('appointments')}>🧑‍⚕️ Wellbeing</button>
            <button className="btn shortcut" onClick={()=>go?.('lunch')}>🍽️ Lunch</button>
            <button className="btn shortcut" onClick={()=>go?.('library')}>📚 Library</button>
          </div>

          <div className="glass card">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <strong>Upcoming (5 days)</strong>
              <span className="pill">Wallet: ${wallet.toFixed(2)}</span>
            </div>
            <div className="upcomingList" style={{marginTop:8}}>
              {upAsn.map(a=>(
                <div className="upItem" key={a.id}><span>📕 {a.title}</span><span className="small">{new Date(a.due_at).toLocaleString('en-AU',{timeZone:'Australia/Adelaide'})}</span></div>
              ))}
              {upAppt.map(a=>(
                <div className="upItem" key={a.id}><span>🧑‍⚕️ Appointment</span><span className="small">{new Date(a.starts_at).toLocaleString('en-AU',{timeZone:'Australia/Adelaide'})}</span></div>
              ))}
              {(!upAsn.length && !upAppt.length) && <div className="small" style={{opacity:.8}}>Nothing due.</div>}
            </div>
          </div>

          <div className="glass card center" style={{padding:12}}>
            <div className="avatarBox">
              <img className="avatar" alt={user.name} src={user.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(user.name)} />
            </div>
            <div className="small">{user.name}</div>
          </div>
        </aside>
      </div>
    </div>
  )
}
