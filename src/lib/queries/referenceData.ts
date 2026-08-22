import type {
  CountryTradeSnapshot,
  MarketAssetSnapshot,
  MarketForecast,
  PaymentCorridor,
  TradeDashboard,
  TradeKpi,
  TradeTrendPoint,
} from '../../types/domain'
import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function toNumber(value: NumericValue) {
  if (value === null) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function formatCompactUsd(value: number | null) {
  if (value === null) {
    return '—'
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function calculateGrowth(current: number, previous?: number) {
  if (!previous) {
    return null
  }

  return ((current - previous) / Math.abs(previous)) * 100
}

function formatGrowth(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

function growthTone(value: number | null): TradeKpi['tone'] {
  if (value === null) {
    return 'neutral'
  }

  return value >= 0 ? 'positive' : 'negative'
}

export async function getCountries() {
  const { data, error } = await supabase
    .from('countries')
    .select('id, iso_code, name, region')
    .order('name')

  if (error) {
    throw error
  }

  return data
}

export async function getMarketAssets(): Promise<MarketAssetSnapshot[]> {
  const { data, error } = await supabase
    .from('market_assets')
    .select(`
      id,
      symbol,
      name,
      asset_type,
      currency,
      market_observations (
        observed_at,
        price,
        change_percent,
        source
      )
    `)
    .order('symbol')
    .order('observed_at', {
      referencedTable: 'market_observations',
      ascending: false,
    })
    .limit(1, { referencedTable: 'market_observations' })

  if (error) {
    throw error
  }

  return data.map((asset) => {
    const latest = asset.market_observations?.[0]

    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      asset_type: asset.asset_type,
      currency: asset.currency,
      price: toNumber(latest?.price ?? null),
      change_percent: toNumber(latest?.change_percent ?? null),
      source: latest?.source ?? null,
      observed_at: latest?.observed_at ?? null,
    }
  })
}

export async function getTradeDashboard(): Promise<TradeDashboard> {
  const { data, error } = await supabase
    .from('trade_observations')
    .select(`
      period_date,
      exports_usd,
      imports_usd,
      trade_balance_usd,
      countries!inner (
        iso_code,
        name
      )
    `)
    .order('period_date', { ascending: false })
    .limit(240)

  if (error) {
    throw error
  }

  const countryHistory = new Map<
    string,
    Array<{
      isoCode: string
      country: string
      periodDate: string
      exports: number
      imports: number
      balance: number
    }>
  >()
  const periodTotals = new Map<
    string,
    { exports: number; imports: number; balance: number }
  >()

  for (const row of data) {
    const countryRelation = Array.isArray(row.countries)
      ? row.countries[0]
      : row.countries
    const exports = toNumber(row.exports_usd) ?? 0
    const imports = toNumber(row.imports_usd) ?? 0
    const balance =
      toNumber(row.trade_balance_usd) ?? exports - imports

    if (!countryRelation) {
      continue
    }

    const history = countryHistory.get(countryRelation.iso_code) ?? []
    history.push({
      isoCode: countryRelation.iso_code,
      country: countryRelation.name,
      periodDate: row.period_date,
      exports,
      imports,
      balance,
    })
    countryHistory.set(countryRelation.iso_code, history)

    const total = periodTotals.get(row.period_date) ?? {
      exports: 0,
      imports: 0,
      balance: 0,
    }
    total.exports += exports
    total.imports += imports
    total.balance += balance
    periodTotals.set(row.period_date, total)
  }

  const countries: CountryTradeSnapshot[] = Array.from(
    countryHistory.values(),
  )
    .map((history) => {
      const sorted = history.sort((a, b) =>
        b.periodDate.localeCompare(a.periodDate),
      )
      const latest = sorted[0]
      const previous = sorted[1]

      return {
        isoCode: latest.isoCode,
        country: latest.country,
        exports: latest.exports,
        imports: latest.imports,
        balance: latest.balance,
        growthPercent: calculateGrowth(
          latest.exports + latest.imports,
          previous ? previous.exports + previous.imports : undefined,
        ),
        periodDate: latest.periodDate,
      }
    })
    .sort(
      (a, b) => b.exports + b.imports - (a.exports + a.imports),
    )
    .slice(0, 8)

  const trend: TradeTrendPoint[] = Array.from(periodTotals.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([period, value]) => ({
      period: new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: '2-digit',
        timeZone: 'UTC',
      }).format(new Date(`${period}T00:00:00Z`)),
      exports: Math.round(value.exports / 1_000_000_000),
      imports: Math.round(value.imports / 1_000_000_000),
      balance: Math.round(value.balance / 1_000_000_000),
    }))

  const sortedPeriods = Array.from(periodTotals.entries()).sort(([a], [b]) =>
    b.localeCompare(a),
  )
  const latestPeriod = sortedPeriods[0]
  const previousPeriod = sortedPeriods[1]
  const latest = latestPeriod?.[1]
  const previous = previousPeriod?.[1]
  const exportGrowth =
    latest && previous
      ? calculateGrowth(latest.exports, previous.exports)
      : null
  const importGrowth =
    latest && previous
      ? calculateGrowth(latest.imports, previous.imports)
      : null
  const balanceChange =
    latest && previous ? latest.balance - previous.balance : null

  const kpis: TradeKpi[] = [
    {
      label: 'Tracked trade volume',
      value: formatCompactUsd(
        latest ? latest.exports + latest.imports : null,
      ),
      change:
        latest && previous
          ? formatGrowth(
              calculateGrowth(
                latest.exports + latest.imports,
                previous.exports + previous.imports,
              ),
            )
          : '—',
      note: latestPeriod ? `for ${latestPeriod[0]}` : 'Awaiting trade data',
      tone:
        latest && previous
          ? growthTone(
              calculateGrowth(
                latest.exports + latest.imports,
                previous.exports + previous.imports,
              ),
            )
          : 'neutral',
    },
    {
      label: 'Export growth',
      value: formatGrowth(exportGrowth),
      change: 'period over period',
      note: 'across tracked countries',
      tone: growthTone(exportGrowth),
    },
    {
      label: 'Import growth',
      value: formatGrowth(importGrowth),
      change: 'period over period',
      note: 'across tracked countries',
      tone: growthTone(importGrowth),
    },
    {
      label: 'Trade balance',
      value: formatCompactUsd(latest?.balance ?? null),
      change:
        balanceChange === null ? '—' : formatCompactUsd(balanceChange),
      note: 'exports minus imports',
      tone: growthTone(balanceChange),
    },
  ]

  return { kpis, trend, countries }
}

export async function getLatestForecasts(): Promise<MarketForecast[]> {
  const { data, error } = await supabase
    .from('market_forecasts')
    .select(`
      id,
      horizon_hours,
      predicted_price,
      lower_bound,
      upper_bound,
      confidence_score,
      direction,
      model_name,
      generated_at,
      target_at,
      market_assets!inner (
        symbol,
        name
      )
    `)
    .eq('is_latest', true)
    .order('generated_at', { ascending: false })
    .limit(12)

  if (error) {
    throw error
  }

  return data.flatMap((row) => {
    const asset = Array.isArray(row.market_assets)
      ? row.market_assets[0]
      : row.market_assets
    const predictedPrice = toNumber(row.predicted_price)

    if (!asset || predictedPrice === null) {
      return []
    }

    return [
      {
        id: row.id,
        symbol: asset.symbol,
        assetName: asset.name,
        horizonHours: row.horizon_hours,
        predictedPrice,
        lowerBound: toNumber(row.lower_bound),
        upperBound: toNumber(row.upper_bound),
        confidence: toNumber(row.confidence_score),
        direction: row.direction as MarketForecast['direction'],
        modelName: row.model_name,
        generatedAt: row.generated_at,
        targetAt: row.target_at,
      },
    ]
  })
}

export async function getPaymentCorridors(): Promise<PaymentCorridor[]> {
  const { data, error } = await supabase
    .from('payment_corridors')
    .select(`
      id,
      code,
      source_currency,
      destination_currency,
      fx_symbol,
      rate_operation,
      spread_bps,
      variable_fee_bps,
      fixed_fee,
      minimum_fee,
      settlement_minutes
    `)
    .eq('enabled', true)
    .order('code')

  if (error) {
    throw error
  }

  return data.map((row) => ({
    id: row.id,
    code: row.code,
    sourceCurrency: row.source_currency,
    destinationCurrency: row.destination_currency,
    fxSymbol: row.fx_symbol,
    rateOperation: row.rate_operation as PaymentCorridor['rateOperation'],
    spreadBps: Number(row.spread_bps),
    variableFeeBps: Number(row.variable_fee_bps),
    fixedFee: Number(row.fixed_fee),
    minimumFee: Number(row.minimum_fee),
    settlementMinutes: row.settlement_minutes,
  }))
}
