import { requireUser } from '../_shared/auth.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type TradingControlRequest = {
  portfolioId?: string
  tradingEnabled?: boolean
  reason?: string
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeControlError(message: string) {
  if (message.includes('review is required')) {
    return 'A risk review is required before paper trading can resume.'
  }
  if (message.includes('not found')) {
    return 'The paper portfolio was not found.'
  }
  return 'Unable to update the paper-trading control.'
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

  let input: TradingControlRequest
  try {
    input = (await request.json()) as TradingControlRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON request' }, 400)
  }

  const portfolioId = input.portfolioId?.trim() ?? ''
  const reason = input.reason?.trim() ?? ''

  if (
    !uuidPattern.test(portfolioId) ||
    typeof input.tradingEnabled !== 'boolean' ||
    reason.length > 200
  ) {
    return jsonResponse({ error: 'Invalid paper-trading control details' }, 400)
  }

  const { data, error } = await userContext.admin.rpc(
    'set_paper_trading_control',
    {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
      p_trading_enabled: input.tradingEnabled,
      p_reason: reason || null,
    },
  )

  if (error) {
    return jsonResponse({ error: safeControlError(error.message) }, 409)
  }

  return jsonResponse({ control: data, simulation: true })
})
