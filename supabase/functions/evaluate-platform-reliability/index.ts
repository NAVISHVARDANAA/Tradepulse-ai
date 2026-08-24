import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import {
  hasValidInternalSecret,
  internalJsonResponse as jsonResponse,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

Deno.serve(observeEdgeHandler('platform-reliability', async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!await hasValidInternalSecret(request, 'SYNC_SECRET')) {
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
  const { data, error } = await admin.rpc('evaluate_platform_reliability')

  if (error) {
    console.error(JSON.stringify({
      event: 'platform_reliability_evaluation_failed',
      errorCode: error.code ?? 'DATABASE_EVALUATION_FAILED',
    }))
    return jsonResponse({ error: 'Unable to evaluate platform reliability' }, 500)
  }

  return jsonResponse({ reliability: data })
}))
