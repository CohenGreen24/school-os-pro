import React from 'react'
import { supabase } from '../supabase'

const randId = () =>
  (window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2))

async function uploadPublicImage(file, bucket, prefix) {
  const ext = file.name.split('.').pop()
  const path = `${prefix}/${randId()}.${ext}`
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}

export default function Lunch({ user, styleVariant='glass', density='comfortable' }) {
  const isTeacher = user.role === 'teacher'
  const [menu,setMenu] = React.useState([])
  const [loading,setLoading] = React.useState(true)
  const [date,setDate] = React.useState(new Date().toISOString().slice(0,10))
  const [draft,setDraft] = React.useState({ name:'', price:'', available:true })
  const [imageFile,setImageFile] = React.useState(null)
  const [pickId,setPickId] = React.useState('')
  const [qty,setQty] = React.useState(1)
  const [msg,setMsg] = React.useState('')

  const favKey = `fav_lunch_${user.id}`
  const orderKey = (d)=>`menu_order_${user.id}_${d}`
  const [favs,setFavs] = React.useState(()=> new Set(JSON.parse(localStorage.getItem(favKey)||'[]')))
  const [customOrder,setCustomOrder] = React.useState([])

  const saveFavs = (set)=>{ const arr=[...set]; localStorage.setItem(favKey, JSON.stringify(arr)) }
  const toggleFav = (id)=>{ const s=new Set(favs); s.has(id)?s.delete(id):s.add(id); setFavs(s); saveFavs(s) }

  const moveItem = (id,dir)=>{ 
    const ids = customOrder.length ? [...customOrder] : (menu.map(m=>m.id))
    const idx = ids.indexOf(id); if(idx<0) return
    const to = Math.max(0, Math.min(ids.length-1, idx + (dir==='up'?-1:1)))
    if(to===idx) return
    const [it] = ids.splice(idx,1); ids.splice(to,0,it)
    setCustomOrder(ids); localStorage.setItem(orderKey(date), JSON.stringify(ids))
  }

  const selected = React.useMemo(()=> menu.find(m=>String(m.id)===String(pickId)) || null, [menu, pickId])
  const total = React.useMemo(()=>{ const price = selected ? Number(selected.price) : Number(draft.price||0); return (price * Math.max(1, Number(qty)||1)).toFixed(2) }, [selected, draft.price, qty])

  const loadMenu = React.useCallback(async ()=>{
    setLoading(true)
    const { data } = await supabase.from('lunch_menu').select('*').eq('date', date).order('created_at')
    const order = JSON.parse(localStorage.getItem(orderKey(date))||'[]')
    setCustomOrder(order)
    setMenu(data||[])
    setLoading(false)
  }, [date])

  React.useEffect(()=>{ loadMenu() }, [loadMenu])
  React.useEffect(()=>{ 
    const ch = supabase.channel('lunch').on('postgres_changes',{event:'*',schema:'public',table:'lunch_menu'},loadMenu).subscribe()
    return ()=>supabase.removeChannel(ch)
  }, [loadMenu])

  const addItem = async ()=>{
    if(!draft.name || !draft.price) return
    let image_url = null
    if (imageFile) {
      image_url = await uploadPublicImage(imageFile, 'lunch-images', `menu/${date}`)
    }
    const price = Number(draft.price)
    await supabase.from('lunch_menu').insert({
      date,
      item_name: draft.name,
      price,
      available: draft.available,
      image_url,
      created_by: user.id
    })
    setDraft({ name:'', price:'', available:true })
    setImageFile(null)
    loadMenu()
  }

  const placeOrder = async ()=>{
    setMsg('')
    try{
      if(!selected) { setMsg('Choose a menu item.'); return }
      const quantity = Math.max(1, Number(qty)||1)
      const { data, error } = await supabase.rpc('place_lunch_order', {
        p_student_id: user.id, p_item_id: selected.id, p_quantity: quantity
      })
      if(error) throw error
      setMsg('✅ Order placed. New wallet balance: $'+Number(data?.new_balance||0).toFixed(2))
      setQty(1); setPickId('')
      loadMenu()
      try { window.dispatchEvent(new CustomEvent('wallet-changed')) } catch {}
    }catch(e){
      setMsg('⚠️ ' + (e.message || 'Order failed'))
    }
  }

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'
  const rowClass = density==='compact' ? 'row narrow' : 'row'

  const sortedMenu = React.useMemo(()=>{
    const idsCustom = (customOrder && customOrder.length) ? customOrder : (menu.map(m=>m.id))
    const idxMap = new Map(idsCustom.map((id,i)=>[id,i]))
    return [...menu].sort((a,b)=>{
      const fa = favs.has(a.id), fb = favs.has(b.id)
      if(fa!==fb) return fa? -1 : 1
      const ia = idxMap.get(a.id) ?? 9999
      const ib = idxMap.get(b.id) ?? 9999
      return ia-ib
    })
  }, [menu, favs, customOrder])

  return (
    <div className={cardClass}>
      <div className="flex">
        <h2>🍽️ Lunch</h2>
        <input type="date" className="input right" style={{maxWidth:180}} value={date} onChange={e=>setDate(e.target.value)} />
      </div>

      {isTeacher && (
        <div className={cardClass}>
          <b>Menu editor (for selected date)</b>
          <div className={rowClass} style={{gridTemplateColumns:'2fr 1fr 1fr 1fr auto'}}>
            <input className="input" placeholder="Item name" value={draft.name} onChange={e=>setDraft(s=>({...s, name:e.target.value}))} />
            <input className="input" type="number" step="0.01" placeholder="Price" value={draft.price} onChange={e=>setDraft(s=>({...s, price:e.target.value}))} />
            <select className="input" value={draft.available?'1':'0'} onChange={e=>setDraft(s=>({...s, available: e.target.value==='1'}))}>
              <option value="1">Available</option><option value="0">Unavailable</option>
            </select>
            <input className="input" type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0]||null)} />
            <button className="btn btn-primary" onClick={addItem}>Save</button>
          </div>
          <div className="small" style={{opacity:.7}}>Tip: images are uploaded to the <code>lunch-images</code> bucket.</div>
        </div>
      )}

      <div className="lunchGrid">
        {loading && <div className="small loading">Loading menu…</div>}
        {!loading && sortedMenu.length===0 && <div className="small">No menu items for {date} yet.</div>}
        {sortedMenu.map(m => (
          <div key={m.id} className={`lunchCard ${cardClass}`}>
            <div className="lunchImgWrap">
              {m.image_url
                ? <img src={m.image_url} alt={m.item_name} className="lunchImg" />
                : <div className="lunchImg placeholder">No Image</div>}
              <button className="favBtn" title="Favourite" onClick={()=>toggleFav(m.id)}>{favs.has(m.id) ? '★' : '☆'}</button>
            </div>
            <div className="lunchBody">
              <div className="lunchTitle">{m.item_name}</div>
              <div className="lunchMeta">
                <span className="price">${Number(m.price).toFixed(2)}</span>
                {m.available ? <span className="badge badge-green">Available</span> : <span className="badge badge-red">Sold out</span>}
              </div>
              <div className="lunchActions">
                <button className="btn btn-ghost" title="Up" onClick={()=>moveItem(m.id,'up')}>↑</button>
                <button className="btn btn-ghost" title="Down" onClick={()=>moveItem(m.id,'down')}>↓</button>
                <button className="btn btn-primary" onClick={()=>setPickId(m.id)} disabled={!m.available}>Select</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {user.role==='student' && (
        <div className={cardClass}>
          <b>Place an Order</b>
          <div className={rowClass} style={{gridTemplateColumns:'2fr 1fr auto'}}>
            <select className="input" value={pickId} onChange={e=>setPickId(e.target.value)}>
              <option value="">Choose menu item…</option>
              {sortedMenu.filter(m=>m.available).map(m => <option key={m.id} value={m.id}>{m.item_name} — ${Number(m.price).toFixed(2)}</option>)}
            </select>
            <input className="input" type="number" min="1" step="1" value={qty} onChange={e=>setQty(e.target.value)} />
            <button className="btn btn-primary" onClick={placeOrder} disabled={!pickId}>Order (${total})</button>
          </div>
          {msg && <div className="small" style={{marginTop:8}}>{msg}</div>}
        </div>
      )}
    </div>
  )
}
