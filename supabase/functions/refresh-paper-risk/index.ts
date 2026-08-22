import { requireUser } from '../_shared/auth.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'

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
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request)
  } catch (error) {
    const code = error instanceof Error ? error.message : 'authentication_required'
    return jsonResponse(
      {
        error:
          code === 'server_configuration'
            ? 'Server configuration is incomplete'
            : 'Authentication is required',
      },
      code === 'server_configuration' ? 500 : 401,
    )
  }

  let input: RiskRefreshRequest
  try {
    input = (await request.json()) as RiskRefreshRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON request' }, 400)
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

  return jsonResponse({ risk: data, simulation: true })
})
