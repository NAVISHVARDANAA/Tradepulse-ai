export const ALPACA_SANDBOX_ORDER_ORIGIN = 'https://broker-api.sandbox.alpaca.markets'
export const ALPACA_SANDBOX_ORDER_ADAPTER_VERSION = 'alpaca-sandbox-orders-v1'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CLIENT_ORDER_PATTERN = /^tp-sbx-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SYMBOL_PATTERN = /^[A-Z][A-Z0-9.-]{0,14}$/
const MAX_ATTEMPTS = 2
const DEFAULT_TIMEOUT_MS = 5_000

const PROVIDER_STATUSES = new Set([
  'accepted',
  'new',
  'partially_filled',
  'filled',
  'done_for_day',
  'canceled',
  'expired',
  'replaced',
  'pending_cancel',
  'pending_replace',
  'rejected',
  'stopped',
  'suspended',
  'calculated',
])

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type Sleep = (milliseconds: number) => Promise<void>
type Capability = 'submit' | 'lookup' | 'order'

export type SandboxOrderErrorCode =
  | 'CONFIGURATION_INVALID'
  | 'SANDBOX_ROUTE_REJECTED'
  | 'REQUEST_INVALID'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_REJECTED'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'REQUEST_TIMEOUT'
  | 'AMBIGUOUS_PROVIDER_RESULT'
  | 'ORDER_NOT_FOUND'

export class SandboxOrderError extends Error {
  constructor(
    public readonly code: SandboxOrderErrorCode,
    public readonly httpStatus: number | null,
    public readonly latencyMs: number,
  ) {
    super('The broker sandbox order action could not be confirmed.')
    this.name = 'SandboxOrderError'
  }
}

export type SandboxOrderInput = {
  accountId: string
  clientOrderId: string
  symbol: string
  side: 'buy' | 'sell'
  orderType: 'limit'
  quantity: number
  limitPrice: number | null
  takeProfitLimitPrice: number
  stopLossStopPrice: number
}

export type SandboxOrderResult = {
  provider: 'alpaca'
  environment: 'sandbox'
  adapterVersion: typeof ALPACA_SANDBOX_ORDER_ADAPTER_VERSION
  clientOrderId: string
  providerStatus: string
  httpStatus: number
  latencyMs: number
  accountFingerprint: string
  providerOrderFingerprint: string
  payloadDigest: string
  providerRecordedAt: string | null
  recoveredAfterAmbiguous: boolean
  liveOrderRoutingEnabled: false
  browserOriginated: false
}

type AdapterOptions = {
  apiKey: string
  apiSecret: string
  fetcher?: Fetcher
  sleep?: Sleep
  timeoutMs?: number
}

type ProviderOrder = {
  id: string
  clientOrderId: string
  status: string
  providerRecordedAt: string | null
  raw: Record<string, unknown>
}

function validCredential(value: string, allowColon: boolean) {
  return value.length >= 8
    && value.length <= 512
    && /^[\x21-\x7e]+$/.test(value)
    && (allowColon || !value.includes(':'))
}

function elapsed(startedAt: number) {
  return Math.max(0, Math.min(15_000, Math.round(performance.now() - startedAt)))
}

function positive(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function validateInput(input: SandboxOrderInput) {
  if (
    !UUID_PATTERN.test(input.accountId)
    || !CLIENT_ORDER_PATTERN.test(input.clientOrderId)
    || !SYMBOL_PATTERN.test(input.symbol)
    || input.side !== 'buy'
    || input.orderType !== 'limit'
    || !positive(input.quantity)
    || input.quantity > 1_000
    || !positive(input.limitPrice)
    || !positive(input.takeProfitLimitPrice)
    || !positive(input.stopLossStopPrice)
    || input.takeProfitLimitPrice <= Number(input.limitPrice)
    || input.stopLossStopPrice >= Number(input.limitPrice)
  ) {
    throw new SandboxOrderError('REQUEST_INVALID', null, 0)
  }
}

export function assertAlpacaSandboxOrderUrl(
  value: string,
  capability: Capability,
  accountId: string,
  orderId?: string,
  clientOrderId?: string,
) {
  if (!UUID_PATTERN.test(accountId)) {
    throw new SandboxOrderError('SANDBOX_ROUTE_REJECTED', null, 0)
  }
  const url = new URL(value)
  const basePath = `/v1/trading/accounts/${accountId}/orders`
  const expectedPath = capability === 'order' ? `${basePath}/${orderId ?? ''}`
    : capability === 'lookup' ? `${basePath}:by_client_order_id`
    : basePath
  const expectedSearch = capability === 'lookup'
    ? `?client_order_id=${encodeURIComponent(clientOrderId ?? '')}`
    : ''

  if (
    url.origin !== ALPACA_SANDBOX_ORDER_ORIGIN
    || url.protocol !== 'https:'
    || url.username
    || url.password
    || url.pathname !== expectedPath
    || url.search !== expectedSearch
    || url.hash
    || (capability === 'order' && !UUID_PATTERN.test(orderId ?? ''))
    || (capability === 'lookup' && !CLIENT_ORDER_PATTERN.test(clientOrderId ?? ''))
  ) {
    throw new SandboxOrderError('SANDBOX_ROUTE_REJECTED', null, 0)
  }
  return url
}

export async function sandboxIdentifierFingerprint(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

async function digestPayload(value: unknown) {
  return sandboxIdentifierFingerprint(JSON.stringify(value))
}

function providerError(status: number): SandboxOrderErrorCode {
  if (status === 401 || status === 403) return 'AUTHENTICATION_FAILED'
  if (status === 404) return 'ORDER_NOT_FOUND'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'PROVIDER_UNAVAILABLE'
  return 'PROVIDER_REJECTED'
}

function parseProviderOrder(value: unknown, expectedClientOrderId?: string): ProviderOrder {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SandboxOrderError('PROVIDER_RESPONSE_INVALID', null, 0)
  }
  const payload = value as Record<string, unknown>
  const id = typeof payload.id === 'string' ? payload.id : ''
  const clientOrderId = typeof payload.client_order_id === 'string' ? payload.client_order_id : ''
  const status = typeof payload.status === 'string' ? payload.status : ''
  const recorded = typeof payload.updated_at === 'string'
    ? payload.updated_at
    : typeof payload.submitted_at === 'string' ? payload.submitted_at : null
  if (
    !UUID_PATTERN.test(id)
    || !CLIENT_ORDER_PATTERN.test(clientOrderId)
    || (expectedClientOrderId && clientOrderId !== expectedClientOrderId)
    || !PROVIDER_STATUSES.has(status)
    || (recorded !== null && Number.isNaN(Date.parse(recorded)))
  ) {
    throw new SandboxOrderError('PROVIDER_RESPONSE_INVALID', null, 0)
  }
  return { id, clientOrderId, status, providerRecordedAt: recorded, raw: payload }
}

export function createAlpacaSandboxOrderAdapter(options: AdapterOptions) {
  if (!validCredential(options.apiKey, false) || !validCredential(options.apiSecret, true)) {
    throw new SandboxOrderError('CONFIGURATION_INVALID', null, 0)
  }
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 15_000) {
    throw new SandboxOrderError('CONFIGURATION_INVALID', null, 0)
  }
  const fetcher = options.fetcher ?? fetch
  const sleep = options.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)))
  const authorization = `Basic ${btoa(`${options.apiKey}:${options.apiSecret}`)}`

  async function send(url: URL, init: RequestInit, retrySafe: boolean) {
    const startedAt = performance.now()
    const attempts = retrySafe ? MAX_ATTEMPTS : 1
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetcher(url, {
          ...init,
          headers: {
            Accept: 'application/json',
            Authorization: authorization,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          },
          redirect: 'error',
          signal: controller.signal,
        })
        clearTimeout(timeout)
        if (!response.ok) {
          const retryable = retrySafe && (response.status === 429 || response.status >= 500)
          if (retryable && attempt < attempts) {
            await sleep(50)
            continue
          }
          throw new SandboxOrderError(providerError(response.status), response.status, elapsed(startedAt))
        }
        return { response, latencyMs: elapsed(startedAt) }
      } catch (error) {
        clearTimeout(timeout)
        if (error instanceof SandboxOrderError) throw error
        if (retrySafe && attempt < attempts) {
          await sleep(50)
          continue
        }
        const timedOut = error instanceof DOMException && error.name === 'AbortError'
        throw new SandboxOrderError(
          retrySafe ? (timedOut ? 'REQUEST_TIMEOUT' : 'PROVIDER_UNAVAILABLE') : 'AMBIGUOUS_PROVIDER_RESULT',
          null,
          elapsed(startedAt),
        )
      }
    }
    throw new SandboxOrderError('PROVIDER_UNAVAILABLE', null, elapsed(startedAt))
  }

  async function readRaw(accountId: string, clientOrderId: string) {
    const url = assertAlpacaSandboxOrderUrl(
      `${ALPACA_SANDBOX_ORDER_ORIGIN}/v1/trading/accounts/${accountId}/orders:by_client_order_id?client_order_id=${encodeURIComponent(clientOrderId)}`,
      'lookup',
      accountId,
      undefined,
      clientOrderId,
    )
    const { response, latencyMs } = await send(url, { method: 'GET' }, true)
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new SandboxOrderError('PROVIDER_RESPONSE_INVALID', response.status, latencyMs)
    }
    return { order: parseProviderOrder(payload, clientOrderId), httpStatus: response.status, latencyMs }
  }

  async function sanitize(
    accountId: string,
    order: ProviderOrder,
    httpStatus: number,
    latencyMs: number,
    recoveredAfterAmbiguous = false,
  ): Promise<SandboxOrderResult> {
    return {
      provider: 'alpaca',
      environment: 'sandbox',
      adapterVersion: ALPACA_SANDBOX_ORDER_ADAPTER_VERSION,
      clientOrderId: order.clientOrderId,
      providerStatus: order.status,
      httpStatus,
      latencyMs,
      accountFingerprint: await sandboxIdentifierFingerprint(accountId),
      providerOrderFingerprint: await sandboxIdentifierFingerprint(order.id),
      payloadDigest: await digestPayload(order.raw),
      providerRecordedAt: order.providerRecordedAt,
      recoveredAfterAmbiguous,
      liveOrderRoutingEnabled: false,
      browserOriginated: false,
    }
  }

  return {
    async submit(input: SandboxOrderInput) {
      validateInput(input)
      const url = assertAlpacaSandboxOrderUrl(
        `${ALPACA_SANDBOX_ORDER_ORIGIN}/v1/trading/accounts/${input.accountId}/orders`,
        'submit',
        input.accountId,
      )
      const body = {
        symbol: input.symbol,
        qty: String(input.quantity),
        side: input.side,
        type: input.orderType,
        time_in_force: 'day',
        client_order_id: input.clientOrderId,
        order_class: 'bracket',
        take_profit: { limit_price: String(input.takeProfitLimitPrice) },
        stop_loss: { stop_price: String(input.stopLossStopPrice) },
        limit_price: String(input.limitPrice),
      }
      try {
        const { response, latencyMs } = await send(
          url,
          { method: 'POST', body: JSON.stringify(body) },
          false,
        )
        const payload = await response.json().catch(() => null)
        return sanitize(
          input.accountId,
          parseProviderOrder(payload, input.clientOrderId),
          response.status,
          latencyMs,
        )
      } catch (error) {
        const recoverable = error instanceof SandboxOrderError && (
          error.code === 'AMBIGUOUS_PROVIDER_RESULT'
          || (error.code === 'PROVIDER_REJECTED' && error.httpStatus === 422)
        )
        if (!recoverable) throw error
        try {
          const recovered = await readRaw(input.accountId, input.clientOrderId)
          return sanitize(
            input.accountId,
            recovered.order,
            recovered.httpStatus,
            error.latencyMs + recovered.latencyMs,
            error.code === 'AMBIGUOUS_PROVIDER_RESULT',
          )
        } catch {
          throw error
        }
      }
    },

    async reconcile(accountId: string, clientOrderId: string) {
      const result = await readRaw(accountId, clientOrderId)
      return sanitize(accountId, result.order, result.httpStatus, result.latencyMs)
    },

    async cancel(accountId: string, clientOrderId: string) {
      const current = await readRaw(accountId, clientOrderId)
      const url = assertAlpacaSandboxOrderUrl(
        `${ALPACA_SANDBOX_ORDER_ORIGIN}/v1/trading/accounts/${accountId}/orders/${current.order.id}`,
        'order',
        accountId,
        current.order.id,
      )
      const { response, latencyMs } = await send(url, { method: 'DELETE' }, false)
      const pending = { ...current.order, status: 'pending_cancel', raw: { status: 'pending_cancel' } }
      return sanitize(accountId, pending, response.status, current.latencyMs + latencyMs)
    },

    async replace(
      accountId: string,
      currentClientOrderId: string,
      replacement: SandboxOrderInput,
    ) {
      validateInput(replacement)
      if (replacement.accountId !== accountId) {
        throw new SandboxOrderError('REQUEST_INVALID', null, 0)
      }
      const current = await readRaw(accountId, currentClientOrderId)
      const url = assertAlpacaSandboxOrderUrl(
        `${ALPACA_SANDBOX_ORDER_ORIGIN}/v1/trading/accounts/${accountId}/orders/${current.order.id}`,
        'order',
        accountId,
        current.order.id,
      )
      const body = {
        qty: String(replacement.quantity),
        time_in_force: 'day',
        client_order_id: replacement.clientOrderId,
        limit_price: String(replacement.limitPrice),
      }
      const { response, latencyMs } = await send(
        url,
        { method: 'PATCH', body: JSON.stringify(body) },
        false,
      )
      const payload = await response.json().catch(() => null)
      return sanitize(
        accountId,
        parseProviderOrder(payload, replacement.clientOrderId),
        response.status,
        current.latencyMs + latencyMs,
      )
    },
  }
}
