import React from 'react'
import { supabase } from '../supabase'

export default function Assignments({ user, admin=false, targetStudentId, styleVariant='glass', density='comfortable' }){
  const studentId = targetStudentId || user.id
  const [items,setItems] = React.useState([])
  const [title,setTitle] = React.useState('')
  const [due,setDue] = React.useState('')
  const load = async ()=>{
    const { data } = await supabase.from('assignments').select('*').eq('student_id',studentId).order('due_date')
    setItems(data||[])
  }
  React.useEffect(()=>{ if(studentId) load() },[studentId])
  const add = async ()=>{ if(!title||!due) return; await supabase.from('assignments').insert({student_id:studentId,title,due_date:due}); setTitle(''); setDue(''); load() }
  const toggle = async (id, completed)=>{ await supabase.from('assignments').update({completed:!completed}).eq('id',id); load() }

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'
  const rowClass = density==='compact' ? 'row narrow' : 'row'

  return (
    <div className={cardClass}>
      <div className="flex"><h2>Assignments</h2><span className="right small">{items.length} total</span></div>
      {admin && (
        <div className={rowClass} style={{gridTemplateColumns:'2fr 1fr auto'}}>
          <input className="input" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <input className="input" type="date" value={due} onChange={e=>setDue(e.target.value)} />
          <button className="btn btn-primary" onClick={add}>Add</button>
        </div>
      )}
      <div className="list">
        {items.map(a => (
          <div key={a.id} className={cardClass+" flex"} style={{justifyContent:'space-between'}}>
            <div style={{minWidth:0}}>
              <div><b className="clamp">{a.title}</b></div>
              <div className="small">Due {a.due_date}</div>
            </div>
            <button className="btn btn-ghost" onClick={()=>toggle(a.id,a.completed)}>{a.completed?'✅ Completed':'☐ Mark complete'}</button>
          </div>
        ))}
        {items.length===0 && <div className="small loading">Fetching assignments…</div>}
      </div>
    </div>
  )
}
