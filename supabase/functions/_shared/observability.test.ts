import { observeEdgeHandler } from './observability.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

Deno.test('observed handlers preserve responses and support references', async () => {
  const handler = observeEdgeHandler('paper-simulation', () => new Response(
    JSON.stringify({ ok: true }),
    {
      status: 201,
      headers: {
        'content-type': 'application/json',
        'x-request-id': '00000000-0000-4000-8000-000000000022',
      },
    },
  ))

  const response = await handler(new Request('https://example.test/paper', { method: 'POST' }))

  assert(response.status === 201, 'response status changed')
  assert(
    response.headers.get('x-request-id') === '00000000-0000-4000-8000-000000000022',
    'support reference changed',
  )
})

Deno.test('service codes are bounded and cannot inject log fields', () => {
  let rejected = false
  try {
    observeEdgeHandler('bad\nservice', () => new Response())
  } catch {
    rejected = true
  }

  assert(rejected, 'unsafe service code was accepted')
})

Deno.test('unhandled failures are sanitized before rethrow', async () => {
  const handler = observeEdgeHandler('forecasting', () => {
    throw new Error('secret provider detail')
  })

  try {
    await handler(new Request('https://example.test/forecast'))
    throw new Error('handler unexpectedly succeeded')
  } catch (error) {
    assert(error instanceof Error, 'unexpected error type')
    assert(error.message === 'Unhandled Edge Function failure', 'internal error detail escaped')
  }
})
