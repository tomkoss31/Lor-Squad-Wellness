import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Suivi } from '../lib/types'

export function useSuivis(clientId?: string) {
  const [suivis, setSuivis] = useState<Suivi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSuivis = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase.from('suivis').select('*').order('date', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      const { data, error } = await query
      if (error) throw error
      setSuivis(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { fetchSuivis() }, [fetchSuivis])

  const createSuivi = async (data: Partial<Suivi>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')
    const { data: created, error } = await supabase
      .from('suivis')
      .insert({ ...data, coach_id: user.id })
      .select()
      .single()
    if (error) throw error
    setSuivis(prev => [created, ...prev])
    return created
  }

  return { suivis, loading, error, createSuivi, refetch: fetchSuivis }
}
