import {
  hasValidInternalSecret,
  internalJsonResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from './http.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

Deno.test('browser responses never advertise the internal secret header', async () => {
  const response = jsonResponse({ error: 'Safe customer message' }, 400)
  const allowedHeaders = response.headers.get('access-control-allow-headers') ?? ''
  const payload = await response.json() as { requestId?: string }

  assert(!allowedHeaders.includes('x-sync-secret'), 'internal secret header leaked through CORS')
  assert(response.headers.get('x-content-type-options') === 'nosniff', 'nosniff is missing')
  assert(Boolean(response.headers.get('x-request-id')), 'request id is missing')
  assert(payload.requestId === response.headers.get('x-request-id'), 'support reference is inconsistent')
})

Deno.test('internal responses do not enable browser CORS', () => {
  const response = internalJsonResponse({ ok: true })
  assert(!response.headers.has('access-control-allow-origin'), 'internal response enabled CORS')
})

Deno.test('constant-time secret validation accepts only the configured value', async () => {
  Deno.env.set('TEST_INTERNAL_SECRET', 'correct-horse-battery-staple')
  try {
    const accepted = await hasValidInternalSecret(
      new Request('https://example.test', {
        headers: { 'x-sync-secret': 'correct-horse-battery-staple' },
      }),
      'TEST_INTERNAL_SECRET',
    )
    const rejected = await hasValidInternalSecret(
      new Request('https://example.test', {
        headers: { 'x-sync-secret': 'incorrect' },
      }),
      'TEST_INTERNAL_SECRET',
    )

    assert(accepted, 'valid secret was rejected')
    assert(!rejected, 'invalid secret was accepted')
  } finally {
    Deno.env.delete('TEST_INTERNAL_SECRET')
  }
})

Deno.test('bounded JSON parsing rejects oversized requests', async () => {
  try {
    await parseJsonBody(
      new Request('https://example.test', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ value: 'too large' }),
      }),
      8,
    )
    throw new Error('oversized request was accepted')
  } catch (error) {
    assert(error instanceof RequestValidationError, 'unexpected error type')
    assert(error.status === 413, 'unexpected error status')
  }
})
