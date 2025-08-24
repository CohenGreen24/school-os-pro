// src/App.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

// Pages
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

// If you have applyTheme/theme controls, they are no longer required.
// We do theme switching by toggling classes on <html> (document.documentElement).

/* ------------------------- Theme Handling ------------------------- */
const THEMES = [
  { key: 'theme-breeze', label: 'Breeze' },   // modern sky-blue
  { key: 'theme-mint',   label: 'Mint'   },
  { key: 'theme-sunset', label: 'Sunset' },
  { key: 'theme-grape',  label: 'Grape'  },
  { key: 'theme-slate',  label: 'Slate'  },
]

function useTheme() {
  const [mode, setMode] = useState(localStorage.getItem('mode') || 'light') // 'light' | 'dark'
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'theme-breeze')

  useEffect(() => {
    const root = document.documentElement
    // mode
    root.classList.toggle('dark', mode === 'dark')
    localStorage.setItem('mode', mode)
    // theme classes (remove old, add new)
    THEMES.forEach(t => root.classList.remove(t.key))
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [mode, theme])

  return { mode, setMode, theme, setTheme }
}

/* ------------------------- Login ------------------------- */
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
        .maybeSingle()

      if (error || !data) throw error || new Error('Not found')
      onLogin(data)
    } catch (e) {
      setError('Invalid code. Try a valid student (6-digit) or teacher/admin/wellbeing (8-digit) ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="glass card" style={{ maxWidth: 520, margin: '40px auto' }}>
      <h2 style={{ margin: '4px 0 8px' }}>Sign in</h2>
      <p className="small" style={{ marginTop: 0, opacity: .8 }}>
        Enter your 6-digit student ID or 8-digit teacher/admin/wellbeing ID.
      </p>
      <form onSubmit={submit} className="flex" style={{ gap: 8 }}>
        <input
          className="input"
          placeholder="e.g. 100001"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {error && <div className="small" style={{ color: '#ef4444', marginTop: 8 }}>{error}</div>}
    </div>
  )
}

/* ------------------------- Pages ------------------------- */
const PAGES = [
  { key: 'overview',    icon: '🏠', label: 'Overview' },
  { key: 'profile',     icon: '👤', label: 'Profile' },
  { key: 'calendar',    icon: '📅', label: 'Calendar' },
  { key: 'assignments', icon: '✅', label: 'Assignments' },
  { key: 'wallet',      icon: '💳', label: 'Wallet' },
  { key: 'library',     icon: '📚', label: 'Library' },
  { key: 'appointments',icon: '🧑‍⚕️', label: 'Wellbeing' },
  { key: 'bulletin',    icon: '📣', label: 'Bulletin' },
  { key: 'map',         icon: '🗺️', label: 'Map' },
  { key: 'lunch',       icon: '🍽️', label: 'Lunch' },
]

/* ------------------------- Frame (router-ish) ------------------------- */
function Frame({ user, page, setPage }) {
  // onGo allows Overview to trigger navigation (e.g., to lunch/map/assignments)
  const onGo = (dest) => setPage(dest)

  if (!user) return null

  // teacher/admin/wellbeing can still use same pages; each page can gate features by role internally
  return (
    <div className="content">
      {page === 'overview'    && <Overview user={user} onGo={onGo} />}
      {page === 'profile'     && <Profile user={user} />}
      {page === 'calendar'    && <Calendar user={user} />}
      {page === 'assignments' && <Assignments user={user} admin={user.role !== 'student'} />}
      {page === 'wallet'      && <Wallet user={user} admin={user.role !== 'student'} />}
      {page === 'library'     && <Library user={user} />}
      {page === 'appointments'&& <Appointments user={user} admin={user.role !== 'student'} />}
      {page === 'bulletin'    && <BulletinBoard user={user} />}
      {page === 'map'         && <MapPanel user={user} />}
      {page === 'lunch'       && <Lunch user={user} />}
    </div>
  )
}

/* ------------------------- App Shell ------------------------- */
export default function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('overview')
  const { mode, setMode, theme, setTheme } = useTheme()

  // Persist last visited page per user (optional nicety)
  useEffect(() => {
    if (!user?.id) return
    const key = `last_page_${user.id}`
    const saved = localStorage.getItem(key)
    if (saved) setPage(saved)
  }, [user?.id])
  useEffect(() => {
    if (!user?.id) return
    const key = `last_page_${user.id}`
    localStorage.setItem(key, page)
  }, [page, user?.id])

  // Sidebar items – could be filtered by role if you want
  const navItems = useMemo(() => PAGES, [])

  return (
    <div className="container">
      {/* Top bar */}
      <div className="glass header">
        <div className="headerLeft">
          <div className="brand">Nexus Panel</div>
          {user && <span className="small glass pill">{user.name} • {user.role}</span>}
        </div>
        <div className="headerRight">
          {/* Theme select */}
          <select
            className="input xs"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            aria-label="Theme"
            style={{ maxWidth: 180 }}
          >
            {THEMES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>

          {/* Light/Dark toggle */}
          <button
            className="btn xs"
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle light/dark"
          >
            {mode === 'dark' ? '🌙 Dark' : '🌞 Light'}
          </button>

          {/* Logout */}
          {user && (
            <button
              className="btn xs"
              onClick={() => { setUser(null); setPage('overview') }}
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
            page={page}
            setPage={setPage}
            // Sidebar expects items with {key, icon, label}
            items={navItems}
          />
          <Frame user={user} page={page} setPage={setPage} />
        </div>
      )}

      <div className="footer small">Official Nexus Panel Demo</div>
    </div>
  )
}
