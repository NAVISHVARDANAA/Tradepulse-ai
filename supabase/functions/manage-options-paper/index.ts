import { requireUser, userGuardErrorResponse } from '../_shared/auth.ts'
import {
  corsPreflightResponse,
  jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'

type OptionsPaperRequest = {
  action?: 'initialize' | 'create_strategy' | 'simulate_event' | 'reconcile'
  portfolioId?: string
  startingCash?: number
  experienceLevel?: 'none' | 'beginner' | 'intermediate' | 'advanced'
  objective?: 'education' | 'hedging' | 'income' | 'growth'
  lossTolerance?: 'low' | 'medium' | 'high'
  jurisdictionCode?: string
  clientStrategyId?: string
  strategyType?: 'long_call' | 'long_put' | 'bull_call_spread' | 'bear_put_spread'
  longContractId?: number
  shortContractId?: number | null
  contracts?: number
  strategyId?: string
  clientEventId?: string
  eventType?: 'expiration' | 'exercise' | 'assignment' | 'early_assignment' | 'corporate_action'
  settlementPrice?: number | null
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const validClientId = (value: string) => value.length >= 8 && value.length <= 100

function safeOptionsError(message: string) {
  if (message.includes('paused')) return 'This options paper account is paused.'
  if (message.includes('Insufficient options virtual cash')) return 'The virtual options balance is insufficient for the bounded maximum loss.'
  if (message.includes('assessment')) return 'Complete the options education assessment before saving a simulation.'
  if (message.includes('Assignment requires')) return 'Assignment can only be rehearsed on a protected spread with a short leg.'
  if (message.includes('defined risk') || message.includes('bounded risk')) return 'The selected legs do not form a supported defined-risk strategy.'
  if (message.includes('not found') || message.includes('unavailable')) return 'The selected paper portfolio, strategy, or option scenario is unavailable.'
  return 'The options education simulation could not be completed.'
}

Deno.serve(observeEdgeHandler('options-paper', async (request) => {
  if (request.method === 'OPTIONS') return corsPreflightResponse()
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let userContext: Awaited<ReturnType<typeof requireUser>>
  try {
    userContext = await requireUser(request, { requireVerifiedMfaWhenEnrolled: true })
  } catch (error) {
    return userGuardErrorResponse(error)
  }

  let input: OptionsPaperRequest
  try {
    input = await parseJsonBody<OptionsPaperRequest>(request)
  } catch (error) {
    const validation = error instanceof RequestValidationError ? error : null
    return jsonResponse(
      { error: validation?.publicMessage ?? 'Invalid JSON request' },
      validation?.status ?? 400,
    )
  }

  const portfolioId = input.portfolioId?.trim() ?? ''
  if (!uuidPattern.test(portfolioId)) {
    return jsonResponse({ error: 'Invalid options paper portfolio' }, 400)
  }

  let rpc: string
  let args: Record<string, unknown>

  if (input.action === 'initialize') {
    const startingCash = Number(input.startingCash ?? 100_000)
    const experienceLevel = input.experienceLevel
    const objective = input.objective
    const lossTolerance = input.lossTolerance
    const jurisdictionCode = input.jurisdictionCode?.trim().toUpperCase() ?? ''
    if (
      !Number.isFinite(startingCash) || startingCash < 1_000 || startingCash > 1_000_000 ||
      !experienceLevel || !['none', 'beginner', 'intermediate', 'advanced'].includes(experienceLevel) ||
      !objective || !['education', 'hedging', 'income', 'growth'].includes(objective) ||
      !lossTolerance || !['low', 'medium', 'high'].includes(lossTolerance) ||
      !/^[A-Z]{2}$/.test(jurisdictionCode)
    ) return jsonResponse({ error: 'Invalid options education assessment' }, 400)
    rpc = 'initialize_options_paper_account'
    args = {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
      p_starting_cash: startingCash,
      p_experience_level: experienceLevel,
      p_objective: objective,
      p_loss_tolerance: lossTolerance,
      p_jurisdiction_code: jurisdictionCode,
    }
  } else if (input.action === 'create_strategy') {
    const clientStrategyId = input.clientStrategyId?.trim() ?? ''
    const strategyType = input.strategyType
    const longContractId = Number(input.longContractId)
    const shortContractId = input.shortContractId == null ? null : Number(input.shortContractId)
    const contracts = Number(input.contracts)
    if (
      !validClientId(clientStrategyId) || !strategyType ||
      !['long_call', 'long_put', 'bull_call_spread', 'bear_put_spread'].includes(strategyType) ||
      !Number.isInteger(longContractId) || longContractId <= 0 ||
      (shortContractId !== null && (!Number.isInteger(shortContractId) || shortContractId <= 0)) ||
      !Number.isInteger(contracts) || contracts < 1 || contracts > 100 ||
      (strategyType.includes('spread') && shortContractId === null) ||
      (!strategyType.includes('spread') && shortContractId !== null)
    ) return jsonResponse({ error: 'Invalid options paper strategy' }, 400)
    rpc = 'create_options_paper_strategy'
    args = {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
      p_client_strategy_id: clientStrategyId,
      p_strategy_type: strategyType,
      p_long_contract_id: longContractId,
      p_short_contract_id: shortContractId,
      p_contracts: contracts,
    }
  } else if (input.action === 'simulate_event') {
    const strategyId = input.strategyId?.trim() ?? ''
    const clientEventId = input.clientEventId?.trim() ?? ''
    const eventType = input.eventType
    const settlementPrice = input.settlementPrice == null ? null : Number(input.settlementPrice)
    if (
      !uuidPattern.test(strategyId) || !validClientId(clientEventId) || !eventType ||
      !['expiration', 'exercise', 'assignment', 'early_assignment', 'corporate_action'].includes(eventType) ||
      (eventType !== 'corporate_action' && (settlementPrice === null || !Number.isFinite(settlementPrice) || settlementPrice < 0))
    ) return jsonResponse({ error: 'Invalid options paper lifecycle event' }, 400)
    rpc = 'simulate_options_paper_event'
    args = {
      p_user_id: userContext.user.id,
      p_portfolio_id: portfolioId,
      p_strategy_id: strategyId,
      p_client_event_id: clientEventId,
      p_event_type: eventType,
      p_settlement_price: eventType === 'corporate_action' ? null : settlementPrice,
    }
  } else if (input.action === 'reconcile') {
    rpc = 'reconcile_options_paper_portfolio'
    args = { p_user_id: userContext.user.id, p_portfolio_id: portfolioId }
  } else {
    return jsonResponse({ error: 'Unsupported options paper action' }, 400)
  }

  const { data, error } = await userContext.admin.rpc(rpc, args)
  if (error) return jsonResponse({ error: safeOptionsError(error.message) }, 409)
  return jsonResponse({ result: data, simulation: true, liveOptionsPermission: false })
}))
