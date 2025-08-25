// src/components/Lunch.jsx
import React from 'react'
import { supabase } from '../supabase'

export default function Lunch({ user }) {
  const [items, setItems] = React.useState([])
  const [cart, setCart] = React.useState([]) // [{id, item_name, price, qty}]
  const [wallet, setWallet] = React.useState(0)
  const [placing, setPlacing] = React.useState(false)

  React.useEffect(() => {
    (async () => {
      const { data: menu } = await supabase
        .from('lunch_menu')
        .select('id,item_name,price,image_url,is_active')
        .order('item_name', { ascending: true })
      setItems((menu||[]).filter(x => x.is_active !== false))

      if (user?.id) {
        const { data: w } = await supabase.from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
        if (w) setWallet(Number(w.balance)||0)
      }
    })()
  }, [user?.id])

  const add = (it) => {
    setCart(prev => {
      const i = prev.findIndex(x => x.id===it.id)
      if (i>=0) { const next=[...prev]; next[i].qty+=1; return next }
      return [...prev, { id: it.id, item_name: it.item_name, price: Number(it.price)||0, qty:1 }]
    })
  }
  const sub = (it) => {
    setCart(prev => {
      const i = prev.findIndex(x => x.id===it.id)
      if (i<0) return prev
      const next=[...prev]
      if (next[i].qty>1) next[i].qty-=1; else next.splice(i,1)
      return next
    })
  }

  const total = cart.reduce((a,c)=> a + c.price * c.qty, 0).toFixed(2)

  const placeOrder = async () => {
    if (!user?.id) return alert('Login required')
    if (cart.length===0) return alert('Your cart is empty.')
    setPlacing(true)
    try {
      const payload = cart.map(c => ({ item_id: c.id, qty: c.qty }))
      const { error } = await supabase.rpc('place_lunch_order', { p_user_id: user.id, p_items: payload })
      if (error) throw error
      setWallet(w => Number(w) - Number(total))
      setCart([])
      alert('Order placed ✔️')
    } catch (e) {
      console.error(e); alert(e.message || 'Order failed')
    } finally { setPlacing(false) }
  }

  return (
    <div className="glass card" style={{padding:10}}>
      <div className="lunchLayout">
        {/* Menu grid */}
        <section className="glass card" style={{padding:10}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div className="pill">Wallet: ${Number(wallet).toFixed(2)}</div>
            <div className="small" style={{opacity:.8}}>Tap +/− to adjust</div>
          </div>

          <div className="menuGrid">
            {items.slice(0,16).map(it => (
              <article key={it.id} className="lunchCard">
                <div className="lunchImgWrap">
                  <img className="lunchImg" src={it.image_url} alt={it.item_name} referrerPolicy="no-referrer" />
                </div>
                <div className="lunchBody">
                  <div className="lunchRow">
                    <div style={{fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={it.item_name}>
                      {it.item_name}
                    </div>
                    <div className="price">${Number(it.price).toFixed(2)}</div>
                  </div>
                  <div className="lunchRow">
                    <div className="qtyCtrl">
                      <button className="qtyBtn" onClick={()=>sub(it)} aria-label="decrease">−</button>
                      <div className="qtyNum">{cart.find(c=>c.id===it.id)?.qty || 0}</div>
                      <button className="qtyBtn" onClick={()=>add(it)} aria-label="increase">+</button>
                    </div>
                    <button className="btn xs" onClick={()=>add(it)}>Add</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Cart */}
        <aside className="glass card cartPanel">
          <div className="cartHeader">
            <h3 style={{margin:'2px 0'}}>Cart</h3>
            <span className="badge">Items: {cart.reduce((a,c)=>a+c.qty,0)}</span>
          </div>

          <div className="cartList">
            {cart.length===0 && <div className="small" style={{opacity:.7}}>Nothing here yet.</div>}
            {cart.map(c => (
              <div className="cartItem" key={c.id}>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <strong>{c.qty}×</strong> {c.item_name}
                </div>
                <div style={{display:'flex', gap:6, alignItems:'center'}}>
                  <span>${(c.price*c.qty).toFixed(2)}</span>
                  <button className="btn xs" onClick={()=>sub({id:c.id})}>−</button>
                  <button className="btn xs" onClick={()=>add({id:c.id, item_name:c.item_name, price:c.price})}>+</button>
                </div>
              </div>
            ))}
          </div>

          <div className="cartTotal">
            <span>Total: ${total}</span>
            <button className="btn btn-primary btn-order" disabled={placing || cart.length===0} onClick={placeOrder}>
              {placing ? 'Ordering…' : 'Order'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
