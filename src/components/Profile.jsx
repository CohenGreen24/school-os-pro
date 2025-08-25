// src/components/Profile.jsx
import React from 'react'
import { supabase } from '../supabase'

export default function Profile({ user }) {
  const [form, setForm] = React.useState(user || {})
  React.useEffect(()=>setForm(user||{}),[user?.id])

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return
    const path = `${user.id}/${Date.now()}_${f.name}`
    const { error } = await supabase.storage.from('avatars').upload(path, f, { upsert:false })
    if (error) return alert(error.message)
    const { data: { publicUrl }} = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id)
    setForm(s=>({ ...s, avatar_url: publicUrl }))
  }

  const save = async () => {
    const { error } = await supabase.from('users').update({
      name: form.name, year_level: form.year_level, care_group: form.care_group, email: form.email
    }).eq('id', user.id)
    if (error) alert(error.message); else alert('Saved.')
  }

  return (
    <div className="glass card" style={{padding:10}}>
      <div className="row" style={{gridTemplateColumns:'240px 1fr'}}>
        <div className="glass card center" style={{gap:10}}>
          <img className="avatar" alt={form.name} src={form.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed='+encodeURIComponent(form.name||'')} />
          <label className="btn xs">
            Upload photo
            <input type="file" accept="image/*" onChange={onFile} style={{display:'none'}} />
          </label>
        </div>
        <div className="glass card" style={{display:'grid', gap:8}}>
          <div className="profileGrid">
            <div>
              <label className="small">Full name</label>
              <input className="input" value={form.name||''} onChange={e=>setForm(s=>({...s,name:e.target.value}))}/>
            </div>
            <div>
              <label className="small">Email</label>
              <input className="input" value={form.email||''} onChange={e=>setForm(s=>({...s,email:e.target.value}))}/>
            </div>
            <div>
              <label className="small">Year level</label>
              <input className="input" value={form.year_level||''} onChange={e=>setForm(s=>({...s,year_level:e.target.value}))}/>
            </div>
            <div>
              <label className="small">Care group</label>
              <input className="input" value={form.care_group||''} onChange={e=>setForm(s=>({...s,care_group:e.target.value}))}/>
            </div>
          </div>
          <div><button className="btn btn-primary" onClick={save}>Save</button></div>
        </div>
      </div>
    </div>
  )
}
