// src/App.jsx (FULL REPLACEMENT)
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

// Layout & navigation
import Sidebar from './components/Sidebar'

// Pages / panels
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
import Settings from './components/Settings'
import Numpad from './components/Numpad'

// Theme
import ThemeControls from './components/ThemeControls'
import { applyTheme } from './theme'

/* -------------------- Helpers -------------------- */
function getThemePrefs(uid = 'anon') {
  const key = `theme_${uid}`
  const mode = localStorage.getItem(`${key}_mode`) || 'light'
  const theme = localStorage.getItem(`${key}_theme`) || 'cirrus'
  return { key, mode, theme }
}

/* Light/Dark toggle button (no props; always respects current user’s theme prefs) */
function ToggleLightDark({ user }) {
  const uid = user?.id || 'anon'
  const { key } = useMemo(() => getThemePrefs(uid), [uid])

  const handleToggle = () => {
    const currentMode = localStorage.getItem(`${key}_mode`) || 'light'
    const nextMode = currentMode === 'dark' ? 'light' : 'dark'
    localStorage.setItem(`${key}_mode`, nextMode)

    // keep <html> in sync
    document.documentElement.classList.toggle('dark', nextMode === 'dark')

    // re-apply theme with new mode
    const theme = localStorage.getItem(`${key}_theme`) || 'cirrus'
    applyTheme(theme, nextMode)
  }

  const label = (() => {
    const currentMode = localStorage.getItem(`${key}_mode`) || 'light'
    return currentMode === 'dark' ? '🌙 Dark' : '🌞 Light'
  })()

  return (
    <button className="btn xs" onClick={handleToggle} title="Toggle light/dark">
      {label}
    </button>
  )
}

/* Simple code login: 6-digit (students) or 8-digit (staff/admin) */
function Login({ onLogin }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('code', code.trim())
        .single()
      if (error || !data) throw error || new Error('Invalid ID')
      onLogin(data)
    } catch (err) {
      setError('Invalid code. Try a demo: student 100001 • teacher 20000001 • admin 90000001.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass card" style={{ maxWidth: 480, margin: '40px auto' }}>
      <h2 style={{ marginBottom: 8 }}>Sign in</h2>
      <p className="small" style={{ marginTop: 0, opacity: 0.85 }}>
        Enter your 6-digit student ID or 8-digit staff/admin ID.
      </p>
      <form onSubmit={submit} className="row" style={{ gridTemplateColumns: '1fr auto' }}>
        <input
          className="input"
          inputMode="numeric"
          placeholder="e.g. 100001"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error && (
        <div className="small" style={{ color: '#ef4444', marginTop: 8 }}>{error}</div>
      )}
    </div>
  )
}

/* Main frame swaps pages based on role + current tab */
function Frame({ user, page }) {
  const role = user?.role

  // available to everyone unless hidden by role switch below
  const renderCommon = (key) => {
    switch (key) {
      case 'overview':     return <Overview user={user} />
      case 'profile':      return <Profile user={user} />
      case 'calendar':     return <Calendar user={user} />
      case 'assignments':  return <Assignments user={user} />
      case 'wallet':       return <Wallet user={user} />
      case 'library':      return <Library user={user} />
      case 'appointments': return <Appointments user={user} />
      case 'bulletin':     return <BulletinBoard user={user} />
      case 'map':          return <MapPanel />
      case 'lunch':        return <Lunch user={user} />
      case 'teacherpanel': return <TeacherPanel user={user} />
      case 'adminpanel':   return <AdminPanel user={user} />
      case 'settings':    return <Settings />
      default:             return <Overview user={user} />
    }
  }

  // Role-based gating (teachers & admins can see the extra panels)
  if (role === 'teacher') {
    return <div className="content">{renderCommon(page)}</div>
  }
  if (role === 'admin') {
    return <div className="content">{renderCommon(page)}</div>
  }
  if (role === 'wellbeing') {
    // wellbeing staff don’t usually need Assignments/Wallet, but keep common pages
    return <div className="content">{renderCommon(page)}</div>
  }
  // students
  return <div className="content">{renderCommon(page)}</div>
}

export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('overview')

  // Apply theme (background gradient + glass tint) on first load and on user change
  useEffect(() => {
    const uid = user?.id || 'anon'
    const { key, mode, theme } = getThemePrefs(uid)
    // store back to ensure keys exist
    localStorage.setItem(`${key}_mode`, mode)
    localStorage.setItem(`${key}_theme`, theme)
    document.documentElement.classList.toggle('dark', mode === 'dark')
    applyTheme(theme, mode)
  }, [user?.id])

  return (
    <div className="container">
      {/* Header */}
      <div className="glass header">
        <div className="brand">Nexus Panel</div>

        <div className="headerRight">
          {/* Theme dropdown first */}
          <ThemeControls user={user} />

          {/* Light/Dark toggle second */}
          <ToggleLightDark user={user} />

          {/* Logout last */}
          {user && (
            <button
              className="btn xs"
              onClick={() => {
                setUser(null)
                setPage('overview')
              }}
              title="Logout"
            >
              Logout
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!user ? (
        <Login onLogin={(u) => { setUser(u); setPage('overview') }} />
      ) : (
        <div className="layout">
          <Sidebar
            user={user}
            active={page}
            onNavigate={(key) => setPage(key)}
          />
          <Frame user={user} page={page} />
        </div>
      )}

      <div className="footer small">Nexus Panel Official Demo</div>
      <Numpad />
    </div>
  )
}
