import { userGuardErrorResponse } from './auth.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

Deno.test('missing or invalid customer authentication returns a generic 401', async () => {
  const response = userGuardErrorResponse(new Error('authentication_required'))
  const payload = await response.json() as { error?: string; requestId?: string }
  assert(response.status === 401, 'authentication failure did not return HTTP 401')
  assert(payload.error === 'Authentication is required', 'authentication response leaked detail')
  assert(Boolean(payload.requestId), 'authentication response omitted its support reference')
})

Deno.test('MFA step-up remains distinct from missing authentication', async () => {
  const response = userGuardErrorResponse(new Error('step_up_required'))
  const payload = await response.json() as { error?: string }
  assert(response.status === 403, 'MFA step-up did not return HTTP 403')
  assert(
    payload.error === 'Additional account verification is required before this action.',
    'MFA step-up returned an unexpected customer message',
  )
})

Deno.test('server configuration failures never appear as authentication failures', async () => {
  const response = userGuardErrorResponse(new Error('server_configuration'))
  const payload = await response.json() as { error?: string }
  assert(response.status === 500, 'server configuration failure did not return HTTP 500')
  assert(payload.error === 'Server configuration is incomplete', 'configuration response changed')
})
