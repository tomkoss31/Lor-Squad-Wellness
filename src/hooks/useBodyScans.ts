import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { BodyScan } from '../lib/types'

export function useBodyScans(clientId?: string) {
  const [scans, setScans] = useState<BodyScan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchScans = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase.from('body_scans').select('*').order('date', { ascending: false })
      if (clientId) query = query.eq('client_id', clientId)
      const { data, error } = await query
      if (error) throw error
      setScans(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { fetchScans() }, [fetchScans])

  const createScan = async (data: Partial<BodyScan>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')
    const { data: created, error } = await supabase
      .from('body_scans')
      .insert({ ...data, coach_id: user.id })
      .select()
      .single()
    if (error) throw error
    setScans(prev => [created, ...prev])
    return created
  }

  return { scans, loading, error, createScan, refetch: fetchScans }
}
