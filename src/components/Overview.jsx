// src/components/Overview.jsx
import React from 'react'
import { supabase } from '../supabase'

const DAYS = ['Mon','Tue','Wed','Thu','Fri']
const SLOTS = [
  { key:'care', label:'Caregroup',  minutes:10 },
  { key:'l1',   label:'Lesson 1',   minutes:50 },
  { key:'l2',   label:'Lesson 2',   minutes:50 },
  { key:'rec',  label:'Recess',     minutes:20 },
  { key:'l3',   label:'Lesson 3',   minutes:50 },
  { key:'l4',   label:'Lesson 4',   minutes:50 },
  { key:'lun',  label:'Lunch',      minutes:50 },
  { key:'l5',   label:'Lesson 5',   minutes:50 },
  { key:'l6',   label:'Lesson 6',   minutes:50 },
]

// base day start 08:50
function slotTimes() {
  const out = []
  let h = 8, m = 50
  for (const s of SLOTS) {
    const start = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`
    // add minutes
    let mm = m + s.minutes
    let hh = h
    while (mm >= 60) { mm -= 60; hh += 1 }
    const end = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`
    out.push({ key: s.key, label: s.label, start, end })
    h = hh; m = mm
  }
  return out
}
const TIMES = slotTimes()

// Render helper
const Money = ({ n }) => <b>${(Number(n)||0).toFixed(2)}</b>

// Merge double lessons: if two adjacent subject+room same, merge
function mergeDay(daySlots) {
  const merged = []
  let i=0
  while (i<daySlots.length) {
    const a = daySlots[i]
    if (i<daySlots.length-1) {
      const b = daySlots[i+1]
      const canMerge = a && b && a.kind==='lesson' && b.kind==='lesson' &&
        a.subject && b.subject && a.subject===b.subject &&
        a.room && b.room && a.room===b.room
      if (canMerge) {
        merged.push({ ...a, span:2, endLabel: TIMES[i+1].end })
        i+=2; continue
      }
    }
    merged.push({ ...a, span:1, endLabel: TIMES[i].end })
    i+=1
  }
  return merged
}

// Fallback demo subjects if no DB timetable
const DEMO_SUBJECTS = ['Math','English','Science','History','Geography','PE','Art','Tech','Drama','Music']

export default function Overview({ user, onGo }) {
  const [wallet, setWallet] = React.useState(0)
  const [photoUrl, setPhotoUrl] = React.useState(null)
  const [appointments, setAppointments] = React.useState([])
  const [assignments, setAssignments] = React.useState([])
  const [grid, setGrid] = React.useState([]) // [dayIndex] => 9 slots

  const loadData = React.useCallback(async () => {
    if (!user?.id) return

    // Wallet
    const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
    setWallet(w?.balance ?? 0)

    // Photo (avatar_url on users or storage fallback)
    const { data: u } = await supabase.from('users').select('avatar_url').eq('id', user.id).maybeSingle()
    setPhotoUrl(u?.avatar_url || null)

    // Appointments next 5 days
    const { data: appts } = await supabase
      .from('appointments')
      .select('id,start_at,end_at,staff_name,topic')
      .gte('start_at', new Date().toISOString())
      .lte('start_at', new Date(Date.now()+5*86400000).toISOString())
      .eq('student_id', user.id)
      .order('start_at', { ascending: true })
    setAppointments(appts || [])

    // Assignments upcoming
    const { data: asg } = await supabase
      .from('assignments')
      .select('id,title,subject,due_date,status')
      .gte('due_date', new Date().toISOString())
      .eq('student_id', user.id)
      .order('due_date', { ascending: true })
    setAssignments(asg || [])

    // Timetable entries — try common shapes, fallback to demo
    // Expected shape attempt 1: timetable_entries(user_id, day:1-5, slot:0-8, subject, room)
    let timetable = null
    try {
      const { data: t1, error: e1 } = await supabase
        .from('timetable_entries')
        .select('day,slot,subject,room')
        .eq('user_id', user.id)
      if (!e1 && Array.isArray(t1) && t1.length) timetable = t1
    } catch {}

    // Attempt 2: timetables(user_id, day_of_week, slot_index, subject, room)
    if (!timetable) {
      try {
        const { data: t2, error: e2 } = await supabase
          .from('timetables')
          .select('day_of_week,slot_index,subject,room')
          .eq('user_id', user.id)
        if (!e2 && Array.isArray(t2) && t2.length) {
          timetable = t2.map(r => ({
            day: r.day_of_week, slot: r.slot_index, subject: r.subject, room: r.room
          }))
        }
      } catch {}
    }

    // Build grid 5×9
    const base = Array.from({length:5}, () =>
      SLOTS.map((s, i) => {
        const kind = s.label.toLowerCase().includes('lesson') ? 'lesson'
              : s.label.toLowerCase().includes('recess') ? 'recess'
              : s.label.toLowerCase().includes('lunch') ? 'lunch'
              : 'care'
        return { kind, subject:null, room:null, label:s.label, start:TIMES[i].start, end:TIMES[i].end }
      })
    )

    if (timetable) {
      for (const r of timetable) {
        const d = (r.day ?? r.day_of_week ?? r.dow ?? 1) - 1
        const s = (r.slot ?? r.slot_index ?? r.period ?? 0)
        if (d>=0 && d<5 && s>=0 && s<9) {
          base[d][s].subject = r.subject || base[d][s].subject
          base[d][s].room = r.room || base[d][s].room
        }
      }
    } else {
      // DEMO schedule: distributed subjects, with a couple of doubles
      for (let d=0; d<5; d++) {
        let si = d
        for (let s=0; s<9; s++) {
          if (base[d][s].kind==='lesson') {
            const subj = DEMO_SUBJECTS[(si++) % DEMO_SUBJECTS.length]
            base[d][s].subject = subj
            base[d][s].room = d===2 && (s===4||s===5) ? 'A2' : (d===4 && (s===1||s===2)) ? 'C3' : ['A1','B2','C1','A3','Tech 2','Gym 1'][ (d+s)%6 ]
          }
        }
        // add doubles like spec
        if (d===2) { // Wed: L3 & L4 double (indices 4,5)
          base[d][4].subject='Math'; base[d][5].subject='Math'; base[d][4].room='A2'; base[d][5].room='A2'
        }
        if (d===4) { // Fri: L1 & L2 double (indices 1,2)
          base[d][1].subject='English'; base[d][2].subject='English'; base[d][1].room='C3'; base[d][2].room='C3'
        }
      }
    }

    // Merge doubles per day
    setGrid(base.map(mergeDay))
  }, [user?.id])

  React.useEffect(() => { loadData() }, [loadData])

  return (
    <div className="overviewPanel glass">
      {/* Header row: title + shortcuts + photo */}
      <div className="overviewHeader">
        <div className="ohLeft">
          <h2 className="ohTitle">This Week</h2>
          <div className="ohShortcuts">
            <button className="btn xs" onClick={()=>onGo?.('calendar')}>Calendar</button>
            <button className="btn xs" onClick={()=>onGo?.('assignments')}>Assignments</button>
            <button className="btn xs" onClick={()=>onGo?.('appointments')}>Wellbeing</button>
            <button className="btn xs" onClick={()=>onGo?.('lunch')}>Lunch (<Money n={wallet}/>)</button>
            <button className="btn xs" onClick={()=>onGo?.('map')}>Map</button>
          </div>
        </div>
        <div className="ohRight">
          <div className="ohMeta glass pill">Wallet: <Money n={wallet}/></div>
          {photoUrl ? (
            <img className="avatar" src={photoUrl} alt="profile" />
          ) : (
            <div className="avatar placeholder">👤</div>
          )}
        </div>
      </div>

      {/* Week grid */}
      <div className="weekShell">
        <div className="timeCol glass">
          <div className="timeHead">Times</div>
          {TIMES.map((t, i) => (
            <div key={i} className="timeCell">
              <div className="timeRange">{t.start} – {t.end}</div>
              <div className="timeLabel">{SLOTS[i].label}</div>
            </div>
          ))}
        </div>

        {grid.map((day, di) => (
          <div key={DAYS[di]} className="dayCol glass">
            <div className="dayHead">{DAYS[di]}</div>
            {day.map((slot, si) => (
              <div
                key={`${di}-${si}`}
                className={`slotCell ${slot.kind} ${slot.span===2?'span2':''}`}
                style={slot.span===2 ? { gridRow: `span 2` } : undefined}
              >
                <div className="slotMain">
                  <div className="slotTitle">
                    {slot.kind==='lesson'
                      ? (slot.subject || '—')
                      : SLOTS[si].label}
                  </div>
                  <div className="slotMeta">
                    {slot.kind==='lesson' ? (slot.room ? `Room ${slot.room}` : 'Room —') : ''}
                    {slot.span===2 && <span className="badge">Double</span>}
                  </div>
                </div>
                <div className="slotTimes">{TIMES[si].start} – {slot.endLabel}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Upcoming strip */}
      <div className="overviewFooter">
        <div className="glass card strip">
          <b>Upcoming appointments (5 days)</b>
          <div className="stripList">
            {appointments?.length ? appointments.map(a => (
              <div key={a.id} className="chip">
                {new Date(a.start_at).toLocaleString()} — {a.staff_name || 'Staff'} {a.topic?`• ${a.topic}`:''}
              </div>
            )) : <span className="small">None</span>}
          </div>
        </div>

        <div className="glass card strip">
          <b>Upcoming assignments</b>
          <div className="stripList">
            {assignments?.length ? assignments.map(x => (
              <div key={x.id} className="chip">
                {x.subject || 'Subject'} • {x.title} — due {new Date(x.due_date).toLocaleDateString()}
              </div>
            )) : <span className="small">None</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
