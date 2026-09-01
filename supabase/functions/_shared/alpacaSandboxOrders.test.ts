import { assertEquals, assertRejects, assertThrows } from 'jsr:@std/assert@1'

import {
  ALPACA_SANDBOX_ORDER_ORIGIN,
  SandboxOrderError,
  assertAlpacaSandboxOrderUrl,
  createAlpacaSandboxOrderAdapter,
} from './alpacaSandboxOrders.ts'

const accountId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const orderId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const clientOrderId = 'tp-sbx-cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const credentials = { apiKey: 'sandbox-key-123', apiSecret: 'sandbox-secret-456' }

const providerOrder = (overrides: Record<string, unknown> = {}) => ({
  id: orderId,
  client_order_id: clientOrderId,
  status: 'new',
  submitted_at: '2026-09-01T00:00:00Z',
  account_id: accountId,
  ...overrides,
})

const input = {
  accountId,
  clientOrderId,
  symbol: 'AAPL',
  side: 'buy' as const,
  orderType: 'limit' as const,
  quantity: 1,
  limitPrice: 200,
  takeProfitLimitPrice: 220,
  stopLossStopPrice: 180,
}

Deno.test('order route lock accepts only fixed account-scoped sandbox routes', () => {
  assertEquals(
    assertAlpacaSandboxOrderUrl(
      `${ALPACA_SANDBOX_ORDER_ORIGIN}/v1/trading/accounts/${accountId}/orders`,
      'submit',
      accountId,
    ).origin,
    ALPACA_SANDBOX_ORDER_ORIGIN,
  )
  assertEquals(
    assertAlpacaSandboxOrderUrl(
      `${ALPACA_SANDBOX_ORDER_ORIGIN}/v1/trading/accounts/${accountId}/orders/${orderId}`,
      'order',
      accountId,
      orderId,
    ).pathname.endsWith(orderId),
    true,
  )

  for (const rejected of [
    `https://broker-api.alpaca.markets/v1/trading/accounts/${accountId}/orders`,
    `https://paper-api.alpaca.markets/v2/accounts/${accountId}/orders`,
    `${ALPACA_SANDBOX_ORDER_ORIGIN}/v1/trading/accounts/${accountId}/orders/all`,
    `${ALPACA_SANDBOX_ORDER_ORIGIN}/v1/trading/accounts/${accountId}/orders?live=true`,
  ]) {
    const error = assertThrows(
      () => assertAlpacaSandboxOrderUrl(rejected, 'submit', accountId),
      SandboxOrderError,
    )
    assertEquals((error as SandboxOrderError).code, 'SANDBOX_ROUTE_REJECTED')
  }
})

Deno.test('submit sends one bracket order and returns no raw provider identifiers', async () => {
  let method = ''
  let body: Record<string, unknown> = {}
  let authorization = ''
  const adapter = createAlpacaSandboxOrderAdapter({
    ...credentials,
    fetcher: (_request, init) => {
      method = init?.method ?? ''
      body = JSON.parse(String(init?.body))
      authorization = new Headers(init?.headers).get('authorization') ?? ''
      return Promise.resolve(Response.json(providerOrder()))
    },
  })

  const result = await adapter.submit(input)
  const serialized = JSON.stringify(result)

  assertEquals(method, 'POST')
  assertEquals(body.order_class, 'bracket')
  assertEquals(body.client_order_id, clientOrderId)
  assertEquals(body.take_profit, { limit_price: '220' })
  assertEquals(body.stop_loss, { stop_price: '180' })
  assertEquals(authorization, `Basic ${btoa(`${credentials.apiKey}:${credentials.apiSecret}`)}`)
  assertEquals(result.environment, 'sandbox')
  assertEquals(result.liveOrderRoutingEnabled, false)
  assertEquals(result.browserOriginated, false)
  assertEquals(result.accountFingerprint.length, 64)
  assertEquals(result.providerOrderFingerprint.length, 64)
  assertEquals(serialized.includes(accountId), false)
  assertEquals(serialized.includes(orderId), false)
})

Deno.test('ambiguous submit performs read reconciliation instead of repeating POST', async () => {
  const methods: string[] = []
  const adapter = createAlpacaSandboxOrderAdapter({
    ...credentials,
    fetcher: (_request, init) => {
      methods.push(init?.method ?? '')
      if (methods.length === 1) return Promise.reject(new TypeError('connection reset'))
      return Promise.resolve(Response.json(providerOrder()))
    },
  })

  const result = await adapter.submit(input)
  assertEquals(methods, ['POST', 'GET'])
  assertEquals(result.recoveredAfterAmbiguous, true)
  assertEquals(result.providerStatus, 'new')
})

Deno.test('duplicate client order rejection reconciles without another mutation', async () => {
  const methods: string[] = []
  const adapter = createAlpacaSandboxOrderAdapter({
    ...credentials,
    fetcher: (_request, init) => {
      methods.push(init?.method ?? '')
      if (methods.length === 1) return Promise.resolve(Response.json({}, { status: 422 }))
      return Promise.resolve(Response.json(providerOrder()))
    },
  })

  const result = await adapter.submit(input)
  assertEquals(methods, ['POST', 'GET'])
  assertEquals(result.providerStatus, 'new')
  assertEquals(result.recoveredAfterAmbiguous, false)
})

Deno.test('cancel resolves the provider order transiently then uses the fixed DELETE route', async () => {
  const methods: string[] = []
  const urls: string[] = []
  const adapter = createAlpacaSandboxOrderAdapter({
    ...credentials,
    fetcher: (request, init) => {
      methods.push(init?.method ?? '')
      urls.push(String(request))
      return Promise.resolve(methods.length === 1
        ? Response.json(providerOrder())
        : new Response(null, { status: 204 }))
    },
  })

  const result = await adapter.cancel(accountId, clientOrderId)
  assertEquals(methods, ['GET', 'DELETE'])
  assertEquals(urls[1].endsWith(`/orders/${orderId}`), true)
  assertEquals(result.providerStatus, 'pending_cancel')
})

Deno.test('replace uses one PATCH with a new client order id', async () => {
  const replacementClientId = 'tp-sbx-dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  const methods: string[] = []
  let patchBody: Record<string, unknown> = {}
  const adapter = createAlpacaSandboxOrderAdapter({
    ...credentials,
    fetcher: (_request, init) => {
      methods.push(init?.method ?? '')
      if (methods.length === 1) return Promise.resolve(Response.json(providerOrder()))
      patchBody = JSON.parse(String(init?.body))
      return Promise.resolve(Response.json(providerOrder({
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        client_order_id: replacementClientId,
        status: 'pending_replace',
      })))
    },
  })

  const result = await adapter.replace(accountId, clientOrderId, {
    ...input,
    clientOrderId: replacementClientId,
    quantity: 2,
    limitPrice: 195,
  })
  assertEquals(methods, ['GET', 'PATCH'])
  assertEquals(patchBody.client_order_id, replacementClientId)
  assertEquals(patchBody.qty, '2')
  assertEquals(result.clientOrderId, replacementClientId)
})

Deno.test('protective envelope and credentials fail before provider access', async () => {
  let requested = false
  const adapter = createAlpacaSandboxOrderAdapter({
    ...credentials,
    fetcher: () => {
      requested = true
      return Promise.resolve(Response.json(providerOrder()))
    },
  })
  await assertRejects(
    () => adapter.submit({ ...input, stopLossStopPrice: 225 }),
    SandboxOrderError,
  )
  assertEquals(requested, false)

  const error = assertThrows(
    () => createAlpacaSandboxOrderAdapter({ apiKey: 'bad:key', apiSecret: credentials.apiSecret }),
    SandboxOrderError,
  )
  assertEquals((error as SandboxOrderError).code, 'CONFIGURATION_INVALID')
})
