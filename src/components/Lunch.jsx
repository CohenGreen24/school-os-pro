// src/components/Lunch.jsx
import React from 'react'
import { supabase } from '../supabase'

const Money = ({ n }) => <b>${(Number(n) || 0).toFixed(2)}</b>

// Fallback images by name if DB image_url is missing
const FALLBACK_IMG = {
  'Chicken Wrap':       'https://images.unsplash.com/photo-1550547660-d9450f859349?w=1200&q=80&auto=format&fit=crop',
  'Veggie Wrap':        'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=1200&q=80&auto=format&fit=crop',
  'Beef Burger':        'https://images.unsplash.com/photo-1550547660-10d8a0e6bbf7?w=1200&q=80&auto=format&fit=crop',
  'Grilled Cheese':     'https://images.unsplash.com/photo-1604908177073-b6e7d2d2f9b7?w=1200&q=80&auto=format&fit=crop',
  'Pasta Salad':        'https://images.unsplash.com/photo-1566843972141-0826b99f5b82?w=1200&q=80&auto=format&fit=crop',
  'Fruit Cup':          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&q=80&auto=format&fit=crop',
  'Yogurt Parfait':     'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=1200&q=80&auto=format&fit=crop',
  'Sushi Roll (4pc)':   'https://images.unsplash.com/photo-1553621042-f6e147245754?w=1200&q=80&auto=format&fit=crop',
  'Chicken Fried Rice': 'https://images.unsplash.com/photo-1604908554161-9f2d6a2e0c77?w=1200&q=80&auto=format&fit=crop',
  'Caesar Salad':       'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&q=80&auto=format&fit=crop',
  'Pumpkin Soup':       'https://images.unsplash.com/photo-1604908578090-9d5b0f2f7c20?w=1200&q=80&auto=format&fit=crop',
  'Iced Tea':           'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=1200&q=80&auto=format&fit=crop',
  // common extras just in case
  'Bottled Water':      'https://images.unsplash.com/photo-1523365280197-f1783db9fe62?w=1200&q=80&auto=format&fit=crop'
}

export default function Lunch({ user }) {
  const [menu, setMenu] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [wallet, setWallet] = React.useState(0)
  const [cart, setCart] = React.useState({}) // { [id]: { item, qty } }

  const total = React.useMemo(
    () => Object.values(cart).reduce((s, c) => s + (Number(c.item.price || 0) * c.qty), 0),
    [cart]
  )

  // robust menu loader (supports legacy item_name / missing is_active)
  const loadMenu = React.useCallback(async () => {
    const attempts = [
      { select: 'id,name,price,image_url,is_active', active: true },
      { select: 'id,name:item_name,price,image_url,is_active', active: true },
      { select: 'id,name,price,image_url', active: false },
      { select: 'id,name:item_name,price,image_url', active: false },
    ]
    for (const a of attempts) {
      try {
        let q = supabase.from('lunch_menu').select(a.select).order('name', { ascending: true }).limit(32)
        if (a.active) q = q.eq('is_active', true)
        const { data, error } = await q
        if (error) continue
        if (Array.isArray(data)) return data
      } catch {}
    }
    return []
  }, [])

  const refresh = React.useCallback(async () => {
    setLoading(true); setError('')
    try {
      if (user?.id) {
        const { data: w } = await supabase
          .from('wallets').select('balance').eq('user_id', user.id).maybeSingle()
        setWallet(w?.balance ?? 0)
      } else {
        setWallet(0)
      }
      const items = await loadMenu()
      setMenu(items || [])
    } catch (e) {
      setError(e.message || 'Failed to load lunch menu')
      setMenu([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, loadMenu])

  React.useEffect(() => { refresh() }, [refresh])

  // cart helpers
  const addOne = (item) => {
    setCart(curr => {
      const prev = curr[item.id]
      const qty = prev ? prev.qty + 1 : 1
      return { ...curr, [item.id]: { item, qty } }
    })
  }
  const subOne = (item) => {
    setCart(curr => {
      const prev = curr[item.id]
      if (!prev) return curr
      const qty = prev.qty - 1
      const next = { ...curr }
      if (qty <= 0) delete next[item.id]
      else next[item.id] = { item, qty }
      return next
    })
  }
  const clearCart = () => setCart({})
  const removeItem = (id) => setCart(curr => {
    const next = { ...curr }; delete next[id]; return next
  })

  const placeOrder = async () => {
    if (!user?.id) { alert('Please sign in first.'); return }
    if (!Object.keys(cart).length) return

    const items = Object.values(cart)
    const sum = items.reduce((s, c) => s + (Number(c.item.price || 0) * c.qty), 0)
    if (wallet < sum) { alert('Insufficient wallet balance.'); return }

    const rows = items.map(c => ({ user_id: user.id, item_id: c.item.id, qty: c.qty }))
    const { error: e1 } = await supabase.from('lunch_orders').insert(rows)
    if (e1) { alert(`Order failed: ${e1.message}`); return }

    const { error: e2 } = await supabase.from('wallets').update({ balance: wallet - sum }).eq('user_id', user.id)
    if (e2) { alert(`Wallet update failed: ${e2.message}`); return }

    setWallet(w => w - sum); clearCart(); alert('Order placed! 👌')
  }

  // Only show up to 16 items (4×4)
  const gridItems = (menu || []).slice(0, 16)

  return (
    <div className="lunchPanel">
      {/* iPad-friendly two-column split with independent scroll */}
      <div className="glass lunchShell">
        {/* LEFT: menu grid (scrollable) */}
        <div className="lunchLeft">
          {loading && <div className="small">Loading menu…</div>}
          {error && <div className="small" style={{ color: '#ef4444' }}>{error}</div>}

          <div className="lunchGridFixed">
            {gridItems.map(item => {
              const qty = cart[item.id]?.qty || 0
              const name = item.name ?? item.item_name ?? 'Item'
              const img = item.image_url || FALLBACK_IMG[name] || FALLBACK_IMG['Fruit Cup'] // guaranteed fallback
              return (
                <div className="lunchCardCompact glass" key={item.id}>
                  <div className="compactImgWrap">
                    <img src={img} alt={name} className="compactImg" />
                  </div>
                  <div className="compactMeta">
                    <div className="compactTitle" title={name}>{name}</div>
                    <div className="compactPrice"><Money n={item.price} /></div>
                  </div>
                  <div className="compactControls">
                    <button className="btn xs" onClick={() => subOne(item)}>-</button>
                    <div className="qty">{qty}</div>
                    <button className="btn xs" onClick={() => addOne(item)}>+</button>
                  </div>
                </div>
              )
            })}
            {(!loading && gridItems.length === 0) && (
              <div className="small" style={{ gridColumn: '1/-1', opacity:.8 }}>
                No items available. Check <code>public.lunch_menu</code>.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: wallet + neat cart (scrollable) */}
        <div className="lunchRight glass card">
          <div className="cartHeader">
            <span className="badge">Wallet: <Money n={wallet} /></span>
            {Object.keys(cart).length > 0 && (
              <button className="btn xs" onClick={clearCart}>Clear</button>
            )}
          </div>

          <div className="cartTitle">Cart</div>
          <div className="cartList">
            {Object.values(cart).length === 0 && (
              <div className="small" style={{ opacity:.8 }}>No items yet. Tap + to add.</div>
            )}
            {Object.values(cart).map(({ item, qty }) => {
              const name = item.name ?? item.item_name ?? 'Item'
              return (
                <div className="cartRow" key={item.id}>
                  <div className="cartLine">
                    {qty} × {name}
                  </div>
                  <div className="cartBtns">
                    <button className="btn xs" onClick={() => subOne(item)}>-</button>
                    <button className="btn xs" onClick={() => addOne(item)}>+</button>
                    <button className="btn xs" onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="cartFooter">
            <span> Total = <Money n={total} /> </span>
            <button
              className="btn btn-primary"
              disabled={total <= 0 || total > wallet}
              onClick={placeOrder}
              style={{ marginLeft: 8 }}  // “just a smidge” to the right of total
            >
              Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
