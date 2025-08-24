// src/components/Lunch.jsx
import React from 'react'
import { supabase } from '../supabase'

const Money = ({ n }) => <b>${(Number(n) || 0).toFixed(2)}</b>

/** Stable, food-accurate fallbacks for your 12 menu items */
const FALLBACK_IMG = {
  'Chicken Wrap':       'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Chicken_wrap.jpg/640px-Chicken_wrap.jpg',
  'Veggie Wrap':        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Veggie_wraps.jpg/640px-Veggie_wraps.jpg',
  'Beef Burger':        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Hamburger_%28black_bg%29.jpg/640px-Hamburger_%28black_bg%29.jpg',
  'Grilled Cheese':     'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Grilled_Cheese_sandwich.jpg/640px-Grilled_Cheese_sandwich.jpg',
  'Pasta Salad':        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/Pasta_salad_with_tuna_and_eggs.jpg/640px-Pasta_salad_with_tuna_and_eggs.jpg',
  'Fruit Cup':          'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Fruit_salad_in_a_glass_bowl.jpg/640px-Fruit_salad_in_a_glass_bowl.jpg',
  'Yogurt Parfait':     'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Yogurt_parfait.jpg/640px-Yogurt_parfait.jpg',
  'Sushi Roll (4pc)':   'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Sushi_platter.jpg/640px-Sushi_platter.jpg',
  'Chicken Fried Rice': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Chicken_fried_rice.jpg/640px-Chicken_fried_rice.jpg',
  'Caesar Salad':       'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Caesar_salad_%281%29.jpg/640px-Caesar_salad_%281%29.jpg',
  'Pumpkin Soup':       'https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/Pumpkin_soup.jpg/640px-Pumpkin_soup.jpg',
  'Iced Tea':           'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/Iced_tea_glass.jpg/640px-Iced_tea_glass.jpg',
  'Bottled Water':      'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0d/Bottled_water.jpg/640px-Bottled_water.jpg'
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

  const fetchMenu = React.useCallback(async () => {
    // Try multiple column shapes (name vs item_name) and is_active presence
    const shapes = [
      { sel: 'id,name,price,image_url,is_active', active: true },
      { sel: 'id,name:item_name,price,image_url,is_active', active: true },
      { sel: 'id,name,price,image_url', active: false },
      { sel: 'id,name:item_name,price,image_url', active: false },
    ]
    for (const s of shapes) {
      try {
        let q = supabase.from('lunch_menu').select(s.sel).order('name', { ascending: true }).limit(32)
        if (s.active) q = q.eq('is_active', true)
        const { data, error } = await q
        if (!error && Array.isArray(data)) return data
      } catch { /* try next */ }
    }
    return []
  }, [])

  const refresh = React.useCallback(async () => {
    setLoading(true); setError('')
    try {
      if (user?.id) {
        const { data: w } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle()
        setWallet(w?.balance ?? 0)
      } else setWallet(0)

      const items = await fetchMenu()
      setMenu(items || [])
    } catch (e) {
      setError(e.message || 'Failed to load lunch menu')
      setMenu([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, fetchMenu])

  React.useEffect(() => { refresh() }, [refresh])

  // cart ops
  const addOne = (item) => setCart(c => ({ ...c, [item.id]: { item, qty: (c[item.id]?.qty || 0) + 1 } }))
  const subOne = (item) => setCart(c => {
    const prev = c[item.id]; if (!prev) return c
    const qty = prev.qty - 1; const n = { ...c }
    if (qty <= 0) delete n[item.id]; else n[item.id] = { item, qty }
    return n
  })
  const clearCart = () => setCart({})
  const removeItem = (id) => setCart(c => { const n = { ...c }; delete n[id]; return n })

  const placeOrder = async () => {
    if (!user?.id) return alert('Please sign in.')
    if (!Object.keys(cart).length) return
    const items = Object.values(cart)
    const sum = items.reduce((s, c) => s + (Number(c.item.price || 0) * c.qty), 0)
    if (wallet < sum) return alert('Insufficient wallet balance.')

    const rows = items.map(c => ({ user_id: user.id, item_id: c.item.id, qty: c.qty }))
    const { error: e1 } = await supabase.from('lunch_orders').insert(rows)
    if (e1) return alert(`Order failed: ${e1.message}`)

    const { error: e2 } = await supabase.from('wallets').update({ balance: wallet - sum }).eq('user_id', user.id)
    if (e2) return alert(`Wallet update failed: ${e2.message}`)

    setWallet(w => w - sum); clearCart(); alert('Order placed! 👌')
  }

  // 4×4 cap
  const gridItems = (menu || []).slice(0, 16)

  /** Image with robust fallback to a relevant photo; never leaves a broken icon */
  const Img = ({ name, url }) => {
    const [src, setSrc] = React.useState(url || FALLBACK_IMG[name] || FALLBACK_IMG['Fruit Cup'])
    React.useEffect(() => {
      setSrc(url || FALLBACK_IMG[name] || FALLBACK_IMG['Fruit Cup'])
    }, [name, url])
    return (
      <img
        className="compactImg"
        src={src}
        alt={name}
        onError={() => {
          const fb = FALLBACK_IMG[name] || FALLBACK_IMG['Fruit Cup']
          if (src !== fb) setSrc(fb)
        }}
      />
    )
  }

  return (
    <div className="lunchPanel">
      <div className="glass lunchShell">
        {/* LEFT — scrollable menu */}
        <div className="lunchLeft">
          {loading && <div className="small">Loading menu…</div>}
          {error && <div className="small" style={{ color: '#ef4444' }}>{error}</div>}

          <div className="lunchGridFixed">
            {gridItems.map(item => {
              const qty = cart[item.id]?.qty || 0
              const name = item.name ?? item.item_name ?? 'Item'
              return (
                <div className="lunchCardCompact glass" key={item.id}>
                  <div className="compactImgWrap">
                    <Img name={name} url={item.image_url} />
                  </div>

                  <div className="compactMeta">
                    <div className="compactTitle" title={name}>{name}</div>
                    <div className="compactPrice"><Money n={item.price} /></div>
                  </div>

                  {/* Controls stay inside the card */}
                  <div className="compactControls">
                    <button className="btn xs" onClick={() => subOne(item)} aria-label={`Decrease ${name}`}>−</button>
                    <div className="qty">{qty}</div>
                    <button className="btn xs" onClick={() => addOne(item)} aria-label={`Increase ${name}`}>+</button>
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

        {/* RIGHT — compact cart with its own scroll */}
        <div className="lunchRight glass card">
          <div className="cartHeader">
            <span className="badge">Wallet: <Money n={wallet} /></span>
            {Object.keys(cart).length > 0 && <button className="btn xs" onClick={clearCart}>Clear</button>}
          </div>

          <div className="cartTitle">Cart</div>
          <div className="cartList">
            {Object.values(cart).length === 0 && (
              <div className="small" style={{ opacity:.8 }}>No items yet. Tap + to add.</div>
            )}
            {Object.values(cart).map(({ item, qty }) => {
              const name = item.name ?? item.item_name ?? 'Item'
              return (
                <div className="cartLineItem" key={item.id}>
                  {qty} × {name}
                  <span className="cartLineBtns">
                    <button className="btn xs" onClick={() => subOne(item)}>-</button>
                    <button className="btn xs" onClick={() => addOne(item)}>+</button>
                    <button className="btn xs" onClick={() => removeItem(item.id)}>✕</button>
                  </span>
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
              style={{ marginLeft: 10 }}  // nudge to the right
            >
              Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
