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
import ThemeControls from './components/ThemeControls'
import { applyTheme } from './theme'


function useTheme() {
  const [theme,setTheme] = useState(localStorage.getItem('theme') || 'light')
  useEffect(() => {
    const r=document.documentElement
    if(theme==='dark') r.classList.add('dark'); else r.classList.remove('dark')
    localStorage.setItem('theme', theme)
  }, [theme])
  return { theme, setTheme }
}

function Toggle({theme,setTheme}) {
  return (
    <button className="btn" onClick={() => setTheme(theme==='dark'?'light':'dark')}>
      {theme==='dark' ? '🌙 Dark' : '🌞 Light'} <ThemeControls user={user} />

    </button>
    
  )
}

function Login({ onLogin }) {
  const [code,setCode] = useState('')
  const [error,setError] = useState('')
  const [loading,setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase.from('users').select('*').eq('code', code).single()
      if (error || !data) throw error || new Error('Not found')
      onLogin(data)
    } catch {
      setError('Invalid code. Try: 100001 (student), 20000001 (teacher), 80000001 (wellbeing).')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass card" style={{maxWidth:480, margin:'40px auto'}}>
      <h2 style={{marginBottom:8}}>Sign in</h2>
      <p className="small" style={{marginTop:0,opacity:.8}}>
        Enter your 6-digit student ID or 8-digit teacher/wellbeing ID.
      </p>
      <form onSubmit={submit} className="row" style={{gridTemplateColumns:'1fr auto'}}>
        <input className="input" placeholder="e.g. 100001" value={code} onChange={e=>setCode(e.target.value)}/>
        <button className="btn btn-primary" disabled={loading}>{loading?'Signing in…':'Sign in'}</button>
      </form>
      {error && <div className="small" style={{color:'#ef4444',marginTop:8}}>{error}</div>}
    </div>
  )
}

const DEFAULT_PAGES = [
  { key:'overview',    label:'🏠 Overview' },
  { key:'profile',     label:'👤 Profile' },
  { key:'calendar',    label:'📅 Calendar' },
  { key:'assignments', label:'✅ Assignments' },
  { key:'wallet',      label:'💳 Wallet' },
  { key:'library',     label:'📚 Library' },
  { key:'appointments',label:'🧑‍⚕️ Wellbeing' },
  { key:'bulletin',    label:'📣 Bulletin' },
  { key:'map',         label:'🗺️ Map' },
  { key:'lunch',       label:'🍽️ Lunch' },
]

function Frame({ user, page }) {
  // Teachers see admin versions; wellbeing staff see appointment tools
  if (user.role === 'teacher') {
    return (
      <div className="content">
        {page==='overview'    && <Overview user={user}/>}
        {page==='profile'     && <Profile user={user} canManageStudent/>}
        {page==='calendar'    && <Calendar user={user}/>}
        {page==='assignments' && <Assignments user={user} admin/>}
        {page==='wallet'      && <Wallet user={user} admin/>}
        {page==='library'     && <Library user={user}/>}
        {page==='appointments'&& <Appointments user={user} admin/>}
        {page==='bulletin'    && <BulletinBoard user={user}/>}
        {page==='map'         && <MapPanel/>}
        {page==='lunch'       && <Lunch user={user}/>}
      </div>
    )
  }
  if (user.role === 'wellbeing') {
    return (
      <div className="content">
        {page==='overview'    && <Overview user={user}/>}
        {page==='profile'     && <Profile user={user}/>}
        {page==='appointments'&& <Appointments user={user} admin/>}
        {page==='bulletin'    && <BulletinBoard user={user}/>}
        {page==='map'         && <MapPanel/>}
        {page==='lunch'       && <Lunch user={user}/>}
      </div>
    )
  }
  // Students
  return (
    <div className="content">
      {page==='overview'    && <Overview user={user}/>}
      {page==='profile'     && <Profile user={user}/>}
      {page==='calendar'    && <Calendar user={user}/>}
      {page==='assignments' && <Assignments user={user}/>}
      {page==='wallet'      && <Wallet user={user}/>}
      {page==='library'     && <Library user={user}/>}
      {page==='appointments'&& <Appointments user={user}/>}
      {page==='bulletin'    && <BulletinBoard user={user}/>}
      {page==='map'         && <MapPanel/>}
      {page==='lunch'       && <Lunch user={user}/>}
    </div>
  )
}

export default function App() {
  const [user,setUser] = useState(null)
  const { theme, setTheme } = useTheme()
  const [page,setPage] = useState('overview')

  return (
    <div className="container">
      <div className="glass header">
        <div className="brand">EduGate</div>
        <div className="flex">
          {user && <span className="small glass pill">{user.name} • {user.role}</span>}
          <Toggle theme={theme} setTheme={setTheme} />
          {user && <button className="btn" onClick={()=>{ setUser(null); setPage('overview') }}>Logout</button>}
        </div>
      </div>

      {!user ? (
        <Login onLogin={(u)=>{ setUser(u); setPage('overview') }} />
      ) : (
        <div className="layout">
          <Sidebar user={user} page={page} setPage={setPage} defaultPages={DEFAULT_PAGES}/>
          <Frame user={user} page={page}/>
        </div>
      )}

      <div className="footer small">© School OS Demo</div>
    </div>
  )
}
React.useEffect(()=>{
  const key = `theme_${user.id}`
  const theme = localStorage.getItem(`${key}_theme`) || 'classic'
  const accent = localStorage.getItem(`${key}_accent`) || '#0ea5e9'
  const mode = localStorage.getItem(`${key}_mode`) || 'light'
  document.documentElement.classList.toggle('dark', mode==='dark')
  applyTheme(theme, accent)
}, [user.id])
