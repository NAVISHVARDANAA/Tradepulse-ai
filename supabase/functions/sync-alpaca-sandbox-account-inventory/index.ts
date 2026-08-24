import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import {
  ALPACA_BROKER_ACCOUNT_INVENTORY_VERSION,
  ALPACA_BROKER_SANDBOX_ORIGIN,
  BrokerSandboxError,
  createAlpacaBrokerSandboxAdapter,
} from '../_shared/alpacaBrokerSandbox.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type InventoryRecord = {
  status: 'passed' | 'failed'
  httpStatus: number | null
  latencyMs: number
  attemptCount: number
  totalAccounts: number
  activeAccounts: number
  pendingAccounts: number
  actionRequiredAccounts: number
  rejectedAccounts: number
  closedAccounts: number
  restrictedAccounts: number
  currencies: string[]
  snapshotDigest: string | null
  pageLimitReached: boolean
  errorCode: string | null
}

function failedInventory(errorCode: string): InventoryRecord {
  return {
    status: 'failed',
    httpStatus: null,
    latencyMs: 0,
    attemptCount: 0,
    totalAccounts: 0,
    activeAccounts: 0,
    pendingAccounts: 0,
    actionRequiredAccounts: 0,
    rejectedAccounts: 0,
    closedAccounts: 0,
    restrictedAccounts: 0,
    currencies: [],
    snapshotDigest: null,
    pageLimitReached: false,
    errorCode,
  }
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
  let inventory: InventoryRecord

  if (!apiKey || !apiSecret) {
    inventory = failedInventory('CONFIGURATION_INVALID')
  } else {
    try {
      const result = await createAlpacaBrokerSandboxAdapter({
        apiKey,
        apiSecret,
      }).readAccountInventory()
      inventory = {
        status: result.status,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        attemptCount: result.attemptCount,
        totalAccounts: result.totalAccounts,
        activeAccounts: result.activeAccounts,
        pendingAccounts: result.pendingAccounts,
        actionRequiredAccounts: result.actionRequiredAccounts,
        rejectedAccounts: result.rejectedAccounts,
        closedAccounts: result.closedAccounts,
        restrictedAccounts: result.restrictedAccounts,
        currencies: result.currencies,
        snapshotDigest: result.snapshotDigest,
        pageLimitReached: result.pageLimitReached,
        errorCode: null,
      }
    } catch (error) {
      const safeError = error instanceof BrokerSandboxError
        ? error
        : new BrokerSandboxError('PROVIDER_UNAVAILABLE', null, 0, 0)
      inventory = {
        ...failedInventory(safeError.code),
        httpStatus: safeError.httpStatus,
        latencyMs: safeError.latencyMs,
        attemptCount: safeError.attemptCount,
      }
    }
  }

  const { data, error } = await admin.rpc('persist_broker_account_inventory', {
    p_provider_code: 'alpaca-broker-sandbox',
    p_adapter_version: ALPACA_BROKER_ACCOUNT_INVENTORY_VERSION,
    p_api_origin: ALPACA_BROKER_SANDBOX_ORIGIN,
    p_status: inventory.status,
    p_http_status: inventory.httpStatus,
    p_latency_ms: inventory.latencyMs,
    p_attempt_count: inventory.attemptCount,
    p_total_accounts: inventory.totalAccounts,
    p_active_accounts: inventory.activeAccounts,
    p_pending_accounts: inventory.pendingAccounts,
    p_action_required_accounts: inventory.actionRequiredAccounts,
    p_rejected_accounts: inventory.rejectedAccounts,
    p_closed_accounts: inventory.closedAccounts,
    p_restricted_accounts: inventory.restrictedAccounts,
    p_currencies: inventory.currencies,
    p_snapshot_digest: inventory.snapshotDigest,
    p_page_limit_reached: inventory.pageLimitReached,
    p_error_code: inventory.errorCode,
  })

  if (error) {
    return jsonResponse({ error: 'Unable to record the broker account inventory' }, 500)
  }

  const { data: monitoring, error: monitoringError } = await admin.rpc(
    'evaluate_broker_operations_health',
    { p_provider_code: 'alpaca-broker-sandbox' },
  )

  return jsonResponse(
    {
      inventory: data,
      monitoring: monitoringError
        ? { operationalStatus: 'evaluation_unavailable' }
        : monitoring,
      capability: {
        assetRead: true,
        accountsRead: inventory.status === 'passed',
        ordersRead: false,
        ordersWrite: false,
      },
    },
    inventory.status === 'passed' ? 200 : 503,
  )
})
