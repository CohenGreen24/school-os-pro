// src/components/Lunch.jsx
import React from 'react'
import { supabase } from '../supabase'

const FALLBACKS = {
  'Chicken Wrap': 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=800&q=80',
  'Beef Burger': 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
  'Veggie Pizza': 'https://images.unsplash.com/photo-1548365328-9f547fb09530?w=800&q=80',
  'Pasta Salad': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80',
  'Fruit Cup': 'https://images.unsplash.com/photo-1546549039-5e5f20f3a4d2?w=800&q=80',
  'Sushi Pack': 'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80',
  'Chicken Salad': 'https://images.unsplash.com/photo-1568158879083-c4280a26d2e7?w=800&q=80',
  'Ham & Cheese Sandwich': 'https://images.unsplash.com/photo-1547130542-16256d7061a7?w=800&q=80',
  'Yogurt Parfait': 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80',
  'Bottled Water': 'https://images.unsplash.com/photo-1516408388733-2f83604f5d6a?w=800&q=80',
  'Orange Juice': 'https://images.unsplash.com/photo-1551024709-8f23befc6cf7?w=800&q=80',
  'Chocolate Muffin': 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=800&q=80'
}

export default function Lunch({ user }) {
  const [items, setItems] = React.useState([])
  const [cart, setCart] = React.useState([]) // [{id, item_name, price, qty, image_url}]
  const [wallet, setWallet] = React.useState(0)
  const [placing, setPlacing] = React.useState(false)

  // Load menu + wallet
  React.useEffect(() => {
    (async () => {
      const { data: menu, error: mErr } = await supabase
        .from('lunch_menu')
        .select('id,item_name,price,image_url,is_active')
        .order('item_name', { ascending: true })

      if (!mErr) setItems((menu||[]).filter(x => x.is_active !== false))

      if (user?.id) {
        const { data: w, error: wErr } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle()
        if (!wErr && w) setWallet(Number(w.balance)||0)
      }
    })()
  }, [user?.id])

  const add = (it) => {
    setCart(prev => {
      const i = prev.findIndex(x => x.id===it.id)
      if (i>=0) {
        const next = [...prev]; next[i].qty += 1; return next
      }
      return [...prev, { id: it.id, item_name: it.item_name, price: Number(it.price)||0, qty:1, image_url: it.image_url }]
    })
  }
  const sub = (it) => {
    setCart(prev => {
      const i = prev.findIndex(x => x.id===it.id)
      if (i<0) return prev
      const next = [...prev]
      if (next[i].qty>1) next[i].qty -= 1
      else next.splice(i,1)
      return next
    })
  }

  const total = cart.reduce((a,c)=> a + c.price * c.qty, 0).toFixed(2)

  const placeOrder = async () => {
    if (!user?.id) return alert('Login required.')
    if (cart.length===0) return alert('Your cart is empty.')
    if (Number(total) > Number(wallet)) return alert('Insufficient wallet balance.')
    setPlacing(true)
    try {
      // 1) insert order rows
      const rows = cart.map(c => ({
        user_id: user.id,
        item_id: c.id,
        qty: c.qty
      }))
      const { error: oErr } = await supabase.from('lunch_orders').insert(rows)
      if (oErr) throw oErr
      // 2) decrement wallet
      const { error: wErr } = await supabase.rpc('decrement_wallet', { p_user_id: user.id, p_amount: Number(total) })
      if (wErr) throw wErr
      setWallet(w => (Number(w) - Number(total)))
      setCart([])
      alert('Order placed ✔️')
    } catch (e) {
      console.error(e)
      alert(e.message || 'Order failed')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="glass card">
      <div className="lunchLayout">
        {/* Left: 4×4 grid */}
        <section className="glass card" style={{padding:10}}>
          <div className="lunchHead" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
            <div className="pill">Wallet: ${Number(wallet).toFixed(2)}</div>
            <div className="small" style={{opacity:.8}}>Tap +/− to add/remove</div>
          </div>

          <div className="menuGrid">
            {items.slice(0,16).map(it => {
              const img = it.image_url || FALLBACKS[it.item_name] || 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=60'
              const inCart = cart.find(c => c.id===it.id)
              return (
                <article key={it.id} className="lunchCard">
                  <div className="lunchImgWrap">
                    <img className="lunchImg"
                         src={img}
                         alt={it.item_name}
                         referrerPolicy="no-referrer" />
                  </div>
                  <div className="lunchBody">
                    <div className="lunchRow">
                      <div className="itemName" style={{fontWeight:700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}} title={it.item_name}>
                        {it.item_name}
                      </div>
                      <div className="price">${Number(it.price).toFixed(2)}</div>
                    </div>
                    <div className="lunchRow">
                      <div className="qtyCtrl">
                        <button className="qtyBtn" onClick={()=>sub(it)} aria-label="decrease">−</button>
                        <div className="qtyNum">{inCart?.qty || 0}</div>
                        <button className="qtyBtn" onClick={()=>add(it)} aria-label="increase">+</button>
                      </div>
                      <button className="btn xs" onClick={()=>add(it)}>Add</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Right: Cart */}
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
