import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import {
  ALPACA_SANDBOX_ORDER_ORIGIN,
  createAlpacaSandboxOrderAdapter,
  SandboxOrderError,
  sandboxIdentifierFingerprint,
  type SandboxOrderInput,
  type SandboxOrderResult,
} from '../_shared/alpacaSandboxOrders.ts'
import {
  hasValidInternalSecret,
  internalJsonResponse as jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type SandboxOrderAction = 'submit' | 'cancel' | 'replace' | 'reconcile'

type SandboxOrderRequest = {
  action?: SandboxOrderAction
  commandId?: string
  requestedForUserId?: string
  providerAccountId?: string
  rootClientOrderId?: string
  symbol?: string
  side?: 'buy'
  orderType?: 'limit'
  quantity?: number
  limitPrice?: number | null
  takeProfitLimitPrice?: number
  stopLossStopPrice?: number
}

type LifecycleRow = {
  root_client_order_id: string
  client_order_id: string
  account_fingerprint: string
  symbol: string
  side: 'buy'
  order_type: 'limit'
  quantity: number | string
  limit_price: number | string | null
  take_profit_limit_price: number | string
  stop_loss_stop_price: number | string
  estimated_notional_usd: number | string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CLIENT_ORDER_PATTERN = /^tp-sbx-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,14}$/

function positiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

async function digest(value: unknown) {
  return sandboxIdentifierFingerprint(JSON.stringify(value))
}

function publicReceipt(row: Record<string, unknown>) {
  return {
    id: row.id,
    commandId: row.command_id,
    action: row.action,
    environment: 'sandbox',
    rootClientOrderId: row.root_client_order_id,
    clientOrderId: row.client_order_id,
    symbol: row.symbol,
    side: row.side,
    orderType: row.order_type,
    quantity: Number(row.quantity),
    limitPrice: row.limit_price === null ? null : Number(row.limit_price),
    takeProfitLimitPrice: Number(row.take_profit_limit_price),
    stopLossStopPrice: Number(row.stop_loss_stop_price),
    estimatedNotionalUsd: Number(row.estimated_notional_usd),
    providerStatus: row.provider_status,
    recoveredAfterAmbiguous: row.recovered_after_ambiguous === true,
    providerRecordedAt: row.provider_recorded_at,
    createdAt: row.created_at,
    browserOriginated: false,
    liveOrderRoutingEnabled: false,
  }
}

function adapterInput(
  accountId: string,
  clientOrderId: string,
  source: SandboxOrderRequest | LifecycleRow,
): SandboxOrderInput | null {
  const isLifecycle = 'order_type' in source
  const symbol = source.symbol
  const side = source.side
  const orderType = isLifecycle ? source.order_type : source.orderType
  const quantity = positiveNumber(source.quantity)
  const limitValue = isLifecycle ? source.limit_price : source.limitPrice
  const takeProfitValue = isLifecycle
    ? source.take_profit_limit_price
    : source.takeProfitLimitPrice
  const stopLossValue = isLifecycle
    ? source.stop_loss_stop_price
    : source.stopLossStopPrice
  const limitPrice = limitValue === null || limitValue === undefined ? null : positiveNumber(limitValue)
  const takeProfitLimitPrice = positiveNumber(takeProfitValue)
  const stopLossStopPrice = positiveNumber(stopLossValue)
  if (
    !UUID_PATTERN.test(accountId)
    || !CLIENT_ORDER_PATTERN.test(clientOrderId)
    || typeof symbol !== 'string'
    || !SYMBOL_PATTERN.test(symbol)
    || side !== 'buy'
    || orderType !== 'limit'
    || quantity === null
    || limitPrice === null
    || takeProfitLimitPrice === null
    || stopLossStopPrice === null
    || takeProfitLimitPrice <= limitPrice
    || stopLossStopPrice >= limitPrice
  ) return null
  return {
    accountId,
    clientOrderId,
    symbol,
    side,
    orderType,
    quantity,
    limitPrice,
    takeProfitLimitPrice,
    stopLossStopPrice,
  }
}

Deno.serve(observeEdgeHandler('alpaca-sandbox-order-lifecycle', async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)
  if (!await hasValidInternalSecret(request, 'BROKER_SANDBOX_SYNC_SECRET')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const apiKey = Deno.env.get('ALPACA_BROKER_API_KEY')
  const apiSecret = Deno.env.get('ALPACA_BROKER_API_SECRET')
  if (!supabaseUrl || !serviceRoleKey || !apiKey || !apiSecret) {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  let input: SandboxOrderRequest
  try {
    const payload: unknown = await parseJsonBody(request)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('invalid')
    input = payload as SandboxOrderRequest
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }
  const action = input.action
  const commandId = input.commandId ?? ''
  const userId = input.requestedForUserId ?? ''
  const accountId = input.providerAccountId ?? ''
  if (
    !['submit', 'cancel', 'replace', 'reconcile'].includes(action ?? '')
    || !UUID_PATTERN.test(commandId)
    || !UUID_PATTERN.test(userId)
    || !UUID_PATTERN.test(accountId)
    || (action !== 'submit' && !CLIENT_ORDER_PATTERN.test(input.rootClientOrderId ?? ''))
  ) return jsonResponse({ error: 'Invalid sandbox order request' }, 400)

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const nowIso = new Date().toISOString()
  const [controlResult, executionResult, membershipResult] = await Promise.all([
    admin.from('broker_sandbox_order_controls').select('*, broker_provider_registry!inner(code, live_order_routing_enabled)').eq('control_key', 'alpaca-sandbox-orders').single(),
    admin.from('brokerage_execution_controls').select('execution_enabled').eq('control_key', 'global-live-orders').single(),
    admin.from('controlled_beta_pilot_memberships').select('status, consented_at, cohort_code, controlled_beta_pilot_cohorts!inner(status, starts_at, ends_at)').eq('user_id', userId).maybeSingle(),
  ])
  if (controlResult.error || executionResult.error || membershipResult.error) {
    return jsonResponse({ error: 'Unable to verify sandbox order controls' }, 500)
  }
  const control = controlResult.data
  const provider = Array.isArray(control?.broker_provider_registry)
    ? control.broker_provider_registry[0]
    : control?.broker_provider_registry
  const membership = membershipResult.data
  const cohort = Array.isArray(membership?.controlled_beta_pilot_cohorts)
    ? membership.controlled_beta_pilot_cohorts[0]
    : membership?.controlled_beta_pilot_cohorts
  if (
    control?.environment !== 'sandbox'
    || control?.api_origin !== ALPACA_SANDBOX_ORDER_ORIGIN
    || control?.internal_submission_enabled !== true
    || control?.browser_submission_enabled !== false
    || control?.live_order_routing_enabled !== false
    || control?.protective_orders_required !== true
    || provider?.code !== 'alpaca-broker-sandbox'
    || provider?.live_order_routing_enabled !== false
    || executionResult.data?.execution_enabled !== false
  ) return jsonResponse({ error: 'Sandbox order controls are locked' }, 409)
  if (
    membership?.status !== 'active'
    || !membership.consented_at
    || cohort?.status !== 'active'
    || cohort.starts_at > nowIso
    || cohort.ends_at < nowIso
  ) return jsonResponse({ error: 'Active approved-pilot membership is required' }, 403)

  const accountFingerprint = await sandboxIdentifierFingerprint(accountId)
  let current: LifecycleRow | null = null
  if (action !== 'submit') {
    const { data, error } = await admin
      .from('broker_sandbox_order_receipts')
      .select('root_client_order_id, client_order_id, account_fingerprint, symbol, side, order_type, quantity, limit_price, take_profit_limit_price, stop_loss_stop_price, estimated_notional_usd')
      .eq('user_id', userId)
      .eq('root_client_order_id', input.rootClientOrderId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return jsonResponse({ error: 'Unable to load the sandbox order lifecycle' }, 500)
    current = data as LifecycleRow | null
    if (!current || current.account_fingerprint !== accountFingerprint) {
      return jsonResponse({ error: 'Sandbox order lifecycle was not found' }, 404)
    }
  }

  const nextClientOrderId = `tp-sbx-${commandId}`
  const orderInput = action === 'submit' || action === 'replace'
    ? adapterInput(accountId, nextClientOrderId, input)
    : current ? adapterInput(accountId, current.client_order_id, current) : null
  if (!orderInput) return jsonResponse({ error: 'Invalid protected sandbox order details' }, 400)
  if (action === 'replace' && (
    orderInput.symbol !== current!.symbol
    || orderInput.side !== current!.side
    || orderInput.orderType !== current!.order_type
    || orderInput.takeProfitLimitPrice !== Number(current!.take_profit_limit_price)
    || orderInput.stopLossStopPrice !== Number(current!.stop_loss_stop_price)
  )) return jsonResponse({ error: 'Replacement must preserve the protected order identity and legs' }, 409)

  const estimatePrice = Math.max(orderInput.limitPrice ?? 0, orderInput.takeProfitLimitPrice)
  const estimatedNotionalUsd = Math.round(orderInput.quantity * estimatePrice * 100) / 100
  if (
    orderInput.quantity > Number(control.max_quantity)
    || estimatedNotionalUsd > Number(control.max_order_notional_usd)
  ) return jsonResponse({ error: 'Sandbox order exceeds the protective control envelope' }, 409)

  const normalizedRequest = {
    action,
    commandId,
    requestedForUserId: userId,
    accountFingerprint,
    rootClientOrderId: action === 'submit' ? nextClientOrderId : current!.root_client_order_id,
    priorClientOrderId: action === 'submit' ? null : current!.client_order_id,
    clientOrderId: action === 'replace' || action === 'submit' ? nextClientOrderId : current!.client_order_id,
    symbol: orderInput.symbol,
    side: 'buy',
    orderType: orderInput.orderType,
    quantity: orderInput.quantity,
    limitPrice: orderInput.limitPrice,
    takeProfitLimitPrice: orderInput.takeProfitLimitPrice,
    stopLossStopPrice: orderInput.stopLossStopPrice,
  }
  const requestDigest = await digest(normalizedRequest)
  const { data: existing, error: existingError } = await admin
    .from('broker_sandbox_order_receipts')
    .select('*')
    .eq('user_id', userId)
    .eq('command_id', commandId)
    .maybeSingle()
  if (existingError) return jsonResponse({ error: 'Unable to verify sandbox order idempotency' }, 500)
  if (existing) {
    if (existing.request_digest !== requestDigest) {
      return jsonResponse({ error: 'Sandbox order idempotency key was reused' }, 409)
    }
    return jsonResponse(
      { receipt: publicReceipt(existing), idempotent: true },
      existing.provider_status === 'ambiguous' ? 502 : 200,
    )
  }

  let adapter: ReturnType<typeof createAlpacaSandboxOrderAdapter>
  try {
    adapter = createAlpacaSandboxOrderAdapter({ apiKey, apiSecret })
  } catch {
    return jsonResponse({ error: 'Broker sandbox configuration is invalid' }, 500)
  }
  let providerResult: SandboxOrderResult
  try {
    if (action === 'submit') providerResult = await adapter.submit(orderInput)
    else if (action === 'cancel') {
      if (control.cancel_enabled !== true) return jsonResponse({ error: 'Sandbox cancellation is disabled' }, 409)
      providerResult = await adapter.cancel(accountId, current!.client_order_id)
    } else if (action === 'replace') {
      if (control.replace_enabled !== true) return jsonResponse({ error: 'Sandbox replacement is disabled' }, 409)
      providerResult = await adapter.replace(accountId, current!.client_order_id, orderInput)
    } else {
      if (control.reconciliation_enabled !== true) return jsonResponse({ error: 'Sandbox reconciliation is disabled' }, 409)
      providerResult = await adapter.reconcile(accountId, current!.client_order_id)
    }
  } catch (error) {
    const safeError = error instanceof SandboxOrderError
      ? error
      : new SandboxOrderError('PROVIDER_UNAVAILABLE', null, 0)
    if (safeError.code !== 'AMBIGUOUS_PROVIDER_RESULT') {
      const status = safeError.code === 'ORDER_NOT_FOUND' ? 404
        : safeError.code === 'REQUEST_INVALID' ? 400
        : safeError.code === 'RATE_LIMITED' ? 429
        : 502
      return jsonResponse({ error: 'Broker sandbox action was not confirmed', code: safeError.code }, status)
    }
    providerResult = {
      provider: 'alpaca',
      environment: 'sandbox',
      adapterVersion: 'alpaca-sandbox-orders-v1',
      clientOrderId: normalizedRequest.clientOrderId,
      providerStatus: 'ambiguous',
      httpStatus: safeError.httpStatus ?? 502,
      latencyMs: safeError.latencyMs,
      accountFingerprint,
      providerOrderFingerprint: '',
      payloadDigest: await digest({ code: safeError.code, requestDigest }),
      providerRecordedAt: null,
      recoveredAfterAmbiguous: false,
      liveOrderRoutingEnabled: false,
      browserOriginated: false,
    }
  }

  const receiptPayload = {
    ...normalizedRequest,
    orderClass: 'bracket',
    estimatedNotionalUsd,
    providerStatus: providerResult.providerStatus,
    httpStatus: providerResult.httpStatus,
    latencyMs: providerResult.latencyMs,
    recoveredAfterAmbiguous: providerResult.recoveredAfterAmbiguous,
    providerRecordedAt: providerResult.providerRecordedAt,
    accountFingerprint: providerResult.accountFingerprint,
    providerOrderFingerprint: providerResult.providerOrderFingerprint,
    payloadDigest: providerResult.payloadDigest,
    requestDigest,
  }
  const { data: persisted, error: persistError } = await admin.rpc(
    'persist_broker_sandbox_order_receipt',
    { p_user_id: userId, p_receipt: receiptPayload },
  )
  if (persistError || !persisted?.receipt) {
    return jsonResponse({ error: 'Unable to record the sandbox order trust receipt' }, 500)
  }
  const ambiguous = providerResult.providerStatus === 'ambiguous'
  return jsonResponse(
    { receipt: publicReceipt(persisted.receipt), idempotent: persisted.idempotent === true },
    ambiguous ? 502 : 200,
  )
}))
