// src/theme.js
export const THEMES = {
  cirrus:  { name: 'Cirrus',  grad: 'linear-gradient(135deg,#e6f3ff,#cfe9ff 40%,#bfe0ff)', panel: 'rgba(255,255,255,.55)', border:'rgba(0,0,0,.08)' },
  mint:    { name: 'Mint',    grad: 'linear-gradient(135deg,#eafff5,#d2ffe9 40%,#bbf7d0)', panel: 'rgba(255,255,255,.52)', border:'rgba(0,0,0,.08)' },
  sunset:  { name: 'Sunset',  grad: 'linear-gradient(135deg,#fff0e6,#ffd6bf 40%,#ffc8a8)', panel: 'rgba(255,255,255,.5)',  border:'rgba(0,0,0,.08)' },
  grape:   { name: 'Grape',   grad: 'linear-gradient(135deg,#f3e8ff,#e9ddff 40%,#dfccff)', panel: 'rgba(255,255,255,.54)', border:'rgba(0,0,0,.08)' },
  slate:   { name: 'Slate',   grad: 'linear-gradient(135deg,#eef2f7,#e7edf5 40%,#dde6f1)', panel: 'rgba(255,255,255,.58)', border:'rgba(0,0,0,.08)' },
  aurora:  { name: 'Aurora',  grad: 'linear-gradient(135deg,#e6fff9,#d1fff4 40%,#c0fdf0)', panel: 'rgba(255,255,255,.52)', border:'rgba(0,0,0,.08)' },
};

export function applyTheme(themeKey='cirrus'){
  const t = THEMES[themeKey] || THEMES.cirrus;
  const root = document.documentElement;
  root.style.setProperty('--bg-grad', t.grad);
  root.style.setProperty('--panel', t.panel);
  root.style.setProperty('--panel-border', t.border);
  // keep accent subtle per theme
  const accent = {cirrus:'#0ea5e9', mint:'#10b981', sunset:'#f97316', grape:'#8b5cf6', slate:'#64748b', aurora:'#14b8a6'}[themeKey] || '#0ea5e9';
  root.style.setProperty('--accent', accent);
  // radius/blur feel
  root.style.setProperty('--radius', '14px');
  root.style.setProperty('--glass-blur', '10px');
}
