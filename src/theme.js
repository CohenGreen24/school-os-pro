// src/theme.js
const THEMES = {
  cirrus: {
    name: 'Cirrus',
    light: { grad: 'linear-gradient(135deg,#eaf5ff,#d8ecff 45%,#c9e4ff)', accent:'#0ea5e9', tint:'#eaf5ff' },
    dark:  { grad: 'linear-gradient(135deg,#0c1a24,#0d2130 45%,#0e2839)', accent:'#38bdf8', tint:'#c9e4ff' }
  },
  mint: {
    name: 'Mint',
    light: { grad: 'linear-gradient(135deg,#eafff5,#d6fcef 45%,#c6f7e6)', accent:'#10b981', tint:'#eafff5' },
    dark:  { grad: 'linear-gradient(135deg,#0a221b,#0b2a22 45%,#0c3128)', accent:'#34d399', tint:'#c6f7e6' }
  },
  sunset: {
    name: 'Sunset',
    light: { grad: 'linear-gradient(135deg,#fff1e7,#ffd9c3 45%,#ffc9ab)', accent:'#f97316', tint:'#fff1e7' },
    dark:  { grad: 'linear-gradient(135deg,#2a150c,#32190f 45%,#3a1e12)', accent:'#fb923c', tint:'#ffc9ab' }
  },
  grape: {
    name: 'Grape',
    light: { grad: 'linear-gradient(135deg,#f3e8ff,#e9ddff 45%,#dfccff)', accent:'#8b5cf6', tint:'#f3e8ff' },
    dark:  { grad: 'linear-gradient(135deg,#191327,#201934 45%,#261d3d)', accent:'#a78bfa', tint:'#dfccff' }
  },
  slate: {
    name: 'Slate',
    light: { grad: 'linear-gradient(135deg,#eef2f7,#e6edf5 45%,#dde6f1)', accent:'#64748b', tint:'#eef2f7' },
    dark:  { grad: 'linear-gradient(135deg,#0f1217,#131821 45%,#161c27)', accent:'#94a3b8', tint:'#dde6f1' }
  },
  aurora: {
    name: 'Aurora',
    light: { grad: 'linear-gradient(135deg,#e6fff9,#d4fff4 45%,#c3fdf0)', accent:'#14b8a6', tint:'#e6fff9' },
    dark:  { grad: 'linear-gradient(135deg,#0b1f1d,#0e2a27 45%,#10322d)', accent:'#2dd4bf', tint:'#c3fdf0' }
  },
};

export { THEMES };

export function applyTheme(themeKey='cirrus', mode='light'){
  const t = THEMES[themeKey] || THEMES.cirrus;
  const v = (mode === 'dark' ? t.dark : t.light);
  const root = document.documentElement;

  root.style.setProperty('--bg-grad', v.grad);
  root.style.setProperty('--accent', v.accent);

  // keep glass readable but themed
  const panelLight = 'rgba(255,255,255,.55)';
  const panelDark  = 'rgba(20,20,25,.55)';
  const borderLight= 'rgba(0,0,0,.08)';
  const borderDark = 'rgba(255,255,255,.12)';

  root.style.setProperty('--panel', mode==='dark' ? panelDark : panelLight);
  root.style.setProperty('--panel-border', mode==='dark' ? borderDark : borderLight);

  // widget tint should follow the original light palette
  root.style.setProperty('--widget-tint', v.tint);

  root.style.setProperty('--radius','14px');
  root.style.setProperty('--glass-blur','10px');
}
