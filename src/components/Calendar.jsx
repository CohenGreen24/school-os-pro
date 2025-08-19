import React from 'react'
import { supabase } from '../supabase'

export default function Calendar({ user, styleVariant='glass' }){
  const [items,setItems] = React.useState([])
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday']

  const load = async ()=>{
    const { data } = await supabase.from('class_schedule').select('*').eq('student_id',user.id)
    setItems(data||[])
  }
  React.useEffect(()=>{ load() },[])

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'
  return (
    <div className={cardClass}>
      <h2>Weekly Timetable</h2>
      <div className="row" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        {days.map(day => (
          <div key={day} className={cardClass}>
            <b>{day}</b>
            <div className="list">
              {items.filter(i=>i.day_of_week===day).map(i => (
                <div key={i.id} className="small">
                  <b className="clamp">{i.class_name}</b><br/>{i.start_time}–{i.end_time} • {i.location}
                </div>
              ))}
              {items.filter(i=>i.day_of_week===day).length===0 && <div className="small">—</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
