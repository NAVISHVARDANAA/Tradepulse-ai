import { requireUser } from '../_shared/auth.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'

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
      { error: code === 'server_configuration' ? 'Server configuration is incomplete' : 'Authentication is required' },
      code === 'server_configuration' ? 500 : 401,
    )
  }

  let input: PortfolioRequest
  try {
    input = (await request.json()) as PortfolioRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON request' }, 400)
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
})
