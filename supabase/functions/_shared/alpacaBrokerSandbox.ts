export const ALPACA_BROKER_SANDBOX_ORIGIN =
  'https://broker-api.sandbox.alpaca.markets'
export const ALPACA_BROKER_ADAPTER_VERSION = 'alpaca-broker-sandbox-v1'
export const ALPACA_BROKER_ACCOUNT_INVENTORY_VERSION =
  'alpaca-broker-account-inventory-v1'

const PROBE_PATH = '/v1/assets/AAPL'
const ACCOUNT_INVENTORY_PATH = '/v1/accounts'
const ACCOUNT_INVENTORY_SEARCH = '?entities=trading_configurations'
const MAX_ATTEMPTS = 2
const DEFAULT_TIMEOUT_MS = 3_000
const MAX_RETRY_DELAY_MS = 250

const ACCOUNT_STATUSES = [
  'INACTIVE',
  'ONBOARDING',
  'SUBMITTED',
  'SUBMISSION_FAILED',
  'ACTION_REQUIRED',
  'APPROVAL_PENDING',
  'APPROVED',
  'REJECTED',
  'ACTIVE',
  'ACCOUNT_UPDATED',
  'ACCOUNT_CLOSED',
] as const

type AccountStatus = typeof ACCOUNT_STATUSES[number]
type ReadCapability = 'asset_read' | 'account_inventory_read'

export type BrokerSandboxErrorCode =
  | 'CONFIGURATION_INVALID'
  | 'SANDBOX_ROUTE_REJECTED'
  | 'AUTHENTICATION_FAILED'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_RESPONSE_INVALID'
  | 'REQUEST_TIMEOUT'

export class BrokerSandboxError extends Error {
  constructor(
    public readonly code: BrokerSandboxErrorCode,
    public readonly httpStatus: number | null,
    public readonly attemptCount: number,
    public readonly latencyMs: number,
  ) {
    super('The broker sandbox capability probe failed.')
    this.name = 'BrokerSandboxError'
  }
}

export type BrokerSandboxProbe = {
  provider: 'alpaca'
  environment: 'sandbox'
  adapterVersion: typeof ALPACA_BROKER_ADAPTER_VERSION
  apiOrigin: typeof ALPACA_BROKER_SANDBOX_ORIGIN
  probeKind: 'asset_read'
  status: 'passed'
  httpStatus: 200
  latencyMs: number
  attemptCount: number
  capability: {
    assetRead: true
    ordersRead: false
    ordersWrite: false
    accountsRead: false
  }
}

export type BrokerSandboxAccountInventory = {
  provider: 'alpaca'
  environment: 'sandbox'
  adapterVersion: typeof ALPACA_BROKER_ACCOUNT_INVENTORY_VERSION
  apiOrigin: typeof ALPACA_BROKER_SANDBOX_ORIGIN
  inventoryKind: 'account_status_summary'
  status: 'passed'
  httpStatus: 200
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
  snapshotDigest: string
  pageLimitReached: boolean
  capability: {
    assetRead: true
    accountsRead: true
    ordersRead: false
    ordersWrite: false
  }
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
type Sleep = (milliseconds: number) => Promise<void>

type AdapterOptions = {
  apiKey: string
  apiSecret: string
  fetcher?: Fetcher
  sleep?: Sleep
  timeoutMs?: number
}

function integerMilliseconds(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt))
}

function validCredential(value: string, allowColon: boolean) {
  return (
    value.length >= 8 &&
    value.length <= 512 &&
    /^[\x21-\x7e]+$/.test(value) &&
    (allowColon || !value.includes(':'))
  )
}

export function assertAlpacaBrokerSandboxUrl(
  value: string,
  capability: ReadCapability = 'asset_read',
) {
  const url = new URL(value)
  const expectedPath = capability === 'asset_read'
    ? PROBE_PATH
    : ACCOUNT_INVENTORY_PATH
  const expectedSearch = capability === 'asset_read'
    ? ''
    : ACCOUNT_INVENTORY_SEARCH

  if (
    url.origin !== ALPACA_BROKER_SANDBOX_ORIGIN ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== expectedPath ||
    url.search !== expectedSearch ||
    url.hash
  ) {
    throw new BrokerSandboxError(
      'SANDBOX_ROUTE_REJECTED',
      null,
      0,
      0,
    )
  }

  return url
}

function retryDelay(response: Response) {
  const retryAfter = response.headers.get('retry-after')
  const seconds = retryAfter ? Number(retryAfter) : Number.NaN

  if (!Number.isFinite(seconds) || seconds < 0) return 50
  return Math.min(MAX_RETRY_DELAY_MS, Math.round(seconds * 1_000))
}

function providerErrorCode(status: number): BrokerSandboxErrorCode {
  if (status === 401 || status === 403) return 'AUTHENTICATION_FAILED'
  if (status === 429) return 'RATE_LIMITED'
  if (status >= 500) return 'PROVIDER_UNAVAILABLE'
  return 'PROVIDER_RESPONSE_INVALID'
}

function validProbePayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const payload = value as Record<string, unknown>
  return payload.symbol === 'AAPL' && ['active', 'inactive'].includes(String(payload.status))
}

type AccountInventoryItem = {
  id: string
  status: AccountStatus
  currency: string
  accountBlocked: boolean
  tradingBlocked: boolean
  transfersBlocked: boolean
}

function accountInventoryPayload(value: unknown): AccountInventoryItem[] | null {
  if (!Array.isArray(value) || value.length > 1_000) return null

  const statuses = new Set<string>(ACCOUNT_STATUSES)
  const identifiers = new Set<string>()
  const accounts: AccountInventoryItem[] = []

  for (const item of value) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const account = item as Record<string, unknown>
    const id = typeof account.id === 'string' ? account.id : ''
    const status = typeof account.status === 'string' ? account.status : ''
    const currency = typeof account.currency === 'string' ? account.currency : ''

    if (
      !/^[0-9a-f-]{16,64}$/i.test(id) ||
      identifiers.has(id) ||
      !statuses.has(status) ||
      !/^[A-Z]{3}$/.test(currency)
    ) return null

    for (const key of ['account_blocked', 'trading_blocked', 'transfers_blocked']) {
      if (account[key] !== undefined && typeof account[key] !== 'boolean') return null
    }

    identifiers.add(id)
    accounts.push({
      id,
      status: status as AccountStatus,
      currency,
      accountBlocked: account.account_blocked === true,
      tradingBlocked: account.trading_blocked === true,
      transfersBlocked: account.transfers_blocked === true,
    })
  }

  return accounts
}

function accountStatusBucket(status: AccountStatus) {
  if (status === 'ACTIVE' || status === 'APPROVED') return 'active'
  if (
    status === 'INACTIVE' ||
    status === 'ONBOARDING' ||
    status === 'SUBMITTED' ||
    status === 'APPROVAL_PENDING' ||
    status === 'ACCOUNT_UPDATED'
  ) return 'pending'
  if (status === 'ACTION_REQUIRED' || status === 'SUBMISSION_FAILED') {
    return 'action_required'
  }
  if (status === 'REJECTED') return 'rejected'
  return 'closed'
}

async function digestInventory(accounts: AccountInventoryItem[]) {
  const normalized = accounts
    .map((account) => [
      account.id,
      account.status,
      account.currency,
      account.accountBlocked ? '1' : '0',
      account.tradingBlocked ? '1' : '0',
      account.transfersBlocked ? '1' : '0',
    ].join('|'))
    .sort()
    .join('\n')
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized),
  )
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function createAlpacaBrokerSandboxAdapter(options: AdapterOptions) {
  if (
    !validCredential(options.apiKey, false) ||
    !validCredential(options.apiSecret, true)
  ) {
    throw new BrokerSandboxError('CONFIGURATION_INVALID', null, 0, 0)
  }

  const fetcher = options.fetcher ?? fetch
  const sleep = options.sleep ?? ((milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)))
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  if (!Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 10_000) {
    throw new BrokerSandboxError('CONFIGURATION_INVALID', null, 0, 0)
  }

  const authorization = `Basic ${btoa(`${options.apiKey}:${options.apiSecret}`)}`

  async function requestJson(
    capability: ReadCapability,
    validate: (value: unknown) => boolean,
  ) {
    const path = capability === 'asset_read'
      ? PROBE_PATH
      : `${ACCOUNT_INVENTORY_PATH}${ACCOUNT_INVENTORY_SEARCH}`
    const url = assertAlpacaBrokerSandboxUrl(
      `${ALPACA_BROKER_SANDBOX_ORIGIN}${path}`,
      capability,
    )
    const startedAt = performance.now()

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), timeoutMs)
      let response: Response

      try {
        response = await fetcher(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: authorization,
          },
          redirect: 'error',
          signal: controller.signal,
        })
      } catch (error) {
        clearTimeout(timeout)

        if (attempt < MAX_ATTEMPTS) {
          await sleep(50)
          continue
        }

        throw new BrokerSandboxError(
          error instanceof DOMException && error.name === 'AbortError'
            ? 'REQUEST_TIMEOUT'
            : 'PROVIDER_UNAVAILABLE',
          null,
          attempt,
          integerMilliseconds(startedAt),
        )
      }

      if (!response.ok) {
        clearTimeout(timeout)
        const retryable = response.status === 429 || response.status >= 500
        if (retryable && attempt < MAX_ATTEMPTS) {
          await sleep(retryDelay(response))
          continue
        }

        throw new BrokerSandboxError(
          providerErrorCode(response.status),
          response.status,
          attempt,
          integerMilliseconds(startedAt),
        )
      }

      let payload: unknown
      try {
        payload = await response.json()
      } catch (error) {
        clearTimeout(timeout)
        throw new BrokerSandboxError(
          error instanceof DOMException && error.name === 'AbortError'
            ? 'REQUEST_TIMEOUT'
            : 'PROVIDER_RESPONSE_INVALID',
          response.status,
          attempt,
          integerMilliseconds(startedAt),
        )
      }

      clearTimeout(timeout)

      if (!validate(payload)) {
        throw new BrokerSandboxError(
          'PROVIDER_RESPONSE_INVALID',
          response.status,
          attempt,
          integerMilliseconds(startedAt),
        )
      }

      return {
        payload,
        httpStatus: 200 as const,
        latencyMs: integerMilliseconds(startedAt),
        attemptCount: attempt,
      }
    }

    throw new BrokerSandboxError('PROVIDER_UNAVAILABLE', null, 0, 0)
  }

  return {
    async probe(): Promise<BrokerSandboxProbe> {
      const result = await requestJson('asset_read', validProbePayload)

      return {
        provider: 'alpaca',
        environment: 'sandbox',
        adapterVersion: ALPACA_BROKER_ADAPTER_VERSION,
        apiOrigin: ALPACA_BROKER_SANDBOX_ORIGIN,
        probeKind: 'asset_read',
        status: 'passed',
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        attemptCount: result.attemptCount,
        capability: {
          assetRead: true,
          ordersRead: false,
          ordersWrite: false,
          accountsRead: false,
        },
      }
    },

    async readAccountInventory(): Promise<BrokerSandboxAccountInventory> {
      const result = await requestJson(
        'account_inventory_read',
        (payload) => accountInventoryPayload(payload) !== null,
      )
      const accounts = accountInventoryPayload(result.payload)
      if (!accounts) {
        throw new BrokerSandboxError(
          'PROVIDER_RESPONSE_INVALID',
          result.httpStatus,
          result.attemptCount,
          result.latencyMs,
        )
      }

      const counts = {
        active: 0,
        pending: 0,
        action_required: 0,
        rejected: 0,
        closed: 0,
      }
      let restrictedAccounts = 0

      for (const account of accounts) {
        counts[accountStatusBucket(account.status)] += 1
        if (
          account.accountBlocked ||
          account.tradingBlocked ||
          account.transfersBlocked
        ) restrictedAccounts += 1
      }

      return {
        provider: 'alpaca',
        environment: 'sandbox',
        adapterVersion: ALPACA_BROKER_ACCOUNT_INVENTORY_VERSION,
        apiOrigin: ALPACA_BROKER_SANDBOX_ORIGIN,
        inventoryKind: 'account_status_summary',
        status: 'passed',
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        attemptCount: result.attemptCount,
        totalAccounts: accounts.length,
        activeAccounts: counts.active,
        pendingAccounts: counts.pending,
        actionRequiredAccounts: counts.action_required,
        rejectedAccounts: counts.rejected,
        closedAccounts: counts.closed,
        restrictedAccounts,
        currencies: [...new Set(accounts.map((account) => account.currency))].sort(),
        snapshotDigest: await digestInventory(accounts),
        pageLimitReached: accounts.length === 1_000,
        capability: {
          assetRead: true,
          accountsRead: true,
          ordersRead: false,
          ordersWrite: false,
        },
      }
    },
  }
}
