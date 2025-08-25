// src/components/AdminPanel.jsx
import React from 'react'
import { supabase } from '../supabase'

export default function AdminPanel({ user }) {
  const canUse = ['admin','teacher','wellbeing'].includes(user?.role)
  const [teachers,setTeachers] = React.useState([])
  const [students,setStudents] = React.useState([])
  const [selTeacher,setSelTeacher] = React.useState('')
  const [selStudentIds,setSelStudentIds] = React.useState([])

  React.useEffect(()=>{ (async()=>{
    const { data: t } = await supabase.from('users').select('id,name').in('role',['teacher','wellbeing','admin']).order('name')
    const { data: s } = await supabase.from('users').select('id,name,year_level,care_group').eq('role','student').order('name')
    setTeachers(t||[]); setStudents(s||[])
  })() },[])

  const assign = async () => {
    if (!selTeacher || !selStudentIds.length) return
    await supabase.rpc('assign_students_to_teacher', { p_teacher: selTeacher, p_students: selStudentIds, p_is_homegroup: true })
    alert('Assigned.')
  }

  const createMassAssignment = async () => {
    const title = prompt('Assignment title?'); if (!title) return
    const due = prompt('Due (YYYY-MM-DD hh:mm, Adelaide time)?'); if (!due) return
    const scope = prompt('Scope (class/year/school)?','class')
    let payload = { title, due_at: new Date(due+':00+09:30').toISOString(), created_by: user.id, scope }
    if (scope==='class') payload.target_class_code = prompt('Class code?')
    if (scope==='year')  payload.target_year = Number(prompt('Year level?'))
    const { error } = await supabase.from('assignments').insert(payload)
    if (error) alert(error.message); else alert('Assignment created.')
  }

  const createMassPost = async () => {
    const title = prompt('Post title?'); if (!title) return
    const body = prompt('Body?') || null
    const scope = prompt('Scope (class/year/school)?','school')
    let payload = { title, body, created_by: user.id, scope }
    if (scope==='class') payload.target_class_code = prompt('Class code?')
    if (scope==='year')  payload.target_year = Number(prompt('Year level?'))
    const { error } = await supabase.from('bulletin_posts').insert(payload)
    if (error) alert(error.message); else alert('Posted.')
  }

  if (!canUse) return <div className="glass card" style={{padding:10}}><div className="small" style={{color:'#ef4444'}}>No access.</div></div>

  return (
    <div className="glass card" style={{padding:10}}>
      <h3 style={{marginTop:0}}>Staff Tools</h3>
      <div className="row" style={{gridTemplateColumns:'1fr 1fr'}}>
        <section className="glass card">
          <h4>Assign students to a staff homegroup</h4>
          <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:8}}>
            <select className="input" onChange={e=>setSelTeacher(e.target.value)}>
              <option value="">Choose staff…</option>
              {teachers.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={assign}>Assign</button>
          </div>
          <div style={{maxHeight:320, overflow:'auto', display:'grid', gap:6}}>
            {students.map(s => (
              <label key={s.id} className="glass card" style={{padding:6, display:'flex', gap:8, alignItems:'center'}}>
                <input type="checkbox" onChange={e=>{
                  setSelStudentIds(prev => e.target.checked ? [...prev, s.id] : prev.filter(id=>id!==s.id))
                }}/>
                <div>{s.name}</div>
                <div className="small" style={{marginLeft:'auto', opacity:.7}}>Y{s.year_level} {s.care_group||''}</div>
              </label>
            ))}
          </div>
        </section>

        <section className="glass card">
          <h4>Mass actions</h4>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn" onClick={createMassAssignment}>+ Assignment</button>
            <button className="btn" onClick={createMassPost}>+ Bulletin Post</button>
          </div>
          <div className="small" style={{opacity:.8, marginTop:8}}>
            Scope: <b>class</b>, <b>year</b>, or <b>school</b>.
          </div>
        </section>
      </div>
    </div>
  )
}
