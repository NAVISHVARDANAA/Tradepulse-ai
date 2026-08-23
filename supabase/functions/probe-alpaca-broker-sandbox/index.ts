import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import {
  ALPACA_BROKER_ADAPTER_VERSION,
  ALPACA_BROKER_SANDBOX_ORIGIN,
  BrokerSandboxError,
  createAlpacaBrokerSandboxAdapter,
} from '../_shared/alpacaBrokerSandbox.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type ProbeRecord = {
  status: 'passed' | 'failed'
  httpStatus: number | null
  latencyMs: number
  attemptCount: number
  errorCode: string | null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const expectedSecret = Deno.env.get('BROKER_SANDBOX_SYNC_SECRET')
  if (!expectedSecret || request.headers.get('x-sync-secret') !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const apiKey = Deno.env.get('ALPACA_BROKER_API_KEY')
  const apiSecret = Deno.env.get('ALPACA_BROKER_API_SECRET')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  let probe: ProbeRecord

  if (!apiKey || !apiSecret) {
    probe = {
      status: 'failed',
      httpStatus: null,
      latencyMs: 0,
      attemptCount: 0,
      errorCode: 'CONFIGURATION_INVALID',
    }
  } else {
    try {
      const result = await createAlpacaBrokerSandboxAdapter({
        apiKey,
        apiSecret,
      }).probe()
      probe = {
        status: result.status,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        attemptCount: result.attemptCount,
        errorCode: null,
      }
    } catch (error) {
      const safeError = error instanceof BrokerSandboxError
        ? error
        : new BrokerSandboxError('PROVIDER_UNAVAILABLE', null, 0, 0)
      probe = {
        status: 'failed',
        httpStatus: safeError.httpStatus,
        latencyMs: safeError.latencyMs,
        attemptCount: safeError.attemptCount,
        errorCode: safeError.code,
      }
    }
  }

  const { data, error } = await admin.rpc('persist_broker_adapter_probe', {
    p_provider_code: 'alpaca-broker-sandbox',
    p_adapter_version: ALPACA_BROKER_ADAPTER_VERSION,
    p_api_origin: ALPACA_BROKER_SANDBOX_ORIGIN,
    p_status: probe.status,
    p_http_status: probe.httpStatus,
    p_latency_ms: probe.latencyMs,
    p_attempt_count: probe.attemptCount,
    p_error_code: probe.errorCode,
  })

  if (error) {
    return jsonResponse({ error: 'Unable to record the broker sandbox probe' }, 500)
  }

  return jsonResponse(
    {
      probe: data,
      capability: {
        assetRead: probe.status === 'passed',
        accountsRead: false,
        ordersRead: false,
        ordersWrite: false,
      },
    },
    probe.status === 'passed' ? 200 : 503,
  )
})
