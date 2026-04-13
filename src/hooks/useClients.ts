import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Client } from '../lib/types'

export function useClients() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setClients(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchClients() }, [fetchClients])

  const createClient = async (data: Partial<Client>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Non authentifié')
    const { error } = await supabase.from('clients').insert({ ...data, coach_id: user.id })
    if (error) throw error
    await fetchClients()
  }

  const updateClient = async (id: string, data: Partial<Client>) => {
    const { error } = await supabase.from('clients').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c))
  }

  return { clients, loading, error, createClient, updateClient, refetch: fetchClients }
}
