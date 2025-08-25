// src/components/ThemeControls.jsx
import React from 'react'
import { useUserSetting } from '../hooks/useSettings'

const palettes = [
  { key:'classic', label:'Classic' },
  { key:'mint',    label:'Mint' },
  { key:'sunset',  label:'Sunset' },
  { key:'grape',   label:'Grape' },
  { key:'slate',   label:'Slate' },
  { key:'sky',     label:'Azure' } // not "sky blue" by name
]

function applyPalette(palette, mode){
  const r = document.documentElement
  const set = (k,v)=>r.style.setProperty(k,v)
  // Backdrops
  if (palette==='mint'){
    set('--bg-grad', mode==='dark'
      ? 'radial-gradient(1200px 900px at 40% 20%, #0b1614, #0d1413 52%, #0b1110)'
      : 'linear-gradient(135deg,#e7fff5,#d3ffe9 45%,#c5ffe2)'
    )
    set('--accent', '#10b981')
  } else if (palette==='sunset'){
    set('--bg-grad', mode==='dark'
      ? 'radial-gradient(1200px 900px at 40% 20%, #1a1012, #120b0d 52%, #0f090b)'
      : 'linear-gradient(135deg,#ffe9e5,#ffd7d0 45%,#ffc5bd)'
    )
    set('--accent', '#f97316')
  } else if (palette==='grape'){
    set('--bg-grad', mode==='dark'
      ? 'radial-gradient(1200px 900px at 40% 20%, #140e1a, #100b14 52%, #0d0911)'
      : 'linear-gradient(135deg,#f1e6ff,#e6d6ff 45%,#d8c2ff)'
    )
    set('--accent', '#8b5cf6')
  } else if (palette==='slate'){
    set('--bg-grad', mode==='dark'
      ? 'radial-gradient(1200px 900px at 40% 20%, #0c1016, #0a0e14 52%, #090d12)'
      : 'linear-gradient(135deg,#e8eef6,#dbe5f0 45%,#cfd8e6)'
    )
    set('--accent', '#64748b')
  } else if (palette==='sky'){
    set('--bg-grad', mode==='dark'
      ? 'radial-gradient(1200px 900px at 40% 20%, #0b1220, #0b0f1a 52%, #0a0e16)'
      : 'linear-gradient(135deg,#eaf5ff,#d8ecff 45%,#c9e4ff)'
    )
    set('--accent', '#0ea5e9')
  } else {
    // classic default
    set('--bg-grad', mode==='dark'
      ? 'radial-gradient(1200px 900px at 40% 20%, #0b1220, #0b0f1a 52%, #0a0e16)'
      : 'linear-gradient(135deg,#eaf5ff,#d8ecff 45%,#c9e4ff)'
    )
    set('--accent', '#0ea5e9')
  }
}

export default function ThemeControls({ user }) {
  const { value: mode, setValue: setMode } = useUserSetting(user, 'theme_mode', 'light')
  const { value: palette, setValue: setPalette } = useUserSetting(user, 'theme_palette', 'classic')

  React.useEffect(()=>{
    document.documentElement.classList.toggle('dark', mode==='dark')
    applyPalette(palette, mode)
  }, [mode, palette])

  return (
    <div className="flex" style={{gap:8, alignItems:'center'}}>
      <select className="input xs" value={palette} onChange={e=>setPalette(e.target.value)}>
        {palettes.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <div className={`switch ${mode==='dark'?'on':''}`} onClick={()=>setMode(mode==='dark'?'light':'dark')}>
        <div className="knob"/>
      </div>
    </div>
  )
}
