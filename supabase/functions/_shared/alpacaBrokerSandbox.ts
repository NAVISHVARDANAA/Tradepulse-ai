export const ALPACA_BROKER_SANDBOX_ORIGIN =
  'https://broker-api.sandbox.alpaca.markets'
export const ALPACA_BROKER_ADAPTER_VERSION = 'alpaca-broker-sandbox-v1'

const PROBE_PATH = '/v1/assets/AAPL'
const MAX_ATTEMPTS = 2
const DEFAULT_TIMEOUT_MS = 3_000
const MAX_RETRY_DELAY_MS = 250

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

export function assertAlpacaBrokerSandboxUrl(value: string) {
  const url = new URL(value)

  if (
    url.origin !== ALPACA_BROKER_SANDBOX_ORIGIN ||
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.pathname !== PROBE_PATH ||
    url.search ||
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

  const url = assertAlpacaBrokerSandboxUrl(
    `${ALPACA_BROKER_SANDBOX_ORIGIN}${PROBE_PATH}`,
  )
  const authorization = `Basic ${btoa(`${options.apiKey}:${options.apiSecret}`)}`

  return {
    async probe(): Promise<BrokerSandboxProbe> {
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

        if (!validProbePayload(payload)) {
          throw new BrokerSandboxError(
            'PROVIDER_RESPONSE_INVALID',
            response.status,
            attempt,
            integerMilliseconds(startedAt),
          )
        }

        return {
          provider: 'alpaca',
          environment: 'sandbox',
          adapterVersion: ALPACA_BROKER_ADAPTER_VERSION,
          apiOrigin: ALPACA_BROKER_SANDBOX_ORIGIN,
          probeKind: 'asset_read',
          status: 'passed',
          httpStatus: 200,
          latencyMs: integerMilliseconds(startedAt),
          attemptCount: attempt,
          capability: {
            assetRead: true,
            ordersRead: false,
            ordersWrite: false,
            accountsRead: false,
          },
        }
      }

      throw new BrokerSandboxError('PROVIDER_UNAVAILABLE', null, 0, 0)
    },
  }
}
