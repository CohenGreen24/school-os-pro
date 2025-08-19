import React from 'react'
import { supabase } from '../supabase'

/**
 * Appointments flow:
 * 1) pick staff (role='wellbeing')
 * 2) pick date
 * 3) click a slot to book/cancel
 */
export default function Appointments({ user, admin=false, targetStudentId, styleVariant='glass' }){
  const studentId = targetStudentId || user.id
  const [staff,setStaff] = React.useState([])
  const [chosen,setChosen] = React.useState(null)
  const [date,setDate] = React.useState(new Date().toISOString().slice(0,10))
  const [slots,setSlots] = React.useState([])

  React.useEffect(()=>{(async()=>{
    const { data } = await supabase.from('users').select('id,name').eq('role','wellbeing').order('name')
    setStaff(data||[]); setChosen((data||[])[0]||null)
  })()},[])

  const loadSlots = async ()=>{
    if(!chosen) return
    const { data } = await supabase.from('wellbeing_appointments')
      .select('*, staff:staff_id(name), student:student_id(name)')
      .eq('staff_id', chosen.id).eq('date', date).order('time')
    setSlots(data||[])
  }
  React.useEffect(()=>{ loadSlots() },[chosen, date])

  const book=async(id)=>{ await supabase.from('wellbeing_appointments').update({status:'booked',student_id:studentId}).eq('id',id); loadSlots() }
  const cancel=async(id)=>{ await supabase.from('wellbeing_appointments').update({status:'available',student_id:null}).eq('id',id); loadSlots() }

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'

  return (
    <div className={cardClass}>
      <h2>Wellbeing Appointments</h2>
      <div className="row narrow" style={{gridTemplateColumns:'1fr 1fr'}}>
        <select className="input" value={chosen?.id||''} onChange={e=>setChosen(staff.find(s=>s.id===e.target.value))}>
          {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" className="input" value={date} onChange={e=>setDate(e.target.value)} />
      </div>

      <div className="list">
        {slots.map(s=> (
          <div key={s.id} className={cardClass+" flex"} style={{justifyContent:'space-between'}}>
            <div style={{minWidth:0}}>
              <div><b>{s.time}</b></div>
              <div className="small">{s.status==='available'?'Available':'Booked'} {s.student?('• '+s.student.name):''}</div>
            </div>
            <div>
              {s.status==='available'
                ? <button className="btn btn-primary" onClick={()=>book(s.id)}>Book</button>
                : (admin || s.student_id===studentId) ? <button className="btn" onClick={()=>cancel(s.id)}>Cancel</button> : <span className="badge badge-red">Booked</span>}
            </div>
          </div>
        ))}
        {slots.length===0 && <div className="small loading">No slots for this date.</div>}
      </div>
    </div>
  )
}
