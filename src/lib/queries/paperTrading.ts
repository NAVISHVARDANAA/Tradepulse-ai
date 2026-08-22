import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function toNumber(value: NumericValue) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

async function throwFunctionError(error: unknown): Promise<never> {
  const context = (error as { context?: unknown })?.context

  if (context instanceof Response) {
    let payload: { error?: string } | null = null

    try {
      payload = (await context.clone().json()) as { error?: string }
    } catch {
      // Fall back to the original Functions client error for non-JSON responses.
    }

    if (payload?.error) {
      throw new Error(payload.error)
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

export type PaperPortfolioSnapshot = {
  cashBalance: number
  availableBalance: number
  currency: string
  positions: PaperPosition[]
  orders: PaperOrder[]
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
  const [cashResult, positionsResult, ordersResult, limitsResult] =
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
    ])

  const firstError = [
    cashResult.error,
    positionsResult.error,
    ordersResult.error,
    limitsResult.error,
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
