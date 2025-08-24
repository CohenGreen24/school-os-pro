// src/components/Numpad.jsx
import React from 'react'

const KEYS = ['1','2','3','4','5','6','7','8','9','10','⌫','↵']

export default function Numpad() {
  const [enabled, setEnabled] = React.useState(
    () => localStorage.getItem('numpad_enabled') !== 'false'
  )
  const [visible, setVisible] = React.useState(false)
  const targetRef = React.useRef(null)

  React.useEffect(()=>{
    const onFocus = (e)=>{
      if (!enabled) return
      const el = e.target
      if (el && el.classList?.contains('numpad-target')) {
        targetRef.current = el
        setVisible(true)
      }
    }
    const onBlur = (e)=>{
      // hide if focus leaves to non-input (slight delay to allow keypad click)
      setTimeout(()=>{
        if (!document.activeElement?.classList?.contains('numpad-target')) {
          setVisible(false)
          targetRef.current = null
        }
      }, 50)
    }
    document.addEventListener('focusin', onFocus)
    document.addEventListener('focusout', onBlur)
    return ()=> {
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('focusout', onBlur)
    }
  }, [enabled])

  React.useEffect(()=>{
    const handler = ()=> setEnabled(localStorage.getItem('numpad_enabled') !== 'false')
    window.addEventListener('storage', handler)
    return ()=> window.removeEventListener('storage', handler)
  },[])

  const press = (k)=>{
    const el = targetRef.current
    if (!el) return
    if (k === '⌫') {
      el.value = String(el.value || '').slice(0,-1)
      el.dispatchEvent(new Event('input', { bubbles:true }))
      el.focus()
      return
    }
    if (k === '↵') {
      el.blur()
      setVisible(false)
      return
    }
    // numeric append (10 handled as a token)
    const add = k
    // Replace selection or append
    const v = String(el.value || '')
    const start = el.selectionStart ?? v.length
    const end   = el.selectionEnd ?? v.length
    const next = v.slice(0,start) + add + v.slice(end)
    el.value = next
    el.dispatchEvent(new Event('input', { bubbles:true }))
    el.focus()
    try { el.setSelectionRange(next.length, next.length) } catch {}
  }

  if (!visible || !enabled) return null

  return (
    <div className="numpadBar">
      {KEYS.map(k=>(
        <button key={k} className="nKey" onClick={()=>press(k)}>{k}</button>
      ))}
    </div>
  )
}
