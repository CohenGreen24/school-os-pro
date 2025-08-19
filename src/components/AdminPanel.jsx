import React from 'react'
import { supabase } from '../supabase'

export default function AdminPanel({ user, styleVariant='glass' }) {
  if (user.role !== 'admin') return <div className={styleVariant==='solid'?'card solid':'glass card'}>Admins only.</div>

  const [teachers,setTeachers] = React.useState([])
  const [students,setStudents] = React.useState([])
  const [pairs,setPairs] = React.useState([])
  const [tSel,setTSel] = React.useState('')
  const [sSel,setSSel] = React.useState('')
  const [roleSel,setRoleSel] = React.useState({ id:'', role:'' })

  const load = React.useCallback(async ()=>{
    const [{ data: t }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('users').select('id,name,code,role').eq('role','teacher').order('name'),
      supabase.from('users').select('id,name,code,role').eq('role','student').order('name'),
      supabase.from('teacher_students').select('teacher_id, student_id')
    ])
    setTeachers(t||[]); setStudents(s||[]); setPairs(p||[])
  }, [])

  React.useEffect(()=>{ load() }, [load])

  const assign = async ()=>{
    if(!tSel || !sSel) return
    await supabase.from('teacher_students').upsert({ teacher_id: tSel, student_id: sSel })
    setSSel(''); load()
  }
  const unassign = async (teacher_id, student_id)=>{
    await supabase.from('teacher_students').delete().match({ teacher_id, student_id })
    load()
  }
  const saveRole = async ()=>{
    if(!roleSel.id) return
    await supabase.from('users').update({ role: roleSel.role }).eq('id', roleSel.id)
    setRoleSel({ id:'', role:'' }); load()
  }

  const cardClass = styleVariant==='solid' ? 'card solid'
                   : styleVariant==='outline' ? 'card outline'
                   : 'glass card'

  return (
    <div className={cardClass}>
      <h2>Admin Control</h2>

      <div className="row" style={{gridTemplateColumns:'1fr 1fr'}}>
        <div className="glass card">
          <b>Assign student → teacher</b>
          <div className="row narrow" style={{gridTemplateColumns:'1fr 1fr auto'}}>
            <select className="input" value={tSel} onChange={e=>setTSel(e.target.value)}>
              <option value="">Choose teacher…</option>
              {teachers.map(t=> <option key={t.id} value={t.id}>{t.name} — {t.code}</option>)}
            </select>
            <select className="input" value={sSel} onChange={e=>setSSel(e.target.value)}>
              <option value="">Choose student…</option>
              {students.map(s=> <option key={s.id} value={s.id}>{s.name} — {s.code}</option>)}
            </select>
            <button className="btn btn-primary" onClick={assign}>Assign</button>
          </div>
        </div>

        <div className="glass card">
          <b>Change user role</b>
          <div className="row narrow" style={{gridTemplateColumns:'1fr 1fr auto'}}>
            <select className="input" value={roleSel.id} onChange={e=>setRoleSel(r=>({...r, id:e.target.value}))}>
              <option value="">Pick user…</option>
              {[...teachers, ...students].map(u=> <option key={u.id} value={u.id}>{u.name} — {u.code} ({u.role})</option>)}
            </select>
            <select className="input" value={roleSel.role} onChange={e=>setRoleSel(r=>({...r, role:e.target.value}))}>
              <option value="">Role…</option>
              <option value="student">student</option>
              <option value="teacher">teacher</option>
              <option value="wellbeing">wellbeing</option>
              <option value="admin">admin</option>
            </select>
            <button className="btn btn-primary" onClick={saveRole}>Save</button>
          </div>
        </div>
      </div>

      <div className="glass card">
        <b>Current assignments</b>
        <div className="list">
          {teachers.map(t=>{
            const kids = pairs.filter(p=>p.teacher_id===t.id).map(p=> students.find(s=>s.id===p.student_id)).filter(Boolean)
            return (
              <div key={t.id} className="glass card">
                <div><b>{t.name}</b> — {t.code}</div>
                {kids.length===0 && <div className="small" style={{opacity:.7}}>No students yet</div>}
                {kids.map(s=>(
                  <div key={s.id} className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
                    <div>{s.name} — {s.code}</div>
                    <button className="btn btn-ghost small" onClick={()=>unassign(t.id, s.id)}>Unassign</button>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
