import React from 'react'

/**
 * Sidebar (reorderable)
 * - Drag items to reorder (saved per-user with localStorage key nav_order_<user.id>)
 * - Click to switch pages
 */
export default function Sidebar({ user, page, setPage, defaultPages }){
  const key = `nav_order_${user.id}`
  const [order,setOrder] = React.useState(()=>{
    const saved = JSON.parse(localStorage.getItem(key) || '[]')
    const lookup = new Map(defaultPages.map(p=>[p.key,p]))
    const arr = (saved.length ? saved : defaultPages.map(p=>p.key))
      .map(k=>lookup.get(k)).filter(Boolean)
    return arr
  })
  const [reorder,setReorder] = React.useState(false)
  const dragId = React.useRef(null)

  const save = (arr)=>{
    setOrder(arr)
    localStorage.setItem(key, JSON.stringify(arr.map(a=>a.key)))
  }
  const start = (k)=> dragId.current = k
  const over = (e)=> e.preventDefault()
  const drop = (k)=>{
    const from = order.findIndex(x=>x.key===dragId.current)
    const to = order.findIndex(x=>x.key===k)
    if(from<0 || to<0 || from===to) return
    const arr=[...order]; const [m]=arr.splice(from,1); arr.splice(to,0,m); save(arr)
  }

  return (
    <aside className="glass sidebarNav">
      <div className="flex" style={{justifyContent:'space-between', alignItems:'center'}}>
        <div className="navHeader"><b>Navigation</b></div>
        <button className="btn btn-ghost" onClick={()=>setReorder(v=>!v)}>{reorder?'Done':'Reorder'}</button>
      </div>
      <div className="nav">
        {order.map(p => (
          <button
            key={p.key}
            className={page===p.key?'active':''}
            onClick={()=>setPage(p.key)}
            draggable={reorder}
            onDragStart={()=>start(p.key)}
            onDragOver={over}
            onDrop={()=>drop(p.key)}
            style={reorder?{cursor:'grab', transition:'transform .15s'}:{}}
          >
            {p.label}
          </button>
        ))}
      </div>
    </aside>
  )
}
