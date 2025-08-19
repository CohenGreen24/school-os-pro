import React from 'react'
import { supabase } from '../supabase'
import Wallet from './Wallet'
import Assignments from './Assignments'
import Profile from './Profile'

export default function TeacherPanel({ user, styleVariant='glass' }) {
  const [students,setStudents] = React.useState([])
  const [target,setTarget] = React.useState(null)
  const isTeacher = user.role==='teacher'

  React.useEffect(()=>{ (async()=>{
    if(!isTeacher) return
    const { data, error } = await supabase
      .from('teacher_students')
      .select('student:student_id(id,name,code,year_level,care_group,avatar_url)')
      .eq('teacher_id', user.id)
    if (error) { console.error(error); return }
    const list = (data||[]).map(r=>r.student).filter(Boolean)
    setStudents(list)
    setTarget(list[0] || null)
  })() }, [isTeacher, user.id])

  const cardClass = styleVariant==='solid' ? 'card solid'
                   : styleVariant==='outline' ? 'card outline'
                   : 'glass card'

  if (!isTeacher) return <div className={cardClass}>Only teachers see this panel.</div>

  return (
    <div className={cardClass}>
      <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
        <h2>Homegroup</h2>
        <select className="input" style={{maxWidth:280}} value={target?.id||''} onChange={e=>{
          const s = students.find(st => st.id===e.target.value); setTarget(s||null)
        }}>
          {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.code}</option>)}
        </select>
      </div>

      {!target && <div className="small">No assigned students yet.</div>}

      {target && (
        <div className="row" style={{gridTemplateColumns:'1fr 1fr'}}>
          {/* Quick wallet controls (admin=true allows adjustments) */}
          <Wallet user={user} admin targetStudentId={target.id} />
          {/* Quick profile editor for the selected student (canManageStudent=true allows avatar updates via signed RPC) */}
          <Profile user={user} canManageStudent styleVariant="glass" />
          {/* Assignments manager contextualized by current user; to target the student,
              you can pass a prop when your Assignments component supports it. */}
          <Assignments user={{...user, id: target.id, role:'student'}} admin />
        </div>
      )}
    </div>
  )
}
