// src/components/Login.jsx
import React from 'react'
import { supabase } from '../supabase'

export default function Login({ onLogin }) {
  const [code,setCode] = React.useState('')
  const [error,setError] = React.useState('')
  const [loading,setLoading] = React.useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.from('users').select('*').eq('code', code.trim()).maybeSingle()
      if (error || !data) throw new Error('Invalid ID')
      onLogin(data)
    } catch (err) {
      setError('Invalid ID. Check your 6-digit (student) or 8-digit (staff) code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="center" style={{minHeight:'70vh'}}>
      <div className="glass card" style={{maxWidth:720, width:'100%', padding:24}}>
        <div style={{display:'grid', gridTemplateColumns:'1.1fr 1fr', gap:16}}>
          <div style={{paddingRight:8}}>
            <h1 style={{margin:'4px 0 8px'}}>Welcome to <span style={{color:'var(--accent)'}}>EduGate</span></h1>
            <p className="small" style={{marginTop:0}}>
              Your classes, wellbeing, lunch, library, assignments and more — all in one tidy place.
            </p>
            <img alt="" src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=1200&q=60" style={{borderRadius:12, marginTop:8}}/>
          </div>
          <form onSubmit={submit} className="glass card" style={{padding:16, display:'flex', flexDirection:'column', gap:10}}>
            <label className="small">Student/Staff ID</label>
            <input className="input" placeholder="e.g. 100001 (student) or 20000001 (staff)" value={code} onChange={e=>setCode(e.target.value)} />
            <button className="btn btn-primary" disabled={loading}>{loading?'Signing in…':'Sign in'}</button>
            {error && <div className="small" style={{color:'#ef4444'}}>{error}</div>}
            <div className="small" style={{opacity:.85}}>
              Tip for demo: create codes in <b>users</b> table (role = student/teacher/wellbeing/admin).
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
