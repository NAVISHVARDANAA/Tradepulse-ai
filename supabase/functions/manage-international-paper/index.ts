import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type InternationalPaperRequest = {
  action?: 'initialize' | 'convert_cash' | 'submit_order' | 'reconcile'
  portfolioId?: string
  startingBalance?: number
  fromCurrency?: string
  toCurrency?: string
  fromAmount?: number
  clientConversionId?: string
  listingId?: number
  clientOrderId?: string
  side?: 'buy' | 'sell'
  orderType?: 'market' | 'limit' | 'stop' | 'stop_limit'
  timeInForce?: 'day' | 'gtc' | 'ioc'
  quantity?: number
  limitPrice?: number | null
  stopPrice?: number | null
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function safeSimulationError(message: string) {
  if (message.includes('paused')) return 'This international paper account is paused.'
  if (message.includes('Insufficient virtual cash')) return 'The selected virtual currency balance is insufficient.'
  if (message.includes('Insufficient virtual position')) return 'The simulated position is insufficient for this sale.'
  if (message.includes('lot size')) return 'The quantity does not match the modeled venue lot size.'
  if (message.includes('tick size')) return 'The trigger price does not match the modeled venue tick size.'
  if (message.includes('costs are unavailable')) return 'Modeled costs are unavailable, so this simulation fails closed.'
  if (message.includes('FX scenario is unavailable')) return 'The requested virtual FX scenario is unavailable.'
  if (message.includes('not found') || message.includes('unavailable')) return 'The selected paper portfolio or scenario is unavailable.'
  return 'The international paper simulation could not be completed.'
}

function validClientId(value: string) {
  return value.length >= 8 && value.length <= 100
}

Deno.serve(observeEdgeHandler('international-paper', async (request) => {
  if (request.method === 'OPTIONS') return corsPreflightResponse()
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request, { requireVerifiedMfaWhenEnrolled: true })
  } catch (error) {
    return userGuardErrorResponse(error)
  }

  let input: InternationalPaperRequest
  try {
    input = await parseJsonBody<InternationalPaperRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  const portfolioId = input.portfolioId?.trim() ?? ''
  if (!uuidPattern.test(portfolioId)) {
    return jsonResponse({ error: 'Invalid international paper portfolio' }, 400)
  }

  let rpc: string
  let args: Record<string, unknown>

  if (input.action === 'initialize') {
    const startingBalance = Number(input.startingBalance ?? 100_000)
    if (!Number.isFinite(startingBalance) || startingBalance < 1_000 || startingBalance > 1_000_000) {
      return jsonResponse({ error: 'Invalid international virtual balance' }, 400)
    }
    rpc = 'initialize_international_paper_account'
    args = {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
      p_starting_balance: startingBalance,
    }
  } else if (input.action === 'convert_cash') {
    const fromCurrency = input.fromCurrency?.trim().toUpperCase() ?? ''
    const toCurrency = input.toCurrency?.trim().toUpperCase() ?? ''
    const fromAmount = Number(input.fromAmount)
    const clientConversionId = input.clientConversionId?.trim() ?? ''
    if (
      !/^[A-Z]{3}$/.test(fromCurrency) || !/^[A-Z]{3}$/.test(toCurrency) ||
      fromCurrency === toCurrency || !Number.isFinite(fromAmount) || fromAmount <= 0 ||
      !validClientId(clientConversionId)
    ) return jsonResponse({ error: 'Invalid virtual FX conversion' }, 400)
    rpc = 'convert_international_paper_cash'
    args = {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
      p_from_currency: fromCurrency,
      p_to_currency: toCurrency,
      p_from_amount: fromAmount,
      p_client_conversion_id: clientConversionId,
    }
  } else if (input.action === 'submit_order') {
    const listingId = Number(input.listingId)
    const quantity = Number(input.quantity)
    const clientOrderId = input.clientOrderId?.trim() ?? ''
    const side = input.side
    const orderType = input.orderType
    const timeInForce = input.timeInForce ?? 'day'
    const limitPrice = input.limitPrice == null ? null : Number(input.limitPrice)
    const stopPrice = input.stopPrice == null ? null : Number(input.stopPrice)
    if (
      !Number.isInteger(listingId) || listingId <= 0 || !Number.isFinite(quantity) ||
      quantity <= 0 || quantity > 1_000_000 || !validClientId(clientOrderId) ||
      !side || !['buy', 'sell'].includes(side) ||
      !orderType || !['market', 'limit', 'stop', 'stop_limit'].includes(orderType) ||
      !['day', 'gtc', 'ioc'].includes(timeInForce) ||
      (orderType === 'limit' || orderType === 'stop_limit') && (!limitPrice || limitPrice <= 0) ||
      (orderType === 'stop' || orderType === 'stop_limit') && (!stopPrice || stopPrice <= 0)
    ) return jsonResponse({ error: 'Invalid international paper order' }, 400)
    rpc = 'execute_international_paper_order'
    args = {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
      p_listing_id: listingId,
      p_client_order_id: clientOrderId,
      p_side: side,
      p_order_type: orderType,
      p_time_in_force: timeInForce,
      p_quantity: quantity,
      p_limit_price: limitPrice,
      p_stop_price: stopPrice,
    }
  } else if (input.action === 'reconcile') {
    rpc = 'reconcile_international_paper_portfolio'
    args = { p_user_id: userContext.user.id, p_portfolio_id: portfolioId }
  } else {
    return jsonResponse({ error: 'Unsupported international paper action' }, 400)
  }

  const { data, error } = await userContext.admin.rpc(rpc, args)
  if (error) return jsonResponse({ error: safeSimulationError(error.message) }, 409)
  return jsonResponse({ result: data, simulation: true })
}))
