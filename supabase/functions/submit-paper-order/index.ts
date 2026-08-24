import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type PaperOrderRequest = {
  portfolioId?: string
  instrumentId?: number
  clientOrderId?: string
  side?: 'buy' | 'sell'
  quantity?: number
  thesis?: string
  conviction?: number
  plannedHorizonHours?: number
}

function safeOrderError(message: string) {
  if (message.includes('kill switch')) {
    return 'Paper trading is paused by the portfolio kill switch.'
  }
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
  if (message.includes('thesis')) {
    return 'Add a paper-trade thesis between 8 and 500 characters.'
  }
  if (message.includes('conviction')) {
    return 'Choose a paper-trade conviction between 1 and 5.'
  }
  if (message.includes('horizon')) {
    return 'Choose one of the supported paper-trade horizons.'
  }
  return 'Unable to submit the paper order.'
}

Deno.serve(observeEdgeHandler('paper-order', async (request) => {
  if (request.method === 'OPTIONS') {
    return corsPreflightResponse()
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request, { requireVerifiedMfaWhenEnrolled: true })
  } catch (error) {
    return userGuardErrorResponse(error)
  }

  let input: PaperOrderRequest
  try {
    input = await parseJsonBody<PaperOrderRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  const portfolioId = input.portfolioId?.trim() ?? ''
  const instrumentId = Number(input.instrumentId)
  const quantity = Number(input.quantity)
  const side = input.side
  const clientOrderId = input.clientOrderId?.trim() || crypto.randomUUID()
  const thesis = input.thesis?.trim() ?? ''
  const conviction = Number(input.conviction)
  const plannedHorizonHours = Number(input.plannedHorizonHours)
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
    clientOrderId.length > 100 ||
    thesis.length < 8 ||
    thesis.length > 500 ||
    !Number.isInteger(conviction) ||
    conviction < 1 ||
    conviction > 5 ||
    ![1, 24, 72, 168, 720].includes(plannedHorizonHours)
  ) {
    return jsonResponse({ error: 'Invalid paper order details' }, 400)
  }

  const { data, error } = await userContext.admin.rpc(
    'execute_paper_market_order_with_context',
    {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
      p_instrument_id: instrumentId,
      p_client_order_id: clientOrderId,
      p_side: side,
      p_quantity: quantity,
      p_thesis: thesis,
      p_conviction: conviction,
      p_planned_horizon_hours: plannedHorizonHours,
    },
  )

  if (error) {
    return jsonResponse({ error: safeOrderError(error.message) }, 409)
  }

  return jsonResponse({ order: data, simulation: true })
}))
