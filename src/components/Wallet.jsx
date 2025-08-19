import React from 'react'
import { supabase } from '../supabase'

export default function Wallet({ user, admin=false, targetStudentId, styleVariant='glass', density='comfortable' }) {
  const studentId = targetStudentId || user.id
  const [balance,setBalance] = React.useState(0)
  const [amt,setAmt] = React.useState('')

  const loadWallet = React.useCallback(async () => {
    const { data } = await supabase
      .from('wallets')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle()
    if (data) setBalance(Number(data.balance) || 0)
  }, [studentId])

  React.useEffect(() => { if (studentId) loadWallet() }, [studentId, loadWallet])

  // Listen for wallet change broadcasts (sent by Lunch.jsx after orders)
  React.useEffect(() => {
    const onWalletChanged = () => loadWallet()
    window.addEventListener('wallet-changed', onWalletChanged)
    return () => window.removeEventListener('wallet-changed', onWalletChanged)
  }, [loadWallet])

  const adjust = async (sign) => {
    const v = parseFloat(amt)
    if (isNaN(v)) return
    const newBal = sign==='add' ? balance + v : balance - v
    const { data: exists } = await supabase.from('wallets').select('*').eq('student_id', studentId).maybeSingle()
    if (exists) {
      await supabase.from('wallets').update({ balance: newBal }).eq('student_id', studentId)
    } else {
      await supabase.from('wallets').insert({ student_id: studentId, balance: newBal })
    }
    setAmt('')
    loadWallet()
  }

  const cardClass = styleVariant==='solid' ? 'card solid' : styleVariant==='outline' ? 'card outline' : 'glass card'
  const rowClass = density==='compact' ? 'flex wrap narrow' : 'flex wrap'

  return (
    <div className={cardClass}>
      <div className="flex"><h2>Lunch Wallet</h2><span className="right small">Teacher adjustable</span></div>
      <div style={{fontSize:28,fontWeight:800}}>${balance.toFixed(2)}</div>
      {admin && (
        <div className={rowClass}>
          <input className="input" placeholder="Amount" value={amt} onChange={e=>setAmt(e.target.value)} />
          <button className="btn btn-primary" onClick={()=>adjust('add')}>Add</button>
          <button className="btn btn-ghost" onClick={()=>adjust('sub')}>Subtract</button>
        </div>
      )}
    </div>
  )
}
