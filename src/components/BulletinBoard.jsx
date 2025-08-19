import React from 'react'
import { supabase } from '../supabase'

export default function BulletinBoard({ user, styleVariant='glass', density='comfortable' }){
  const [items,setItems] = React.useState([])
  const [title,setTitle] = React.useState('')
  const [content,setContent] = React.useState('')
  const canPost = user.role!=='student'

  const load = async ()=>{
    const { data } = await supabase.from('bulletin_board').select('*, author:author_id(name)').order('created_at',{ascending:false}).limit(30)
    setItems(data||[])
  }
  React.useEffect(()=>{
    load()
    const ch = supabase.channel('bulletins').on('postgres_changes',{event:'*',schema:'public',table:'bulletin_board'},load).subscribe()
    return ()=>supabase.removeChannel(ch)
  },[])

  const post = async ()=>{
    if(!title||!content) return
    await supabase.from('bulletin_board').insert({title,content,author_id:user.id})
    setTitle(''); setContent('')
  }

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'
  const rowClass = density==='compact' ? 'row narrow' : 'row'

  return (
    <div className={cardClass}>
      <div className="flex"><h2>Bulletin Board</h2><span className="right small">{items.length} posts</span></div>
      {canPost && (
        <div className={rowClass} style={{gridTemplateColumns:'1fr 2fr auto'}}>
          <input className="input" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <input className="input" placeholder="Content" value={content} onChange={e=>setContent(e.target.value)} />
          <button className="btn btn-primary" onClick={post}>Post</button>
        </div>
      )}
      <div className="list">
        {items.map(b => (
          <div key={b.id} className={cardClass}>
            <div className="flex">
              <div style={{minWidth:0}}>
                <div><b className="clamp">{b.title}</b></div>
                <div className="small clamp">{b.content}</div>
              </div>
              <div className="right small" style={{textAlign:'right',minWidth:140}}>
                <div>{b.author?.name||'—'}</div>
                <div>{new Date(b.created_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
        {items.length===0 && <div className="small loading">Loading bulletins…</div>}
      </div>
    </div>
  )
}
