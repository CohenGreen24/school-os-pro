// src/components/Lunch.jsx
import React from 'react'
import { supabase } from '../supabase'

const Money = ({ n }) => <b>${(Number(n) || 0).toFixed(2)}</b>

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

  // Robust fetch that tolerates legacy schemas
  const loadMenu = React.useCallback(async () => {
    // Try a sequence of column/filters until one works and returns rows
    const attempts = [
      { select: 'id,name,price,image_url,is_active', active: true },
      { select: 'id,name:item_name,price,image_url,is_active', active: true },
      { select: 'id,name,price,image_url', active: false },
      { select: 'id,name:item_name,price,image_url', active: false },
    ]

    for (const a of attempts) {
      try {
        let q = supabase.from('lunch_menu').select(a.select).order('name', { ascending: true }).limit(24)
        if (a.active) q = q.eq('is_active', true)
        const { data, error } = await q
        if (error) {
          // Try next attempt
          continue
        }
        if (Array.isArray(data)) {
          return data // even if empty; we’ll handle empty case in UI
        }
      } catch {
        // keep looping
      }
    }
    throw new Error('Could not load lunch_menu — please ensure required columns exist.')
  }, [])

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (user?.id) {
        const { data: w } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .maybeSingle()
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
  const removeItem = (id) => setCart(curr => {
    const next = { ...curr }
    delete next[id]
    return next
  })
  const clearCart = () => setCart({})

  // place order
  const placeOrder = async () => {
    if (!user?.id) { alert('Please sign in first.'); return }
    if (!Object.keys(cart).length) return

    const items = Object.values(cart)
    const sum = items.reduce((s, c) => s + (Number(c.item.price || 0) * c.qty), 0)
    if (wallet < sum) { alert('Insufficient wallet balance.'); return }

    const rows = items.map(c => ({ user_id: user.id, item_id: c.item.id, qty: c.qty }))

    const { error: e1 } = await supabase.from('lunch_orders').insert(rows)
    if (e1) { alert(`Order failed: ${e1.message}`); return }

    const { error: e2 } = await supabase
      .from('wallets')
      .update({ balance: wallet - sum })
      .eq('user_id', user.id)
    if (e2) { alert(`Wallet update failed: ${e2.message}`); return }

    setWallet(w => w - sum)
    clearCart()
    alert('Order placed! 👌')
  }

  return (
    <div className="lunchPanel">
      {/* Two-column layout */}
      <div
        className="glass"
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 1fr',
          gap: 12,
          padding: 10,
          borderRadius: '12px',
          minHeight: 520
        }}
      >
        {/* LEFT: 4×4 Grid */}
        <div style={{ minWidth: 0 }}>
          {loading && <div className="small">Loading menu…</div>}
          {error && <div className="small" style={{ color: '#ef4444' }}>{error}</div>}

          <div
            className="lunchGrid"
            style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', alignContent: 'start' }}
          >
            {menu.map(item => {
              const inCart = cart[item.id]?.qty || 0
              // tolerate missing name/image_url from legacy schemas
              const displayName = item.name ?? item.item_name ?? 'Item'
              return (
                <div className="lunchCard glass" key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="lunchImgWrap">
                    {item.image_url
                      ? <img src={item.image_url} alt={displayName} className="lunchImg" />
                      : <div className="lunchImg placeholder">No image</div>}
                  </div>

                  <div className="card" style={{ display: 'grid', gap: 6 }}>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {displayName}
                      </div>
                      <Money n={item.price} />
                    </div>

                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div className="flex" style={{ gap: 6, alignItems: 'center' }}>
                        <button className="btn xs" onClick={() => subOne(item)}>-</button>
                        <div style={{ minWidth: 24, textAlign: 'center' }}>{inCart}</div>
                        <button className="btn xs" onClick={() => addOne(item)}>+</button>
                      </div>
                      <button className="btn btn-primary xs" onClick={() => addOne(item)}>Add</button>
                    </div>
                  </div>
                </div>
              )
            })}

            {(!loading && menu.length === 0) && (
              <div className="small" style={{ gridColumn: '1/-1', opacity: .8 }}>
                No items available yet. (Check <code>public.lunch_menu</code> has rows.)
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Wallet + Cart */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="badge">Wallet: <Money n={wallet} /></span>
            {Object.keys(cart).length > 0 && <button className="btn xs" onClick={clearCart}>Clear cart</button>}
          </div>

          <div style={{ fontWeight: 700, marginBottom: 6 }}>Cart</div>
          <div style={{ overflowY: 'auto', flex: 1, display: 'grid', gap: 8, paddingRight: 2 }}>
            {Object.values(cart).length === 0 && (
              <div className="small" style={{ opacity: .8 }}>No items yet. Tap + to add.</div>
            )}
            {Object.values(cart).map(({ item, qty }) => {
              const displayName = item.name ?? item.item_name ?? 'Item'
              return (
                <div key={item.id} className="glass" style={{ padding: 8, borderRadius: 10, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                    <div className="small"><Money n={item.price} /> × {qty}</div>
                  </div>
                  <div className="flex" style={{ gap: 6, alignItems: 'center' }}>
                    <button className="btn xs" onClick={() => subOne(item)}>-</button>
                    <div>{qty}</div>
                    <button className="btn xs" onClick={() => addOne(item)}>+</button>
                    <button className="btn xs" onClick={() => removeItem(item.id)}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex" style={{ justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, gap: 10 }}>
            <span>Total: <Money n={total} /></span>
            <button
              className="btn btn-primary"
              disabled={total <= 0 || total > wallet}
              onClick={placeOrder}
              style={{ marginLeft: 6 }}   // nudge to the right “just a smidge”
            >
              Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
