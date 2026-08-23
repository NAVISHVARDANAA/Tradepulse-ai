import {
  assertEquals,
  assertRejects,
  assertThrows,
} from 'jsr:@std/assert@1'

import {
  ALPACA_BROKER_SANDBOX_ORIGIN,
  BrokerSandboxError,
  assertAlpacaBrokerSandboxUrl,
  createAlpacaBrokerSandboxAdapter,
} from './alpacaBrokerSandbox.ts'

const credentials = {
  apiKey: 'sandbox-key-123',
  apiSecret: 'sandbox-secret-456',
}

Deno.test('the route lock accepts only the fixed read-only sandbox probe', () => {
  assertEquals(
    assertAlpacaBrokerSandboxUrl(
      `${ALPACA_BROKER_SANDBOX_ORIGIN}/v1/assets/AAPL`,
    ).href,
    `${ALPACA_BROKER_SANDBOX_ORIGIN}/v1/assets/AAPL`,
  )

  for (const rejected of [
    'https://broker-api.alpaca.markets/v1/assets/AAPL',
    'https://paper-api.alpaca.markets/v2/assets/AAPL',
    `${ALPACA_BROKER_SANDBOX_ORIGIN}/v1/accounts`,
    `${ALPACA_BROKER_SANDBOX_ORIGIN}/v1/trading/accounts/test/orders`,
    `${ALPACA_BROKER_SANDBOX_ORIGIN}/v1/assets/AAPL?status=active`,
  ]) {
    const error = assertThrows(
      () => assertAlpacaBrokerSandboxUrl(rejected),
      BrokerSandboxError,
    )
    assertEquals((error as BrokerSandboxError).code, 'SANDBOX_ROUTE_REJECTED')
  }
})

Deno.test('the adapter sends Basic auth server-side and returns a sanitized capability', async () => {
  let capturedUrl = ''
  let capturedMethod = ''
  let capturedAuthorization = ''
  const adapter = createAlpacaBrokerSandboxAdapter({
    ...credentials,
    fetcher: (input, init) => {
      capturedUrl = String(input)
      capturedMethod = init?.method ?? ''
      capturedAuthorization = new Headers(init?.headers).get('authorization') ?? ''
      return Promise.resolve(Response.json({ symbol: 'AAPL', status: 'active' }))
    },
  })

  const result = await adapter.probe()

  assertEquals(capturedUrl, `${ALPACA_BROKER_SANDBOX_ORIGIN}/v1/assets/AAPL`)
  assertEquals(capturedMethod, 'GET')
  assertEquals(
    capturedAuthorization,
    `Basic ${btoa(`${credentials.apiKey}:${credentials.apiSecret}`)}`,
  )
  assertEquals(result.capability.ordersWrite, false)
  assertEquals(result.capability.accountsRead, false)
  assertEquals(result.status, 'passed')
  assertEquals('payload' in result, false)
})

Deno.test('retry is bounded to one repeat for a safe GET', async () => {
  let attempts = 0
  let slept = 0
  const adapter = createAlpacaBrokerSandboxAdapter({
    ...credentials,
    sleep: (milliseconds) => {
      slept += milliseconds
      return Promise.resolve()
    },
    fetcher: () => {
      attempts += 1
      return Promise.resolve(attempts === 1
        ? new Response(null, { status: 503 })
        : Response.json({ symbol: 'AAPL', status: 'active' }))
    },
  })

  const result = await adapter.probe()

  assertEquals(attempts, 2)
  assertEquals(result.attemptCount, 2)
  assertEquals(slept, 50)
})

Deno.test('provider response bodies and credentials are never surfaced in errors', async () => {
  const providerSecret = 'sandbox-secret-never-return'
  const providerBody = 'provider-body-never-return'
  const adapter = createAlpacaBrokerSandboxAdapter({
    apiKey: credentials.apiKey,
    apiSecret: providerSecret,
    fetcher: () => Promise.resolve(new Response(providerBody, { status: 401 })),
  })

  const error = await assertRejects(
    () => adapter.probe(),
    BrokerSandboxError,
  )

  assertEquals((error as BrokerSandboxError).code, 'AUTHENTICATION_FAILED')
  assertEquals((error as BrokerSandboxError).httpStatus, 401)
  assertEquals(error.message.includes(providerSecret), false)
  assertEquals(error.message.includes(providerBody), false)
})

Deno.test('malformed credentials fail before any request', () => {
  const error = assertThrows(
    () => createAlpacaBrokerSandboxAdapter({
      apiKey: 'bad:key',
      apiSecret: credentials.apiSecret,
    }),
    BrokerSandboxError,
  )
  assertEquals((error as BrokerSandboxError).code, 'CONFIGURATION_INVALID')
})
