import React from 'react'
import { supabase } from '../supabase'

export default function Library({ user, styleVariant='glass' }){
  const [loans,setLoans]=React.useState([])
  const [err,setErr]=React.useState('')

  React.useEffect(()=>{(async()=>{
    try{
      const {data,error}=await supabase.rpc('get_user_loans',{p_user_id:user.id})
      if(error) throw error
      setLoans(data||[])
    }catch(e){
      setErr('Library not configured (optional).')
    }
  })()},[user.id])

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'
  return (
    <div className={cardClass}>
      <h2>Library</h2>
      {err && <div className="small" style={{color:'#f59e0b'}}>{err}</div>}
      <div className="list">
        {loans.map(l => (
          <div key={l.loan_id} className={cardClass+" flex"} style={{justifyContent:'space-between'}}>
            <div style={{minWidth:0}}>
              <div><b className="clamp">{l.title}</b> — {l.author}</div>
              <div className="small">Due {l.due_date}</div>
            </div>
            <div className={'badge '+(l.status==='Overdue'?'badge-red': l.status==='Due Soon'?'':'badge-green')}>{l.status}</div>
          </div>
        ))}
        {loans.length===0 && !err && <div className="small loading">No loans…</div>}
      </div>
    </div>
  )
}
