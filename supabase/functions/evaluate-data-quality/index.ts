import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { hasValidInternalSecret, internalJsonResponse as jsonResponse } from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

Deno.serve(observeEdgeHandler('data-quality', async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)
  if (!await hasValidInternalSecret(request, 'SYNC_SECRET')) return jsonResponse({ error: 'Unauthorized' }, 401)
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  const admin = createClient(url, key, { auth: { persistSession: false } })
  const { data, error } = await admin.rpc('evaluate_data_quality')
  if (error) {
    console.error(JSON.stringify({ event: 'data_quality_evaluation_failed', errorCode: error.code ?? 'DATABASE_EVALUATION_FAILED' }))
    return jsonResponse({ error: 'Unable to evaluate data quality' }, 500)
  }
  return jsonResponse({ dataTrust: data })
}))
