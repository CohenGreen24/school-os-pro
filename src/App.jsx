// src/App.jsx — DROP-IN
import React from 'react'
import { supabase } from './supabase'

// Pages (make sure these exist)
import Login from './components/Login'
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
import AdminPanel from './components/AdminPanel'

// Theme (Supabase-backed)
import ThemeControls from './components/ThemeControls'

// -----------------------------
// Page list & visibility rules
// -----------------------------
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

// -----------------------------
// Sidebar (icon + label only)
// -----------------------------
function Sidebar({ user, page, setPage }) {
  const visible = PAGES.filter(p => {
    if (p.key !== 'admin') return true
    return ['admin','teacher','wellbeing'].includes(user?.role)
  })

  return (
    <nav className="glass card sidebarNav">
      <div className="brand">
        <div>
          <div className="title">EduGate</div>
          <div className="subtitle small">School OS</div>
        </div>
      </div>

      <div className="nav">
        {visible.map(p => (
          <div
            key={p.key}
            className={`navItem ${page === p.key ? 'active' : ''}`}
            onClick={() => setPage(p.key)}
          >
            <div className="navIcon" aria-hidden>{p.icon}</div>
            <div className="navLabel">{p.label}</div>
          </div>
        ))}
      </div>
    </nav>
  )
}

// -----------------------------
// Topbar (ThemeControls + Logout)
// -----------------------------
function Topbar({ user, onLogout }) {
  return (
    <div className="glass card topbar">
      <div className="brand"><strong>EduGate</strong></div>
      <div className="headerRight">
        {user && <span className="small pill">{user.name} • {user.role}</span>}
        {/* ThemeControls stores palette+mode in Supabase for this user */}
        <ThemeControls user={user} />
        {user && (
          <button className="btn xs" onClick={onLogout}>
            Logout
          </button>
        )}
      </div>
    </div>
  )
}

// -----------------------------
// App Shell
// -----------------------------
export default function App() {
  const [user, setUser] = React.useState(null)
  const [page, setPage] = React.useState('overview')

  const handleLogout = () => {
    setUser(null)
    setPage('overview')
  }

  // Optional: prefetch some lightweight project health (not required)
  React.useEffect(() => {
    // Ensure we have a wallet row for logged-in user (nice-to-have)
    const ensureWallet = async () => {
      if (!user?.id) return
      await supabase.from('wallets').insert({ user_id: user.id, balance: 0 }).select().single().then(() => {}).catch(()=>{})
    }
    ensureWallet()
  }, [user?.id])

  if (!user) {
    return (
      <div className="container">
        <Topbar user={null} onLogout={handleLogout} />
        <Login onLogin={(u) => { setUser(u); setPage('overview') }} />
      </div>
    )
  }

  return (
    <div className="container">
      <Topbar user={user} onLogout={handleLogout} />

      <div className="layout">
        <Sidebar user={user} page={page} setPage={setPage} />

        <main className="content">
          {page === 'overview'     && <Overview user={user} go={setPage} />}
          {page === 'profile'      && <Profile user={user} />}
          {page === 'calendar'     && <Calendar user={user} />}
          {page === 'assignments'  && <Assignments user={user} />}
          {page === 'wallet'       && <Wallet user={user} />}
          {page === 'library'      && <Library user={user} />}
          {page === 'appointments' && <Appointments user={user} />}
          {page === 'bulletin'     && <BulletinBoard user={user} />}
          {page === 'map'          && <MapPanel user={user} />}
          {page === 'lunch'        && <Lunch user={user} />}
          {page === 'admin'        && <AdminPanel user={user} />}
        </main>
      </div>

      <div className="footer small">© School OS Demo</div>
    </div>
  )
}
