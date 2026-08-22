import { requireUser } from '../_shared/auth.ts'
import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type PaperOrderRequest = {
  portfolioId?: string
  instrumentId?: number
  clientOrderId?: string
  side?: 'buy' | 'sell'
  quantity?: number
}

function safeOrderError(message: string) {
  if (message.includes('market price is stale')) {
    return 'The synchronized market price is stale. Please wait for the next data sync.'
  }
  if (message.includes('No synchronized market price')) {
    return 'No synchronized market price is available for this instrument.'
  }
  if (message.includes('quote currency')) {
    return 'The instrument currency does not match this paper portfolio.'
  }
  if (message.includes('not enabled')) {
    return 'This instrument is not enabled for paper trading.'
  }
  if (message.includes('not found')) {
    return 'The paper portfolio or instrument was not found.'
  }
  return 'Unable to submit the paper order.'
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

  let input: PaperOrderRequest
  try {
    input = (await request.json()) as PaperOrderRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON request' }, 400)
  }

  const portfolioId = input.portfolioId?.trim() ?? ''
  const instrumentId = Number(input.instrumentId)
  const quantity = Number(input.quantity)
  const side = input.side
  const clientOrderId = input.clientOrderId?.trim() || crypto.randomUUID()
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

  if (
    !uuidPattern.test(portfolioId) ||
    !Number.isInteger(instrumentId) ||
    instrumentId <= 0 ||
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    quantity > 1_000_000 ||
    !side ||
    !['buy', 'sell'].includes(side) ||
    clientOrderId.length < 8 ||
    clientOrderId.length > 100
  ) {
    return jsonResponse({ error: 'Invalid paper order details' }, 400)
  }

  const { data, error } = await userContext.admin.rpc('execute_paper_market_order', {
    p_user_id: userContext.user.id,
    p_portfolio_id: portfolioId,
    p_instrument_id: instrumentId,
    p_client_order_id: clientOrderId,
    p_side: side,
    p_quantity: quantity,
  })

  if (error) {
    return jsonResponse({ error: safeOrderError(error.message) }, 409)
  }

  return jsonResponse({ order: data, simulation: true })
})
