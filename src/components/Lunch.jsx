// src/components/Lunch.jsx
import React from 'react'
import { supabase } from '../supabase'
import './lunch.local.css' // optional; see CSS block at the end if you prefer one-file styles

function Money({ n }) {
  return <span>${Number(n || 0).toFixed(2)}</span>
}

export default function Lunch({ user, styleVariant='glass' }) {
  const isStaff = user?.role === 'teacher' || user?.role === 'admin'
  const [menu, setMenu] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [wallet, setWallet] = React.useState(0)
  const [query, setQuery] = React.useState('')
  const [favorites, setFavorites] = React.useState(() => JSON.parse(localStorage.getItem(`fav_${user.id}`)||'[]'))
  const [editing, setEditing] = React.useState(null) // item or null
  const [qtyDraft, setQtyDraft] = React.useState({}) // {itemId: qty}

  const favKey = `fav_${user.id}`

  const refresh = async () => {
    setLoading(true); setError('')
    try {
      const { data: walletRow } = await supabase.from('wallets').select('balance').eq('user_id', user.id).single()
      setWallet(walletRow?.balance || 0)

      const { data: items, error: e2 } = await supabase
        .from('lunch_menu')
        .select('id,name,price,image_url,is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (e2) throw e2
      setMenu(items || [])
    } catch (e) {
      setError(e.message || 'Failed to load lunch menu')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(()=>{ refresh() }, [])

  const placeOrder = async (item) => {
    const qty = Number(qtyDraft[item.id] || 1)
    if (Number.isNaN(qty) || qty <= 0) return
    const total = qty * Number(item.price || 0)
    if (wallet < total) { alert('Insufficient wallet balance.'); return }

    // Insert order (rely on lunch_orders generated total if present; also send qty for clarity)
    const { error: e1 } = await supabase.from('lunch_orders').insert({
      user_id: user.id, item_id: item.id, qty
    })
    if (e1) { alert(`Order failed: ${e1.message}`); return }

    // Update wallet (simple, demo-safe update)
    const { error: e2 } = await supabase
      .from('wallets')
      .update({ balance: (wallet - total) })
      .eq('user_id', user.id)
    if (e2) { alert(`Wallet update failed: ${e2.message}`); return }

    setWallet(w => w - total)
    setQtyDraft(s => ({ ...s, [item.id]: 1 }))
  }

  const toggleFav = (id) => {
    const next = favorites.includes(id) ? favorites.filter(x=>x!==id) : [...favorites, id]
    setFavorites(next)
    localStorage.setItem(favKey, JSON.stringify(next))
  }

  const filtered = React.useMemo(()=>{
    const q = query.trim().toLowerCase()
    let arr = [...menu]
    if (q) arr = arr.filter(i => i.name.toLowerCase().includes(q))
    // pin favourites first
    arr.sort((a,b)=>{
      const af = favorites.includes(a.id) ? 0 : 1
      const bf = favorites.includes(b.id) ? 0 : 1
      return af - bf || a.name.localeCompare(b.name)
    })
    return arr
  },[menu, query, favorites])

  // Admin/teacher editor
  const startEdit = (item) => setEditing(item || { id:null, name:'', price:0, image_url:'', is_active:true })
  const saveEdit = async () => {
    if (!editing) return
    const payload = {
      name: editing.name?.trim(),
      price: Number(editing.price || 0),
      image_url: editing.image_url || null,
      is_active: !!editing.is_active
    }
    if (!payload.name) { alert('Name required'); return }
    if (editing.id) {
      const { error } = await supabase.from('lunch_menu').update(payload).eq('id', editing.id)
      if (error) { alert(error.message); return }
    } else {
      const { error } = await supabase.from('lunch_menu').insert(payload)
      if (error) { alert(error.message); return }
    }
    setEditing(null)
    refresh()
  }

  return (
    <div className="lunchPanel">
      <div className="flex" style={{justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <div className="flex" style={{gap:8, alignItems:'center'}}>
          <h3 style={{margin:0}}>Lunch</h3>
          <span className="badge">Wallet: <Money n={wallet}/></span>
        </div>
        <div className="row" style={{gridTemplateColumns:'min(280px,40vw) auto', gap:8}}>
          <input className="input" placeholder="Search items…" value={query} onChange={e=>setQuery(e.target.value)} />
          {isStaff && <button className="btn btn-primary xs" onClick={()=>startEdit(null)}>+ New item</button>}
        </div>
      </div>

      {loading && <div className="small">Loading menu…</div>}
      {error && <div className="small" style={{color:'#ef4444'}}>{error}</div>}

      <div className="lunchGrid">
        {filtered.map(item=>{
          const fav = favorites.includes(item.id)
          const qty = qtyDraft[item.id] ?? 1
          return (
            <div className="lunchCard glass" key={item.id}>
              <div className="lunchImgWrap">
                {item.image_url
                  ? <img src={item.image_url} alt={item.name} className="lunchImg" />
                  : <div className="lunchImg placeholder">No image</div>}
                <button className="favBtn" title="Favourite" onClick={()=>toggleFav(item.id)}>
                  {fav ? '★' : '☆'}
                </button>
              </div>
              <div className="card" style={{display:'grid', gap:8}}>
                <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
                  <b style={{fontSize:'0.95rem'}}>{item.name}</b>
                  <Money n={item.price}/>
                </div>
                <div className="row" style={{gridTemplateColumns:'100px auto', gap:8}}>
                  <div className="qtyBox">
                    <label className="small">Qty</label>
                    <input
                      className="input numpad-target"
                      inputMode="numeric"
                      value={qty}
                      onChange={e=>setQtyDraft(s=>({ ...s, [item.id]: e.target.value }))}
                      onFocus={(e)=> e.currentTarget.select()}
                    />
                  </div>
                  <button className="btn btn-primary" onClick={()=>placeOrder(item)}>
                    Add to order
                  </button>
                </div>
                {isStaff && (
                  <div className="flex" style={{gap:6, justifyContent:'flex-end'}}>
                    <button className="btn xs" onClick={()=>startEdit(item)}>Edit</button>
                    {/* quick toggle active */}
                    <button className="btn xs" onClick={async ()=>{
                      await supabase.from('lunch_menu').update({is_active: !item.is_active}).eq('id', item.id)
                      refresh()
                    }}>{item.is_active ? 'Deactivate' : 'Activate'}</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Editor modal */}
      {editing && (
        <div className="modal" onClick={(e)=>{ if(e.target===e.currentTarget) setEditing(null) }}>
          <div className="modalBody glass card" style={{width:'min(720px,92vw)'}}>
            <div className="flex" style={{justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <b>{editing.id ? 'Edit item' : 'New item'}</b>
              <button className="btn btn-ghost" onClick={()=>setEditing(null)}>Close</button>
            </div>
            <div className="row" style={{gridTemplateColumns:'1fr 1fr', gap:10}}>
              <div>
                <label className="small">Name</label>
                <input className="input" value={editing.name||''}
                  onChange={e=>setEditing(s=>({...s, name:e.target.value}))}/>
              </div>
              <div>
                <label className="small">Price</label>
                <input className="input numpad-target" inputMode="numeric" value={editing.price||0}
                  onChange={e=>setEditing(s=>({...s, price:e.target.value}))}/>
              </div>
              <div className="colspan">
                <label className="small">Image URL</label>
                <input className="input" value={editing.image_url||''}
                  onChange={e=>setEditing(s=>({...s, image_url:e.target.value}))}/>
              </div>
              <div className="flex" style={{alignItems:'center', gap:8}}>
                <input id="active" type="checkbox" checked={!!editing.is_active}
                  onChange={e=>setEditing(s=>({...s, is_active:e.target.checked}))}/>
                <label htmlFor="active" className="small">Active</label>
              </div>
            </div>
            <div className="flex" style={{justifyContent:'flex-end', gap:8, marginTop:10}}>
              <button className="btn" onClick={()=>setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
