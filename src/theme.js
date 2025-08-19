export const THEMES = {
  classic:  { name:'Classic',  bg:'#0ea5e9', radius:'16px', blur:'12px' },
  mint:     { name:'Mint',     bg:'#10b981', radius:'18px', blur:'14px' },
  sunset:   { name:'Sunset',   bg:'#f97316', radius:'20px', blur:'16px' },
  grape:    { name:'Grape',    bg:'#8b5cf6', radius:'16px', blur:'12px' },
  slate:    { name:'Slate',    bg:'#64748b', radius:'14px', blur:'10px' },
}

export function applyTheme(themeKey='classic', accent='#0ea5e9'){
  const t = THEMES[themeKey] || THEMES.classic
  document.documentElement.style.setProperty('--accent', accent || t.bg)
  document.documentElement.style.setProperty('--radius', t.radius)
  document.documentElement.style.setProperty('--glass-blur', t.blur)
}
