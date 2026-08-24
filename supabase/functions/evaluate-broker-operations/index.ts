import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import { hasValidInternalSecret, internalJsonResponse as jsonResponse } from '../_shared/http.ts'

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!await hasValidInternalSecret(request, 'BROKER_SANDBOX_SYNC_SECRET')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const { data, error } = await admin.rpc('evaluate_broker_operations_health', {
    p_provider_code: 'alpaca-broker-sandbox',
  })

  if (error) {
    return jsonResponse({ error: 'Unable to evaluate broker operations health' }, 500)
  }

  return jsonResponse({ monitoring: data })
})
