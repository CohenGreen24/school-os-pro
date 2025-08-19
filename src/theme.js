// src/theme.js
export const THEMES = {
  cirrus: {
    name: 'Cirrus',
    light: { grad: 'linear-gradient(135deg,#eaf5ff,#d8ecff 45%,#c9e4ff)', panel:'rgba(255,255,255,.55)', border:'rgba(0,0,0,.08)', accent:'#0ea5e9' },
    dark:  { grad: 'linear-gradient(135deg,#0b1b26,#0e2431 45%,#0f2a3a)',   panel:'rgba(20,20,25,.55)',  border:'rgba(255,255,255,.12)', accent:'#38bdf8' }
  },
  mint: {
    name: 'Mint',
    light: { grad: 'linear-gradient(135deg,#eafff5,#d6fcef 45%,#c6f7e6)', panel:'rgba(255,255,255,.52)', border:'rgba(0,0,0,.08)', accent:'#10b981' },
    dark:  { grad: 'linear-gradient(135deg,#0b241d,#0e2f26 45%,#0f372c)', panel:'rgba(20,20,25,.55)',  border:'rgba(255,255,255,.12)', accent:'#34d399' }
  },
  sunset: {
    name: 'Sunset',
    light: { grad: 'linear-gradient(135deg,#fff1e7,#ffd9c3 45%,#ffc9ab)', panel:'rgba(255,255,255,.5)',  border:'rgba(0,0,0,.08)', accent:'#f97316' },
    dark:  { grad: 'linear-gradient(135deg,#2a150c,#32190f 45%,#3a1e12)', panel:'rgba(20,20,25,.55)',  border:'rgba(255,255,255,.12)', accent:'#fb923c' }
  },
  grape: {
    name: 'Grape',
    light: { grad: 'linear-gradient(135deg,#f3e8ff,#e9ddff 45%,#dfccff)', panel:'rgba(255,255,255,.54)', border:'rgba(0,0,0,.08)', accent:'#8b5cf6' },
    dark:  { grad: 'linear-gradient(135deg,#1a1424,#21192d 45%,#271e36)', panel:'rgba(20,20,25,.55)',  border:'rgba(255,255,255,.12)', accent:'#a78bfa' }
  },
  slate: {
    name: 'Slate',
    light: { grad: 'linear-gradient(135deg,#eef2f7,#e6edf5 45%,#dde6f1)', panel:'rgba(255,255,255,.58)', border:'rgba(0,0,0,.08)', accent:'#64748b' },
    dark:  { grad: 'linear-gradient(135deg,#0f1217,#131821 45%,#161c27)', panel:'rgba(20,20,25,.55)',  border:'rgba(255,255,255,.12)', accent:'#94a3b8' }
  },
  aurora: {
    name: 'Aurora',
    light: { grad: 'linear-gradient(135deg,#e6fff9,#d4fff4 45%,#c3fdf0)', panel:'rgba(255,255,255,.52)', border:'rgba(0,0,0,.08)', accent:'#14b8a6' },
    dark:  { grad: 'linear-gradient(135deg,#0b1f1d,#0e2a27 45%,#10322d)', panel:'rgba(20,20,25,.55)',  border:'rgba(255,255,255,.12)', accent:'#2dd4bf' }
  },
};

export function applyTheme(themeKey='cirrus', mode='light'){
  const t = THEMES[themeKey] || THEMES.cirrus;
  const v = (mode === 'dark' ? t.dark : t.light);
  const root = document.documentElement;
  root.style.setProperty('--bg-grad', v.grad);
  root.style.setProperty('--panel', v.panel);
  root.style.setProperty('--panel-border', v.border);
  root.style.setProperty('--accent', v.accent);
  // keep glass feel consistent
  root.style.setProperty('--radius','14px');
  root.style.setProperty('--glass-blur','10px');
}
