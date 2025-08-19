import React from 'react'
import { supabase } from '../supabase'

const randId = () =>
  (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))

async function uploadAvatar(file, userId) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `users/${userId}/${randId()}.${ext}`
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  return data.publicUrl
}

export default function Profile({ user, canManageStudent=false, styleVariant='glass' }){
  const [students,setStudents] = React.useState([])
  const [target,setTarget] = React.useState(user)
  const [saving,setSaving] = React.useState(false)
  const isTeacher = user.role==='teacher'

  // Load students list for teachers
  React.useEffect(()=>{ (async()=>{
    if(isTeacher && canManageStudent){
      const { data } = await supabase
        .from('users')
        .select('id,name,code,role,year_level,care_group,email,emergency_contact_name,emergency_contact_phone,avatar_url')
        .eq('role','student')
        .order('name')
      setStudents(data||[])
    }
  })() },[isTeacher, canManageStudent])

  // Keep target in sync when user changes
  React.useEffect(()=>{ setTarget(user) },[user])

  const cardClass = styleVariant==='solid' ? 'card solid'
                   : styleVariant==='outline' ? 'card outline'
                   : 'glass card'

  const save = async ()=>{
    if(!target) return
    setSaving(true)
    try{
      const payload = {
        name: target.name || null,
        email: target.email || null,
        year_level: target.year_level ? Number(target.year_level) : null,
        care_group: target.care_group || null,
        emergency_contact_name: target.emergency_contact_name || null,
        emergency_contact_phone: target.emergency_contact_phone || null,
        avatar_url: target.avatar_url || null
      }
      await supabase.from('users').update(payload).eq('id', target.id)
      alert('Saved')
    }catch(e){
      alert('Save failed: ' + (e.message || e))
    }finally{
      setSaving(false)
    }
  }

  const handleAvatarPick = async (file) => {
    if(!file || !target) return
    try{
      const url = await uploadAvatar(file, target.id)
      await supabase.from('users').update({ avatar_url: url }).eq('id', target.id)
      // Refresh local target row
      const { data } = await supabase.from('users').select('*').eq('id', target.id).single()
      if (data) setTarget(prev=>({ ...prev, ...data }))
      alert('Avatar updated')
    }catch(e){
      alert('Upload failed: ' + (e.message || e))
    }
  }

  return (
    <div className={cardClass}>
      <h2>Profile</h2>

      {isTeacher && canManageStudent && (
        <div className="glass card" style={{marginBottom:12}}>
          <b>Edit target</b>
          <div className="row narrow" style={{gridTemplateColumns:'1fr'}}>
            <select
              className="input"
              value={target?.id || user.id}
              onChange={e=>{
                const id = e.target.value
                if(id === user.id){ setTarget(user); return }
                const pick = students.find(s=>s.id===id)
                setTarget(pick || user)
              }}>
              <option value={user.id}>My profile</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} — {s.code}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="row" style={{gridTemplateColumns:'280px 1fr'}}>
        <div className="glass card">
          <b>Photo</b>
          <div className="avatarBox">
            <img
              src={target?.avatar_url || `https://api.dicebear.com/7.0/shapes/svg?seed=${encodeURIComponent(target?.name||'User')}`}
              alt="avatar"
              className="avatar"
              onError={(e)=>{ e.currentTarget.src = `https://api.dicebear.com/7.0/shapes/svg?seed=${encodeURIComponent(target?.name||'User')}` }}
            />
          </div>
          <input
            className="input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={e=>handleAvatarPick(e.target.files?.[0] || null)}
          />
          <div className="small" style={{opacity:.7, marginTop:6}}>
            Tip: You can take a new photo with the iPad camera.
          </div>
        </div>

        <div className="glass card">
          <b>Details</b>
          <div className="row narrow" style={{gridTemplateColumns:'1fr 1fr'}}>
            <div>
              <label className="small">Full name</label>
              <input className="input" value={target?.name||''} onChange={e=>setTarget(t=>({...t, name:e.target.value}))}/>
            </div>
            <div>
              <label className="small">Email</label>
              <input className="input" value={target?.email||''} onChange={e=>setTarget(t=>({...t, email:e.target.value}))}/>
            </div>
            <div>
              <label className="small">Year level</label>
              <input className="input" type="number" min="1" max="13" value={target?.year_level||''} onChange={e=>setTarget(t=>({...t, year_level:e.target.value}))}/>
            </div>
            <div>
              <label className="small">Care group</label>
              <input className="input" value={target?.care_group||''} onChange={e=>setTarget(t=>({...t, care_group:e.target.value}))}/>
            </div>
            <div>
              <label className="small">Emergency name</label>
              <input className="input" value={target?.emergency_contact_name||''} onChange={e=>setTarget(t=>({...t, emergency_contact_name:e.target.value}))}/>
            </div>
            <div>
              <label className="small">Emergency phone</label>
              <input className="input" value={target?.emergency_contact_phone||''} onChange={e=>setTarget(t=>({...t, emergency_contact_phone:e.target.value}))}/>
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

          <div className="flex" style={{gap:8, marginTop:10}}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Save'}</button>
            <button className="btn btn-ghost" onClick={()=>setTarget(prev=>({...prev}))}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
