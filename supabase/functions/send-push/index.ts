// Supabase Edge Function : envoi de notification push
// Deploy: supabase functions deploy send-push
// Secrets requis (Supabase Dashboard → Settings → Edge Functions → Secrets):
//   - VAPID_PUBLIC_KEY
//   - VAPID_PRIVATE_KEY
//   - VAPID_EMAIL (format: mailto:coach@example.com)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') ?? 'mailto:coach@lorsquad.com'
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const { user_id, title, body, url, type } = await req.json()

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'user_id et title requis' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Récupérer la souscription du user
    const { data: sub, error: fetchErr } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle()

    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!sub) {
      return new Response(JSON.stringify({ error: 'Aucune souscription pour cet utilisateur' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload = JSON.stringify({
      title,
      body: body ?? '',
      url: url ?? '/',
      type: type ?? 'info',
    })

    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      payload
    )

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue'
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
