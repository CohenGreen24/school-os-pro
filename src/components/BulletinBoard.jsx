// src/components/BulletinBoard.jsx
import React from 'react'
import { supabase } from '../supabase'

function usePosts() {
  const [posts,setPosts] = React.useState([])
  React.useEffect(()=>{ (async()=>{
    const { data } = await supabase
      .from('bulletin_posts')
      .select('*, bulletin_polls(*, bulletin_poll_options(*)), created_by(*)')
      .order('created_at',{ascending:false})
    setPosts(data||[])
  })() },[])
  return posts
}

export default function BulletinBoard({ user }) {
  const posts = usePosts()
  const isStaff = ['teacher','admin','wellbeing'].includes(user?.role)

  const createPoll = async () => {
    if (!isStaff) return
    const title = prompt('Poll title (e.g. Math club venue)?')
    if (!title) return
    const choices = prompt('Options (comma separated, 2–6)?')
    const arr = (choices||'').split(',').map(s=>s.trim()).filter(Boolean).slice(2,6).length
      ? (choices||'').split(',').map(s=>s.trim()).filter(Boolean).slice(0,6)
      : ['Option A','Option B','Option C','Option D']
    const { data: post, error } = await supabase.from('bulletin_posts').insert({
      title, body:null, created_by:user.id, scope:'school'
    }).select('*').single()
    if (error) return alert(error.message)
    const { data: poll, error: pe } = await supabase.from('bulletin_polls').insert({ post_id: post.id, question: title }).select('*').single()
    if (pe) return alert(pe.message)
    const rows = arr.map(t => ({ post_id: post.id, option_text: t }))
    const { error: oe } = await supabase.from('bulletin_poll_options').insert(rows)
    if (oe) return alert(oe.message)
    alert('Poll created.')
    location.reload()
  }

  const vote = async (post_id, option_id) => {
    await supabase.rpc('cast_vote', { p_post: post_id, p_option: option_id, p_voter: user.id })
  }

  return (
    <div className="glass card" style={{padding:10}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
        <h3 style={{margin:0}}>Bulletin Board</h3>
        {isStaff && <button className="btn xs btn-primary" onClick={createPoll}>+ New Poll</button>}
      </div>
      <div className="blockList">
        {posts.map(p => (
          <div className="blockItem" key={p.id}>
            <div style={{flex:1}}>
              <div style={{fontWeight:800, marginBottom:6}}>{p.title}</div>
              {p.body && <div className="small">{p.body}</div>}
              {p.bulletin_polls?.length ? (
                <div className="small" style={{marginTop:8}}>
                  {p.bulletin_polls.map(pl => (
                    <div key={pl.id} style={{margin:'6px 0'}}>
                      <div style={{fontWeight:700, marginBottom:6}}>{pl.question}</div>
                      <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                        {p.bulletin_poll_options?.filter(o=>o.post_id===p.id).map(o => (
                          <button key={o.id} className="btn xs" onClick={()=>vote(p.id, o.id)}>{o.option_text}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {!posts.length && <div className="small" style={{opacity:.8}}>No posts yet.</div>}
      </div>
    </div>
  )
}
