// src/components/ThemeControls.jsx  (FULL REPLACEMENT)
import React from 'react'
import { THEMES, applyTheme } from '../theme'

export default function ThemeControls({ user }) {
  const uid = user?.id || 'anon'
  const key = `theme_${uid}`
  const [theme, setTheme] = React.useState(
    () => localStorage.getItem(`${key}_theme`) || 'cirrus'
  )

  React.useEffect(() => {
    const mode = localStorage.getItem(`${key}_mode`) || 'light' // respect current mode
    localStorage.setItem(`${key}_theme`, theme)
    applyTheme(theme, mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  return (
    <select
      className="input xs"
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
      title="Theme"
    >
      {Object.entries(THEMES).map(([k, v]) => (
        <option key={k} value={k}>{v.name}</option>
      ))}
    </select>
  )
}
