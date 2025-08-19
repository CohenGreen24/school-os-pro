// src/App.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'
import Sidebar from './components/Sidebar'
import Overview from './components/Overview'
import Profile from './components/Profile'
import Calendar from './components/Calendar'
import Assignments from './components/Assignments'
import Wallet from './components/Wallet'
import Library from './components/Library'
import Appointments from './components/Appointments'
import BulletinBoard from './components/BulletinBoard'
import MapPanel from './components/MapPanel'
import Lunch from './components/Lunch'
import TeacherPanel from './components/TeacherPanel'
import AdminPanel from './components/AdminPanel'
import ThemeControls from './components/ThemeControls'
import { applyTheme } from './theme'

function Login({ onLogin }) {
  const [code,setCode] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { data, error } = await supabase.from('users').select('*').eq('code', code.trim()).single()
      if (error || !data) throw error || new Error('Not found')
      onLogin(data)
    } catch {
      setError('Invalid code.')
    } finally { setLoading(false) }
  }
  return (
    <div className="glass card" style={{maxWidth:480, margin:'40px auto'}}>
      <h2 style={{marginBottom:8}}>Sign in</h2>
      <p className="small" style={{marginTop:0,opacity:.8}}>Enter your 6-digit student ID or 8-digit staff ID.</p>
      <form onSubmit={submit} className="row" style={{gridTemplateColumns:'1fr auto'}}>
        <input className="input" placeholder="e.g. 100001" value={code} onChange={e=>setCode(e.target.value)} inputMode="numeric"/>
        <button className="btn btn-primary" disabled={loading}>{loading?'Signing in…':'Sign in'}</button>
      </form>
      {error && <div className="small" style={{color:'#ef4444',marginTop:8}}>{error}</div>}
    </div>
  )
}

function Frame({ user, page }) {
  return (
    <div className="content">
      {page==='overview'     && <Overview user={user}/>}
      {page==='profile'      && <Profile user={user} canManageStudent={user.role!=='student'} />}
      {page==='calendar'     && <Calendar user={user}/>}
      {page==='assignments'  && <Assignments user={user} admin={user.role!=='student'} />}
      {page==='wallet'       && <Wallet user={user} admin={user.role!=='student'} />}
      {page==='library'      && <Library user={user}/>}
      {page==='appointments' && <Appointments user={user} admin={user.role!=='student'} />}
      {page==='bulletin'     && <BulletinBoard user={user}/>}
      {page==='map'          && <MapPanel/>}
      {page==='lunch'        && <Lunch user={user}/>}

      {page==='teacherpanel' && <TeacherPanel user={user} />}
      {page==='adminpanel'   && <AdminPanel   user={user} />}
    </div>
  )
}

export default function App() {
  const [user,setUser] = useState(null)
  const [page,setPage] = useState('overview')

  // Apply persisted theme at boot / on user change
  useEffect(()=>{
    const uid = user?.id || 'anon'
    const key = `theme_${uid}`
    const mode  = localStorage.getItem(`${key}_mode`)  || 'light'
    const theme = localStorage.getItem(`${key}_theme`) || 'cirrus'
    document.documentElement.classList.toggle('dark', mode==='dark')
    applyTheme(theme)
  }, [user?.id])

  return (
    <div className="container">
      {/* Single top bar */}
      <div className="topbar glass" style={{marginBottom:12}}>
        <div><b>EduGate</b>{user ? <span className="small" style={{marginLeft:8,opacity:.7}}>Welcome, {user.name} • {user.role}</span> : null}</div>
        {user && <ThemeControls user={user} />}
      </div>

      {!user ? (
        <Login onLogin={(u)=>{ setUser(u); setPage('overview') }} />
      ) : (
        <div className="layout">
          <Sidebar user={user} active={page} onNavigate={setPage} />
          <Frame user={user} page={page}/>
        </div>
      )}

      <div className="footer small" style={{marginTop:12}}>© School OS Demo</div>
    </div>
  )
}
