export const THEMES = {
  classic:  { name:'Classic',  bg:'#0ea5e9', radius:'16px', blur:'12px' },
  mint:     { name:'Mint',     bg:'#10b981', radius:'18px', blur:'14px' },
  sunset:   { name:'Sunset',   bg:'#f97316', radius:'20px', blur:'16px' },
  grape:    { name:'Grape',    bg:'#8b5cf6', radius:'16px', blur:'12px' },
  slate:    { name:'Slate',    bg:'#64748b', radius:'14px', blur:'10px' },
}

export function applyTheme(themeKey='classic', accent){
  const t = THEMES[themeKey] || THEMES.classic
  const acc = accent || t.bg
  const root = document.documentElement
  root.style.setProperty('--accent', acc)
  root.style.setProperty('--radius', t.radius)
  root.style.setProperty('--glass-blur', t.blur)
}
