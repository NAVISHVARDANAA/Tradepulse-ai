import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import {
  normalizeAssuranceLevel,
  requiresMfaStepUp,
} from './accountSecurity.ts'
import { jsonResponse } from './http.ts'

type RequireUserOptions = {
  requireVerifiedMfaWhenEnrolled?: boolean
}

export function userGuardErrorResponse(error: unknown) {
  const code = error instanceof Error ? error.message : 'authentication_required'

  if (code === 'rate_limited') {
    return jsonResponse(
      { error: 'Too many requests. Please wait a moment and try again.' },
      429,
      { 'Retry-After': '60' },
    )
  }

  if (code === 'server_configuration') {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  if (code === 'step_up_required') {
    return jsonResponse(
      { error: 'Additional account verification is required before this action.' },
      403,
    )
  }

  return jsonResponse({ error: 'Authentication is required' }, 401)
}

export async function requireUser(
  request: Request,
  options: RequireUserOptions = {},
) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error('server_configuration')
  }

  if (!authorization) {
    throw new Error('authentication_required')
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser()

  if (error || !user) {
    throw new Error('authentication_required')
  }

  const { data: assurance, error: assuranceError } =
    await userClient.auth.mfa.getAuthenticatorAssuranceLevel()

  if (assuranceError) {
    throw new Error('server_configuration')
  }

  const normalizedAssurance = {
    currentLevel: normalizeAssuranceLevel(assurance.currentLevel),
    nextLevel: normalizeAssuranceLevel(assurance.nextLevel),
  }

  if (
    options.requireVerifiedMfaWhenEnrolled
    && requiresMfaStepUp(
      normalizedAssurance.currentLevel,
      normalizedAssurance.nextLevel,
    )
  ) {
    throw new Error('step_up_required')
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const routeKey = new URL(request.url).pathname
    .replace(/^\/functions\/v1\//, '')
    .replace(/[^a-z0-9/_-]/g, '-')
    .slice(0, 128)
  const { data: allowance, error: allowanceError } = await admin.rpc(
    'consume_user_api_rate_limit',
    {
      p_user_id: user.id,
      p_route_key: routeKey || 'unknown',
      p_request_limit: 60,
      p_window_seconds: 60,
    },
  )

  if (allowanceError) {
    console.error('Authenticated API guard failed:', allowanceError.code)
    throw new Error('server_configuration')
  }

  if (allowance?.allowed === false) {
    throw new Error('rate_limited')
  }

  return {
    user,
    userClient,
    admin,
    assurance: normalizedAssurance,
  }
}
