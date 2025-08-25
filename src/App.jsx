// src/App.jsx
import React from 'react'
import { supabase } from './supabase'
import Login from './components/Login'
import Overview from './components/Overview'
import Profile from './components/Profile'
import Calendar from './components/Calendar'
import Assignments from './components/Assignments'   // keep your existing or stub
import Wallet from './components/Wallet'             // keep your existing or stub
import Library from './components/Library'           // keep your existing or stub
import Appointments from './components/Appointments' // keep your existing or stub
import BulletinBoard from './components/BulletinBoard'
import MapPanel from './components/MapPanel'
import Lunch from './components/Lunch'
import AdminPanel from './components/AdminPanel'
import { useUserSetting } from './hooks/useSettings'

const PAGES = [
  { key:'overview',    icon:'🏠', label:'Overview' },
  { key:'profile',     icon:'👤', label:'Profile' },
  { key:'calendar',    icon:'📅', label:'Calendar' },
  { key:'assignments', icon:'✅', label:'Assignments' },
  { key:'wallet',      icon:'💳', label:'Wallet' },
  { key:'library',     icon:'📚', label:'Library' },
  { key:'appointments',icon:'🧑‍⚕️', label:'Wellbeing' },
  { key:'bulletin',    icon:'📣', label:'Bulletin' },
  { key:'map',         icon:'🗺️', label:'Map' },
  { key:'lunch',       icon:'🍽️', label:'Lunch' },
  { key:'admin',       icon:'🛠️', label:'Admin' },
]

function Sidebar({ user, page, setPage }) {
  const { value: order, setValue: saveOrder } = useUserSetting(user,'sidebar_order', PAGES.map(p=>p.key))
  const list = (order && Array.isArray(order) ? order : PAGES.map(p=>p.key))
    .map(k => PAGES.find(x=>x.key===k)).filter(Boolean)
    .filter(p => (p.key!=='admin') ? true : ['admin','teacher'].includes(user?.role))

  return (
    <nav className="glass card sidebarNav">
      <div className="brand">
        <div>
          <div className="title">EduGate</div>
          <div className="subtitle small">School OS</div>
        </div>
      </div>
      <div className="nav">
        {list.map(p => (
          <div key={p.key} className={`navItem ${page===p.key?'active':''}`} onClick={()=>setPage(p.key)}>
            <div className="navIcon">{p.icon}</div>
            <div className="navLabel">{p.label}</div>
          </div>
        ))}
      </div>
    </nav>
  )
}

function Topbar({ user, theme, setTheme, onLogout }) {
  const toggle = () => setTheme(theme==='dark'?'light':'dark')
  return (
    <div className="glass card topbar">
      <div className="brand"><strong>EduGate</strong></div>
      <div className="headerRight">
        {user && <span className="small pill">{user.name} • {user.role}</span>}
        <select className="input xs" value={theme} onChange={e=>setTheme(e.target.value)}>
          <option value="light">Classic</option>
          <option value="dark">Dark</option>
        </select>
        <div className={`switch ${theme==='dark'?'on':''}`} onClick={toggle}><div className="knob"/></div>
        {user && <button className="btn xs" onClick={onLogout}>Logout</button>}
      </div>
    </div>
  )
}

function useThemeOnSupabase(user) {
  const { value: theme, setValue: saveTheme } = useUserSetting(user, 'theme', 'light')
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme==='dark')
  }, [theme])
  return [theme, saveTheme]
}

export default function App() {
  const [user,setUser] = React.useState(null)
  const [page,setPage] = React.useState('overview')
  const [theme,setTheme] = useThemeOnSupabase(user)

  const logout = ()=> { setUser(null); setPage('overview') }

  if (!user) return <Login onLogin={(u)=>{ setUser(u); setPage('overview') }} />

  return (
    <div className="container">
      <Topbar user={user} theme={theme} setTheme={setTheme} onLogout={logout}/>
      <div className="layout">
        <Sidebar user={user} page={page} setPage={setPage}/>
        <main className="content">
          {page==='overview'    && <Overview user={user} go={setPage}/>}
          {page==='profile'     && <Profile user={user}/>}
          {page==='calendar'    && <Calendar user={user}/>}
          {page==='assignments' && <Assignments user={user}/>}
          {page==='wallet'      && <Wallet user={user}/>}
          {page==='library'     && <Library user={user}/>}
          {page==='appointments'&& <Appointments user={user}/>}
          {page==='bulletin'    && <BulletinBoard user={user}/>}
          {page==='map'         && <MapPanel user={user}/>}
          {page==='lunch'       && <Lunch user={user}/>}
          {page==='admin'       && <AdminPanel user={user}/>}
        </main>
      </div>
      <div className="footer small">© School OS Demo</div>
    </div>
  )
}
