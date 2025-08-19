import React from 'react'
import { supabase } from '../supabase'

const randId = () =>
  (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))

async function uploadAvatar(file, userId) {
  const ext = file.name.split('.').pop()
  const path = `users/${userId}/${randId()}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export default function Profile({ user, canManageStudent=false, styleVariant='glass' }){
  const [students,setStudents] = React.useState([])
  const [target,setTarget] = React.useState(user)
  const [avatarFile,setAvatarFile] = React.useState(null)
  const isTeacher = user.role==='teacher'

  React.useEffect(()=>{ setTarget(user) },[user])
  React.useEffect(()=>{ (async()=>{ if(isTeacher){
    const { data } = await supabase
      .from('users')
      .select('id,name,code,role,year_level,care_group,email,emergency_contact_name,emergency_contact_phone,avatar_url')
      .eq('role','student')
      .order('name')
    setStudents(data||[])
  }})() },[isTeacher])

  const save = async ()=>{
    let avatar_url = target.avatar_url || null
    if (avatarFile) {
      avatar_url = await uploadAvatar(avatarFile, target.id)
    }
    const payload = {
      name: target.name,
      email: target.email||null,
      year_level: target.year_level||null,
      care_group: target.care_group||null,
      emergency_contact_name: target.emergency_contact_name||null,
      emergency_contact_phone: target.emergency_contact_phone||null,
      avatar_url
    }
    await supabase.from('users').update(payload).eq('id', target.id)
    alert('Saved!')
  }

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'

  return (
    <div className={cardClass}>
      <h2>Profile</h2>

      {isTeacher && canManageStudent && (
        <div className="glass card">
          <b>Edit target</b>
          <div className="row narrow" style={{gridTemplateColumns:'1fr'}}>
            <select className="input" value={target?.id||user.id} onChange={e=>{
              const pick=(e.target.value===user.id)?user:students.find(s=>s.id===e.target.value)
              setTarget(pick||user)
            }}>
              <option value={user.id}>My profile</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.code}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="row" style={{gridTemplateColumns:'280px 1fr'}}>
        <div className="glass card">
          <b>Photo</b>
          <div className="avatarBox">
            <img
              src={target?.avatar_url || 'https://api.dicebear.com/7.x/shapes/svg?seed='+(target?.name||'User')}
              alt="avatar"
              className="avatar"
            />
          </div>
          <input className="input" type="file" accept="image/*" onChange={e=>setAvatarFile(e.target.files?.[0]||null)} />
        </div>

        <div className="glass card">
          <b>Details</b>
          <div className="row narrow" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div>
              <label className="small">Full name</label>
              <input className="input" value={target?.name||''} onChange={e=>setTarget(t=>({...t, name:e.target.value}))} />
            </div>
            <div>
              <label className="small">Email</label>
              <input className="input" value={target?.email||''} onChange={e=>setTarget(t=>({...t, email:e.target.value}))} />
            </div>
            <div>
              <label className="small">Year level</label>
              <input className="input" type="number" min="1" max="13" value={target?.year_level||''} onChange={e=>setTarget(t=>({...t, year_level:e.target.value}))} />
            </div>
            <div>
              <label className="small">Care group</label>
              <input className="input" value={target?.care_group||''} onChange={e=>setTarget(t=>({...t, care_group:e.target.value}))} />
            </div>
            <div>
              <label className="small">Emergency name</label>
              <input className="input" value={target?.emergency_contact_name||''} onChange={e=>setTarget(t=>({...t, emergency_contact_name:e.target.value}))} />
            </div>
            <div>
              <label className="small">Emergency phone</label>
              <input className="input" value={target?.emergency_contact_phone||''} onChange={e=>setTarget(t=>({...t, emergency_contact_phone:e.target.value}))} />
            </div>
            <div>
              <label className="small">Role</label>
              <input className="input" value={target?.role||''} disabled />
            </div>
            <div>
              <label className="small">ID code</label>
              <input className="input" value={target?.code||''} disabled />
            </div>
          </div>
        </div>
      </div>

      <button className="btn btn-primary" onClick={save}>Save</button>
    </div>
  )
}
