import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'

type RiskRefreshRequest = {
  portfolioId?: string
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeRiskError(message: string) {
  if (message.includes('not found')) {
    return 'The paper portfolio was not found.'
  }
  if (message.includes('cash balance')) {
    return 'The paper portfolio cash account is incomplete.'
  }
  if (message.includes('risk limits')) {
    return 'The paper portfolio risk policy is incomplete.'
  }
  return 'Unable to refresh portfolio risk.'
}

Deno.serve(async (request) => {
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

  let input: RiskRefreshRequest
  try {
    input = await parseJsonBody<RiskRefreshRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  const portfolioId = input.portfolioId?.trim() ?? ''
  if (!uuidPattern.test(portfolioId)) {
    return jsonResponse({ error: 'Invalid paper portfolio identifier' }, 400)
  }

  const { data, error } = await userContext.admin.rpc(
    'monitor_paper_portfolio',
    {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
    },
  )

  if (error) {
    return jsonResponse({ error: safeRiskError(error.message) }, 409)
  }

  const { data: decisionEvaluation, error: decisionError } =
    await userContext.admin.rpc('evaluate_paper_decision_outcomes', {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
    })

  return jsonResponse({
    risk: data,
    decisionEvaluation: decisionError
      ? { status: 'evaluation_unavailable' }
      : decisionEvaluation,
    simulation: true,
  })
})
