import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function toNumber(value: NumericValue) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context

  if (context instanceof Response) {
    let payload: { error?: string; requestId?: string } | null = null

    try {
      payload = (await context.clone().json()) as { error?: string; requestId?: string }
    } catch {
      // Fall back to the original Functions client error for non-JSON responses.
    }

    if (payload?.error) {
      const reference = payload.requestId?.slice(0, 8)
      throw new Error(`${payload.error}${reference ? ` Reference: ${reference}` : ''}`)
    }
  }

  throw error instanceof Error
    ? error
    : new Error('The server request could not be completed.')
}

export type PaperInstrument = {
  id: number
  marketAssetId: number
  symbol: string
  name: string
  assetClass: string
  quoteCurrency: string
}

export type PaperPortfolio = {
  id: string
  name: string
  baseCurrency: string
  createdAt: string
}

export type PaperPosition = {
  instrumentId: number
  symbol: string
  name: string
  quantity: number
  averageCost: number
  realizedPnl: number
}

export type PaperOrder = {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  status: string
  averageFillPrice: number | null
  totalFees: number
  submittedAt: string
}

export type PaperDecisionJournalEntry = {
  id: string
  orderId: string
  symbol: string
  instrumentName: string
  side: 'buy' | 'sell'
  quantity: number
  orderStatus: string
  thesis: string
  conviction: number
  plannedHorizonHours: number
  entryPrice: number
  forecastDirection: 'up' | 'down' | 'flat' | null
  forecastPredictedPrice: number | null
  forecastConfidence: number | null
  forecastModel: string | null
  researchScore: number | null
  researchClassification: string | null
  researchRiskFlags: string[]
  dueAt: string
  evaluationStatus: 'pending' | 'evaluated' | 'insufficient_data'
  outcomePrice: number | null
  decisionReturnPercent: number | null
  forecastErrorPercent: number | null
  forecastDirectionCorrect: boolean | null
  submittedAt: string
}

export type PaperDecisionScorecard = {
  totalDecisions: number
  completedDecisions: number
  insufficientDataDecisions: number
  forecastDirectionalAccuracyPercent: number | null
  profitableDecisionRatePercent: number | null
  averageDecisionReturnPercent: number | null
  averageForecastErrorPercent: number | null
  lastEvaluatedAt: string | null
}

export type PaperPortfolioSnapshot = {
  cashBalance: number
  availableBalance: number
  currency: string
  positions: PaperPosition[]
  orders: PaperOrder[]
  decisionJournal: PaperDecisionJournalEntry[]
  decisionScorecard: PaperDecisionScorecard | null
  riskLimits: {
    maxOrderNotional: number
    maxPositionNotional: number
    dailyLossLimit: number
    ruleVersion: string
  } | null
}

export async function getPaperInstruments(): Promise<PaperInstrument[]> {
  const { data, error } = await supabase
    .from('investment_instruments')
    .select(`
      id,
      market_asset_id,
      display_symbol,
      name,
      asset_class,
      quote_currency
    `)
    .eq('paper_trading_enabled', true)
    .not('market_asset_id', 'is', null)
    .order('display_symbol')

  if (error) {
    return throwFunctionError(error)
  }

  return data.map((row) => ({
    id: row.id,
    marketAssetId: row.market_asset_id,
    symbol: row.display_symbol,
    name: row.name,
    assetClass: row.asset_class,
    quoteCurrency: row.quote_currency,
  }))
}

export async function getPaperPortfolios(): Promise<PaperPortfolio[]> {
  const { data, error } = await supabase
    .from('investment_portfolios')
    .select('id, name, base_currency, created_at')
    .eq('portfolio_type', 'paper')
    .order('created_at')

  if (error) {
    return throwFunctionError(error)
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    baseCurrency: row.base_currency,
    createdAt: row.created_at,
  }))
}

export async function getPaperPortfolioSnapshot(
  portfolioId: string,
): Promise<PaperPortfolioSnapshot> {
  const [
    cashResult,
    positionsResult,
    ordersResult,
    limitsResult,
    decisionJournalResult,
    decisionScorecardResult,
  ] =
    await Promise.all([
      supabase
        .from('paper_cash_balances')
        .select('currency, balance, available_balance')
        .eq('portfolio_id', portfolioId)
        .maybeSingle(),
      supabase
        .from('paper_positions')
        .select(`
          instrument_id,
          quantity,
          average_cost,
          realized_pnl,
          investment_instruments!inner (
            display_symbol,
            name
          )
        `)
        .eq('portfolio_id', portfolioId)
        .neq('quantity', 0)
        .order('updated_at', { ascending: false }),
      supabase
        .from('paper_orders')
        .select(`
          id,
          side,
          quantity,
          status,
          average_fill_price,
          total_fees,
          submitted_at,
          investment_instruments!inner (
            display_symbol
          )
        `)
        .eq('portfolio_id', portfolioId)
        .order('submitted_at', { ascending: false })
        .limit(12),
      supabase
        .from('portfolio_risk_limits')
        .select(`
          max_order_notional,
          max_position_notional,
          daily_loss_limit,
          rule_version
        `)
        .eq('portfolio_id', portfolioId)
        .maybeSingle(),
      supabase
        .from('paper_decision_journal')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .order('submitted_at', { ascending: false })
        .limit(8),
      supabase
        .from('paper_decision_scorecard')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .maybeSingle(),
    ])

  const firstError = [
    cashResult.error,
    positionsResult.error,
    ordersResult.error,
    limitsResult.error,
    decisionJournalResult.error,
    decisionScorecardResult.error,
  ].find(Boolean)

  if (firstError) {
    throw firstError
  }

  const cash = cashResult.data

  return {
    cashBalance: toNumber(cash?.balance ?? null),
    availableBalance: toNumber(cash?.available_balance ?? null),
    currency: cash?.currency ?? 'USD',
    positions: (positionsResult.data ?? []).map((row) => {
      const instrument = Array.isArray(row.investment_instruments)
        ? row.investment_instruments[0]
        : row.investment_instruments

      return {
        instrumentId: row.instrument_id,
        symbol: instrument?.display_symbol ?? '—',
        name: instrument?.name ?? 'Unknown instrument',
        quantity: toNumber(row.quantity),
        averageCost: toNumber(row.average_cost),
        realizedPnl: toNumber(row.realized_pnl),
      }
    }),
    orders: (ordersResult.data ?? []).map((row) => {
      const instrument = Array.isArray(row.investment_instruments)
        ? row.investment_instruments[0]
        : row.investment_instruments

      return {
        id: row.id,
        symbol: instrument?.display_symbol ?? '—',
        side: row.side as PaperOrder['side'],
        quantity: toNumber(row.quantity),
        status: row.status,
        averageFillPrice:
          row.average_fill_price === null
            ? null
            : toNumber(row.average_fill_price),
        totalFees: toNumber(row.total_fees),
        submittedAt: row.submitted_at,
      }
    }),
    decisionJournal: (decisionJournalResult.data ?? []).map((row) => ({
      id: row.id,
      orderId: row.order_id,
      symbol: row.symbol,
      instrumentName: row.instrument_name,
      side: row.side as PaperDecisionJournalEntry['side'],
      quantity: toNumber(row.quantity),
      orderStatus: row.order_status,
      thesis: row.thesis,
      conviction: Number(row.conviction),
      plannedHorizonHours: Number(row.planned_horizon_hours),
      entryPrice: toNumber(row.entry_price),
      forecastDirection: row.forecast_direction as PaperDecisionJournalEntry['forecastDirection'],
      forecastPredictedPrice:
        row.forecast_predicted_price === null
          ? null
          : toNumber(row.forecast_predicted_price),
      forecastConfidence:
        row.forecast_confidence === null
          ? null
          : toNumber(row.forecast_confidence),
      forecastModel:
        row.forecast_model_name && row.forecast_model_version
          ? `${row.forecast_model_name} v${row.forecast_model_version}`
          : null,
      researchScore:
        row.research_score === null ? null : toNumber(row.research_score),
      researchClassification: row.research_classification,
      researchRiskFlags: Array.isArray(row.research_risk_flags)
        ? row.research_risk_flags.filter(
            (item: unknown): item is string => typeof item === 'string',
          )
        : [],
      dueAt: row.due_at,
      evaluationStatus: row.evaluation_status as PaperDecisionJournalEntry['evaluationStatus'],
      outcomePrice:
        row.outcome_price === null ? null : toNumber(row.outcome_price),
      decisionReturnPercent:
        row.decision_return_percent === null
          ? null
          : toNumber(row.decision_return_percent),
      forecastErrorPercent:
        row.forecast_error_percent === null
          ? null
          : toNumber(row.forecast_error_percent),
      forecastDirectionCorrect: row.forecast_direction_correct,
      submittedAt: row.submitted_at,
    })),
    decisionScorecard: decisionScorecardResult.data
      ? {
          totalDecisions: Number(decisionScorecardResult.data.total_decisions),
          completedDecisions: Number(
            decisionScorecardResult.data.completed_decisions,
          ),
          insufficientDataDecisions: Number(
            decisionScorecardResult.data.insufficient_data_decisions,
          ),
          forecastDirectionalAccuracyPercent:
            decisionScorecardResult.data.forecast_directional_accuracy_percent === null
              ? null
              : toNumber(
                  decisionScorecardResult.data
                    .forecast_directional_accuracy_percent,
                ),
          profitableDecisionRatePercent:
            decisionScorecardResult.data.profitable_decision_rate_percent === null
              ? null
              : toNumber(
                  decisionScorecardResult.data
                    .profitable_decision_rate_percent,
                ),
          averageDecisionReturnPercent:
            decisionScorecardResult.data.average_decision_return_percent === null
              ? null
              : toNumber(
                  decisionScorecardResult.data.average_decision_return_percent,
                ),
          averageForecastErrorPercent:
            decisionScorecardResult.data.average_forecast_error_percent === null
              ? null
              : toNumber(
                  decisionScorecardResult.data.average_forecast_error_percent,
                ),
          lastEvaluatedAt: decisionScorecardResult.data.last_evaluated_at,
        }
      : null,
    riskLimits: limitsResult.data
      ? {
          maxOrderNotional: toNumber(
            limitsResult.data.max_order_notional,
          ),
          maxPositionNotional: toNumber(
            limitsResult.data.max_position_notional,
          ),
          dailyLossLimit: toNumber(limitsResult.data.daily_loss_limit),
          ruleVersion: limitsResult.data.rule_version,
        }
      : null,
  }
}

export async function createPaperPortfolio(input: {
  name: string
  baseCurrency: string
  startingBalance: number
}) {
  const { data, error } = await supabase.functions.invoke(
    'create-paper-portfolio',
    { body: input },
  )

  if (error) {
    return throwFunctionError(error)
  }

  return data
}

export async function submitPaperOrder(input: {
  portfolioId: string
  instrumentId: number
  side: 'buy' | 'sell'
  quantity: number
  clientOrderId: string
  thesis: string
  conviction: number
  plannedHorizonHours: number
}) {
  const { data, error } = await supabase.functions.invoke(
    'submit-paper-order',
    { body: input },
  )

  if (error) {
    return throwFunctionError(error)
  }

  return data
}
