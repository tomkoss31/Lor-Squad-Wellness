import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Bilan } from '../lib/types'

export function useBilans(clientId?: string) {
  const [bilans, setBilans] = useState<Bilan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBilans = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase.from('bilans').select('*').order('date', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      const { data, error } = await query
      if (error) throw error
      setBilans(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { fetchBilans() }, [fetchBilans])

  const createBilan = async (data: Partial<Bilan>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')
    const { data: created, error } = await supabase
      .from('bilans')
      .insert({ ...data, coach_id: user.id })
      .select()
      .single()
    if (error) throw error
    setBilans(prev => [created, ...prev])
    return created
  }

  return { bilans, loading, error, createBilan, refetch: fetchBilans }
}
