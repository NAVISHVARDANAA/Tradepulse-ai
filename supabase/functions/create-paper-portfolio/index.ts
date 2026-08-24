import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type PortfolioRequest = {
  name?: string
  baseCurrency?: string
  startingBalance?: number
}

function safePortfolioError(message: string) {
  if (message.includes('limit reached')) {
    return 'Paper portfolio limit reached for the current plan.'
  }
  if (message.includes('already exists') || message.includes('duplicate')) {
    return 'A paper portfolio with this name already exists.'
  }
  return 'Unable to create the paper portfolio.'
}

Deno.serve(observeEdgeHandler('paper-portfolio', async (request) => {
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

  let input: PortfolioRequest
  try {
    input = await parseJsonBody<PortfolioRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  const name = input.name?.trim() ?? ''
  const baseCurrency = (input.baseCurrency ?? 'USD').trim().toUpperCase()
  const startingBalance = Number(input.startingBalance ?? 100_000)

  if (
    name.length < 2 ||
    name.length > 60 ||
    !/^[A-Z]{3}$/.test(baseCurrency) ||
    !Number.isFinite(startingBalance) ||
    startingBalance < 1_000 ||
    startingBalance > 1_000_000
  ) {
    return jsonResponse({ error: 'Invalid paper portfolio details' }, 400)
  }

  const { data, error } = await userContext.admin.rpc('create_paper_portfolio', {
    p_user_id: userContext.user.id,
    p_name: name,
    p_base_currency: baseCurrency,
    p_starting_balance: startingBalance,
  })

  if (error) {
    return jsonResponse({ error: safePortfolioError(error.message) }, 409)
  }

  return jsonResponse({ portfolio: data, simulation: true }, 201)
}))
