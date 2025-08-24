// src/components/Settings.jsx
import React from 'react'

export default function Settings() {
  const [enabled, setEnabled] = React.useState(
    () => localStorage.getItem('numpad_enabled') !== 'false'
  )
  const save = (v)=>{
    setEnabled(v)
    localStorage.setItem('numpad_enabled', v ? 'true' : 'false')
    // notify other tabs
    window.dispatchEvent(new StorageEvent('storage', { key:'numpad_enabled', newValue: v ? 'true' : 'false' }))
  }
  return (
    <div className="glass card" style={{maxWidth:560}}>
      <h3 style={{marginTop:0}}>Settings</h3>
      <div className="row" style={{gridTemplateColumns:'1fr auto', alignItems:'center'}}>
        <div>
          <div><b>Numeric keypad for inputs</b></div>
          <div className="small">Show a horizontal number bar (1–10, ⌫, ↵) when focusing numeric inputs.</div>
        </div>
        <label className="switch">
          <input type="checkbox" checked={enabled} onChange={e=>save(e.target.checked)} />
          <span></span>
        </label>
      </div>
    </div>
  )
}
