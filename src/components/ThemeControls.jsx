import React from 'react'
import { THEMES, applyTheme } from '../theme'

export default function ThemeControls({ user }){
  const uid = user?.id || 'anon'
  const key = `theme_${uid}`

  const [mode,setMode]     = React.useState(()=> localStorage.getItem(`${key}_mode`)   || 'light')
  const [theme,setTheme]   = React.useState(()=> localStorage.getItem(`${key}_theme`)  || 'classic')
  const [accent,setAccent] = React.useState(()=> localStorage.getItem(`${key}_accent`) || '#0ea5e9')

  React.useEffect(()=>{
    document.documentElement.classList.toggle('dark', mode==='dark')
    localStorage.setItem(`${key}_mode`, mode)
  },[mode, key])

  React.useEffect(()=>{
    applyTheme(theme, accent)
    localStorage.setItem(`${key}_theme`, theme)
    localStorage.setItem(`${key}_accent`, accent)
  },[theme, accent, key])

  return (
    <div className="flex" style={{gap:8, alignItems:'center'}}>
      {/* Mode toggle */}
      <button
        className="btn xs"
        onClick={()=> setMode(m=> m==='dark' ? 'light' : 'dark')}
        title="Toggle light/dark"
      >
        {mode==='dark' ? '🌙 Dark' : '🌞 Light'}
      </button>

      {/* Theme dropdown */}
      <select className="input xs" value={theme} onChange={e=>setTheme(e.target.value)} title="Theme">
        {Object.entries(THEMES).map(([k,v])=>(
          <option key={k} value={k}>{v.name}</option>
        ))}
      </select>

      {/* Accent */}
      <input className="input xs" type="color" value={accent} onChange={e=>setAccent(e.target.value)} title="Accent" />
    </div>
  )
}
