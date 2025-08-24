import React from 'react'
import { supabase } from '../supabase'

function Money({ n }) {
  const val = Number.isFinite(Number(n)) ? Number(n) : 0
  return <b>${val.toFixed(2)}</b>
}

export default function Lunch({ user }) {
  const isStaff = user?.role === 'teacher' || user?.role === 'admin'

  const [menu, setMenu] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [wallet, setWallet] = React.useState(0)
  const [query, setQuery] = React.useState('')

  // cart: { [itemId]: { item, qty } }
  const [cart, setCart] = React.useState({})

  const total = React.useMemo(() => {
    return Object.values(cart).reduce((sum, c) => sum + (Number(c.item.price || 0) * c.qty), 0)
  }, [cart])

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
  }, [user?.id])

  React.useEffect(() => { refresh() }, [refresh])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return menu
    return menu.filter(i => (i.name || '').toLowerCase().includes(q))
  }, [menu, query])

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

  const placeOrder = async () => {
    if (!user?.id) { alert('Please sign in first.'); return }
    if (!Object.keys(cart).length) return

    // calculate total again for safety
    const items = Object.values(cart)
    const sum = items.reduce((s, c) => s + (Number(c.item.price || 0) * c.qty), 0)

    if (wallet < sum) {
      alert('Insufficient wallet balance.')
      return
    }

    // Build rows: one row per cart item (qty captured in the row)
    const rows = items.map(c => ({
      user_id: user.id,
      item_id: c.item.id,
      qty: c.qty
    }))

    // Insert orders then deduct wallet
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
      {/* Top controls bar */}
      <div
        className="glass card"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          alignItems: 'center',
          marginBottom: 10
        }}
      >
        {/* Left: Wallet + search */}
        <div className="flex" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="badge">Wallet: <Money n={wallet} /></span>
          <input
            className="input"
            placeholder="Search menu…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 'min(300px, 60%)' }}
          />
        </div>

        {/* Right: Cart summary + Order */}
        <div className="flex" style={{ gap: 8, alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <span className="badge">Items: {Object.keys(cart).length}</span>
          <span className="badge">Total: <Money n={total} /></span>
          <button
            className="btn btn-primary"
            disabled={total <= 0 || total > wallet}
            onClick={placeOrder}
          >
            Order
          </button>
          {Object.keys(cart).length > 0 && (
            <button className="btn" onClick={clearCart}>Clear</button>
          )}
        </div>
      </div>

      {/* Main area: Grid (left) + Cart (right) */}
      <div
        className="grid glass"
        style={{
          display: 'grid',
          gridTemplateColumns: '3fr 1fr',
          gap: 10,
          padding: 10,
          borderRadius: '12px'
        }}
      >
        {/* LEFT: 4x4 menu grid */}
        <div>
          {loading && <div className="small">Loading menu…</div>}
          {error && <div className="small" style={{ color: '#ef4444' }}>{error}</div>}

          <div
            className="lunchGrid"
            style={{
              gridTemplateColumns: 'repeat(4, minmax(0,1fr))'
            }}
          >
            {filtered.map(item => {
              const inCart = cart[item.id]?.qty || 0
              return (
                <div className="lunchCard glass" key={item.id} style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="lunchImgWrap">
                    {item.image_url
                      ? <img src={item.image_url} alt={item.name} className="lunchImg" />
                      : <div className="lunchImg placeholder">No image</div>}
                  </div>

                  <div className="card" style={{ display: 'grid', gap: 6 }}>
                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 700, fontSize: '.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      <div><Money n={item.price} /></div>
                    </div>

                    <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <div className="flex" style={{ gap: 6, alignItems: 'center' }}>
                        <button className="btn xs" onClick={() => subOne(item)}>-</button>
                        <div style={{ minWidth: 24, textAlign: 'center' }}>{inCart}</div>
                        <button className="btn xs" onClick={() => addOne(item)}>+</button>
                      </div>
                      {isStaff && (
                        <button
                          className="btn xs"
                          title="Deactivate/Activate"
                          onClick={async () => {
                            const { error: e } = await supabase
                              .from('lunch_menu')
                              .update({ is_active: !true }) // noop toggling here (we keep staff edit in a separate editor later)
                              .eq('id', item.id)
                            if (e) alert(e.message)
                            refresh()
                          }}
                          style={{ display: 'none' }} /* keep UI clean for demo */
                        >
                          Toggle
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Cart panel (scrollable list) */}
        <div className="glass card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <b>Cart</b>
            {Object.keys(cart).length > 0 && (
              <button className="btn xs" onClick={clearCart}>Clear</button>
            )}
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 420, display: 'grid', gap: 8, paddingRight: 2 }}>
            {Object.values(cart).length === 0 && (
              <div className="small" style={{ opacity: .8 }}>No items yet. Add from the menu →</div>
            )}

            {Object.values(cart).map(({ item, qty }) => (
              <div key={item.id} className="glass" style={{ padding: 8, borderRadius: 10, display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8 }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
                  <div className="small"><Money n={item.price} /> × {qty}</div>
                </div>
                <div className="flex" style={{ gap: 6, alignItems: 'center' }}>
                  <button className="btn xs" onClick={() => subOne(item)}>-</button>
                  <div>{qty}</div>
                  <button className="btn xs" onClick={() => addOne(item)}>+</button>
                  <button className="btn xs" onClick={() => removeItem(item.id)}>✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
            <span>Total: <Money n={total} /></span>
            <button
              className="btn btn-primary"
              disabled={total <= 0 || total > wallet}
              onClick={placeOrder}
            >
              Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
