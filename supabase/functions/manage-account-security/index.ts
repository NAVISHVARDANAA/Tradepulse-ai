import {
  requiresMfaStepUp,
  verifiedFactorTypes,
} from '../_shared/accountSecurity.ts'
import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type SecurityRequest = {
  action?: 'status' | 'revoke_other_sessions'
}

async function synchronizePosture(
  userContext: Awaited<ReturnType<typeof requireUser>>,
) {
  const { data: factorData, error: factorError } =
    await userContext.userClient.auth.mfa.listFactors()

  if (factorError) {
    throw new Error('factor_status_unavailable')
  }

  const verifiedFactors = factorData.all.filter(
    (factor) => factor.status === 'verified',
  )
  const factorTypes = verifiedFactorTypes(verifiedFactors)
  const currentLevel = userContext.assurance.currentLevel ?? 'aal1'
  const nextLevel = userContext.assurance.nextLevel ?? currentLevel
  const { data: posture, error: postureError } = await userContext.admin.rpc(
    'sync_account_security_posture',
    {
      p_user_id: userContext.user.id,
      p_verified_factor_count: verifiedFactors.length,
      p_verified_factor_types: factorTypes,
      p_current_assurance_level: currentLevel,
      p_next_assurance_level: nextLevel,
    },
  )

  if (postureError) {
    console.error('Account security posture synchronization failed:', postureError.code)
    throw new Error('posture_sync_failed')
  }

  return {
    posture,
    factors: verifiedFactors.map((factor) => ({
      id: factor.id,
      factorType: factor.factor_type,
      friendlyName: factor.friendly_name ?? 'Authenticator',
      createdAt: factor.created_at,
      updatedAt: factor.updated_at,
    })),
  }
}

Deno.serve(observeEdgeHandler('account-security', async (request) => {
  if (request.method === 'OPTIONS') {
    return corsPreflightResponse()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request)
  } catch (error) {
    return userGuardErrorResponse(error)
  }

  let input: SecurityRequest
  try {
    input = await parseJsonBody<SecurityRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  if (input.action !== 'status' && input.action !== 'revoke_other_sessions') {
    return jsonResponse({ error: 'Unsupported account security action' }, 400)
  }

  if (
    input.action === 'revoke_other_sessions'
    && requiresMfaStepUp(
      userContext.assurance.currentLevel,
      userContext.assurance.nextLevel,
    )
  ) {
    return userGuardErrorResponse(new Error('step_up_required'))
  }

  try {
    const synchronized = await synchronizePosture(userContext)

    if (input.action === 'status') {
      return jsonResponse(synchronized)
    }

    const { error: signOutError } = await userContext.userClient.auth.signOut({
      scope: 'others',
    })

    if (signOutError) {
      return jsonResponse({ error: 'Unable to revoke other sessions' }, 409)
    }

    const { error: recordError } = await userContext.admin.rpc(
      'record_account_session_action',
      {
        p_user_id: userContext.user.id,
        p_action: 'other_sessions_revoked',
      },
    )

    if (recordError) {
      console.error('Account session action recording failed:', recordError.code)
      return jsonResponse(
        {
          revoked: true,
          warning: 'Other sessions were revoked, but the security history update is delayed.',
        },
      )
    }

    return jsonResponse({ revoked: true })
  } catch {
    return jsonResponse(
      { error: 'Account security status is temporarily unavailable' },
      503,
    )
  }
}))
