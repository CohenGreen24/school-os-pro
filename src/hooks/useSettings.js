// src/hooks/useSettings.js
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'

export function useUserSetting(user, key, defaultValue) {
  const [value, setValue] = useState(defaultValue)
  const [loading, setLoading] = useState(!!user)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('dashboard_settings')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle()
    if (!error && data?.value != null) setValue(data.value)
    setLoading(false)
  }, [user?.id, key])

  const save = useCallback(async (next) => {
    if (!user?.id) return
    const payload = typeof next === 'function' ? next(value) : next
    setValue(payload)
    await supabase.rpc('set_user_setting', { p_user_id: user.id, p_key: key, p_value: payload })
  }, [user?.id, key, value])

  useEffect(() => { load() }, [load])

  return { value, setValue: save, loading }
}
