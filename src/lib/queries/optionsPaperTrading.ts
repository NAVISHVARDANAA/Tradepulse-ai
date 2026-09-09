import { supabase } from '../supabase/client'

type NumericValue = number | string | null

const toNumber = (value: NumericValue) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      const payload = await context.clone().json() as { error?: string }
      if (payload.error) throw new Error(payload.error)
    } catch (responseError) {
      if (responseError instanceof Error && responseError.message) throw responseError
    }
  }
  throw error instanceof Error ? error : new Error('The options paper request failed.')
}

export type OptionsStrategyType = 'long_call' | 'long_put' | 'bull_call_spread' | 'bear_put_spread'
export type OptionsEventType = 'expiration' | 'exercise' | 'assignment' | 'early_assignment' | 'corporate_action'

export type OptionsChainContract = {
  contractId: number
  underlyingListingId: number
  underlyingListingKey: string
  underlyingSymbol: string
  underlyingName: string
  underlyingScenarioPrice: number
  quoteCurrency: string
  micCode: string
  contractSymbol: string
  optionType: 'call' | 'put'
  expiresOn: string
  strike: number
  multiplier: number
  bid: number
  ask: number
  volume: number
  openInterest: number
  impliedVolatility: number
  delta: number
  gamma: number
  theta: number
  vega: number
  quoteObservedAt: string
  freshnessStatus: 'scenario_current' | 'scenario_stale'
  corporateActionAdjusted: boolean
  scenarioVersion: string
}

export type OptionsStrategyPreview = {
  strategyType: OptionsStrategyType
  longContract: OptionsChainContract
  shortContract: OptionsChainContract | null
  contracts: number
  debitPerShare: number
  maxLoss: number
  maxProfit: number | null
  breakEven: number
  profitPotential: 'bounded' | 'unbounded'
  payoffPoints: Array<{ price: number; profitLoss: number }>
}

export type OptionsPaperStrategy = {
  id: string
  strategyType: OptionsStrategyType
  underlyingListingKey: string
  underlyingSymbol: string
  expiresOn: string
  contracts: number
  netDebitPerShare: number
  collateralAmount: number
  maxProfit: number | null
  maxLoss: number
  breakEvenPrice: number
  profitPotential: 'bounded' | 'unbounded'
  lifecycleStatus: string
  realizedPnl: number | null
  legCount: number
  protectedShortLegCount: number
  openedAt: string
}

export type OptionsPaperSnapshot = {
  initialized: boolean
  cashBalance: number
  startingCash: number
  assessmentStatus: 'education_only' | null
  experienceLevel: string | null
  strategies: OptionsPaperStrategy[]
  latestReconciliation: { status: 'passed' | 'exception'; issues: number; reconciledAt: string } | null
}

export async function getOptionsPaperChain(): Promise<OptionsChainContract[]> {
  const { data, error } = await supabase
    .from('options_paper_chain_catalog')
    .select('*')
    .order('underlying_symbol')
    .order('option_type')
    .order('strike')

  if (error) throw error
  return (data ?? []).map((row) => ({
    contractId: Number(row.contract_id),
    underlyingListingId: Number(row.underlying_listing_id),
    underlyingListingKey: row.underlying_listing_key,
    underlyingSymbol: row.underlying_symbol,
    underlyingName: row.underlying_name,
    underlyingScenarioPrice: toNumber(row.underlying_scenario_price),
    quoteCurrency: row.quote_currency,
    micCode: row.mic_code,
    contractSymbol: row.contract_symbol,
    optionType: row.option_type,
    expiresOn: row.expires_on,
    strike: toNumber(row.strike),
    multiplier: Number(row.contract_multiplier),
    bid: toNumber(row.bid),
    ask: toNumber(row.ask),
    volume: Number(row.volume),
    openInterest: Number(row.open_interest),
    impliedVolatility: toNumber(row.implied_volatility),
    delta: toNumber(row.delta),
    gamma: toNumber(row.gamma),
    theta: toNumber(row.theta),
    vega: toNumber(row.vega),
    quoteObservedAt: row.quote_observed_at,
    freshnessStatus: row.freshness_status,
    corporateActionAdjusted: row.corporate_action_adjusted,
    scenarioVersion: row.scenario_version,
  }))
}

function intrinsic(contract: OptionsChainContract, price: number) {
  return contract.optionType === 'call'
    ? Math.max(price - contract.strike, 0)
    : Math.max(contract.strike - price, 0)
}

export function buildOptionsStrategyPreview(
  contracts: OptionsChainContract[],
  strategyType: OptionsStrategyType,
  contractCount: number,
): OptionsStrategyPreview | null {
  const optionType = strategyType === 'long_call' || strategyType === 'bull_call_spread' ? 'call' : 'put'
  const candidates = contracts
    .filter((contract) => contract.optionType === optionType)
    .sort((left, right) => left.strike - right.strike)
  if (candidates.length < (strategyType.includes('spread') ? 2 : 1)) return null

  const longContract = strategyType === 'long_put' || strategyType === 'bear_put_spread'
    ? candidates[candidates.length - 1]
    : candidates[0]
  const shortContract = strategyType === 'bull_call_spread'
    ? candidates[candidates.length - 1]
    : strategyType === 'bear_put_spread'
      ? candidates[0]
      : null
  const count = Math.max(1, Math.min(100, Math.trunc(contractCount || 1)))
  const debitPerShare = longContract.ask - (shortContract?.bid ?? 0)
  if (debitPerShare <= 0) return null
  const multiplier = longContract.multiplier
  const maxLoss = debitPerShare * multiplier * count
  const width = shortContract ? Math.abs(shortContract.strike - longContract.strike) : null
  const maxProfit = width === null
    ? strategyType === 'long_call'
      ? null
      : Math.max(longContract.strike - debitPerShare, 0) * multiplier * count
    : (width - debitPerShare) * multiplier * count
  const breakEven = optionType === 'call'
    ? longContract.strike + debitPerShare
    : Math.max(longContract.strike - debitPerShare, 0)
  const underlying = longContract.underlyingScenarioPrice
  const prices = [0.75, 0.9, 0.95, 1, 1.05, 1.1, 1.25].map((ratio) => underlying * ratio)
  const payoffPoints = prices.map((price) => {
    const gross = intrinsic(longContract, price) - (shortContract ? intrinsic(shortContract, price) : 0)
    return { price, profitLoss: (gross - debitPerShare) * multiplier * count }
  })

  return {
    strategyType,
    longContract,
    shortContract,
    contracts: count,
    debitPerShare,
    maxLoss,
    maxProfit,
    breakEven,
    profitPotential: maxProfit === null ? 'unbounded' : 'bounded',
    payoffPoints,
  }
}

export async function getOptionsPaperSnapshot(portfolioId: string): Promise<OptionsPaperSnapshot> {
  const [account, profile, strategies, reconciliation] = await Promise.all([
    supabase.from('options_paper_accounts').select('starting_cash, cash_balance').eq('portfolio_id', portfolioId).maybeSingle(),
    supabase.from('options_paper_appropriateness_profiles').select('assessment_status, experience_level').eq('portfolio_id', portfolioId).maybeSingle(),
    supabase.from('options_paper_strategy_history').select('*').eq('portfolio_id', portfolioId).order('opened_at', { ascending: false }).limit(12),
    supabase.from('options_paper_reconciliations').select('status, unbalanced_journals, uncovered_short_legs, risk_boundary_exceptions, cash_mismatches, reconciled_at').eq('portfolio_id', portfolioId).order('reconciled_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  const firstError = [account.error, profile.error, strategies.error, reconciliation.error].find(Boolean)
  if (firstError) throw firstError
  return {
    initialized: Boolean(account.data),
    cashBalance: toNumber(account.data?.cash_balance ?? null),
    startingCash: toNumber(account.data?.starting_cash ?? null),
    assessmentStatus: profile.data?.assessment_status ?? null,
    experienceLevel: profile.data?.experience_level ?? null,
    strategies: (strategies.data ?? []).map((row) => ({
      id: row.id,
      strategyType: row.strategy_type,
      underlyingListingKey: row.underlying_listing_key,
      underlyingSymbol: row.underlying_symbol,
      expiresOn: row.expires_on,
      contracts: Number(row.contracts),
      netDebitPerShare: toNumber(row.net_debit_per_share),
      collateralAmount: toNumber(row.collateral_amount),
      maxProfit: row.max_profit === null ? null : toNumber(row.max_profit),
      maxLoss: toNumber(row.max_loss),
      breakEvenPrice: toNumber(row.break_even_price),
      profitPotential: row.profit_potential,
      lifecycleStatus: row.lifecycle_status,
      realizedPnl: row.realized_pnl === null ? null : toNumber(row.realized_pnl),
      legCount: Number(row.leg_count),
      protectedShortLegCount: Number(row.protected_short_leg_count),
      openedAt: row.opened_at,
    })),
    latestReconciliation: reconciliation.data ? {
      status: reconciliation.data.status,
      issues: Number(reconciliation.data.unbalanced_journals) + Number(reconciliation.data.uncovered_short_legs) + Number(reconciliation.data.risk_boundary_exceptions) + Number(reconciliation.data.cash_mismatches),
      reconciledAt: reconciliation.data.reconciled_at,
    } : null,
  }
}

async function manageOptionsPaper(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('manage-options-paper', { body })
  if (error) return throwFunctionError(error)
  return data?.result
}

export const initializeOptionsPaperAccount = (input: {
  portfolioId: string; startingCash: number; experienceLevel: string
  objective: string; lossTolerance: string; jurisdictionCode: string
}) => manageOptionsPaper({ action: 'initialize', ...input })

export const createOptionsPaperStrategy = (input: {
  portfolioId: string; clientStrategyId: string; strategyType: OptionsStrategyType
  longContractId: number; shortContractId: number | null; contracts: number
}) => manageOptionsPaper({ action: 'create_strategy', ...input })

export const simulateOptionsPaperEvent = (input: {
  portfolioId: string; strategyId: string; clientEventId: string
  eventType: OptionsEventType; settlementPrice: number | null
}) => manageOptionsPaper({ action: 'simulate_event', ...input })

export const reconcileOptionsPaperPortfolio = (portfolioId: string) =>
  manageOptionsPaper({ action: 'reconcile', portfolioId })
