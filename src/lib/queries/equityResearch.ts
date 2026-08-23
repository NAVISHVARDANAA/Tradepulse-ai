import type {
  EquityPricePoint,
  EquityResearchClassification,
  EquityResearchSnapshot,
  MarketForecast,
} from '../../types/domain'
import { supabase } from '../supabase/client'

type NumericValue = number | string | null

function toNumber(value: NumericValue | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

export async function getGlobalEquityResearch(): Promise<
  EquityResearchSnapshot[]
> {
  const { data, error } = await supabase
    .from('equity_research_dashboard')
    .select('*')
    .order('research_score', { ascending: false, nullsFirst: false })
    .order('display_symbol')
    .limit(500)

  if (error) {
    throw error
  }

  return data.map((row) => {
    const predictedPrice = toNumber(row.predicted_price)
    const forecastId = toNumber(row.forecast_id)
    const forecast: MarketForecast | null =
      forecastId !== null && predictedPrice !== null
        ? {
            id: forecastId,
            symbol: row.display_symbol,
            assetName: row.company_name,
            horizonHours: row.horizon_hours,
            predictedPrice,
            lowerBound: toNumber(row.lower_bound),
            upperBound: toNumber(row.upper_bound),
            confidence: toNumber(row.forecast_confidence),
            direction: row.forecast_direction as MarketForecast['direction'],
            modelName: row.model_name,
            modelVersion: row.model_version,
            baselineMae: toNumber(row.baseline_mae),
            modelMae: toNumber(row.model_mae),
            directionalAccuracy: toNumber(row.directional_accuracy),
            generatedAt: row.forecast_generated_at,
            targetAt: row.forecast_target_at,
          }
        : null

    return {
      securityId: row.security_id,
      marketAssetId: row.market_asset_id,
      symbol: row.display_symbol,
      companyName: row.company_name,
      assetClass: row.asset_class as EquityResearchSnapshot['assetClass'],
      exchangeCode: row.exchange_code,
      exchangeName: row.exchange_name,
      countryCode: row.country_code,
      currency: row.quote_currency,
      sector: row.sector,
      industry: row.industry,
      providerName: row.provider_name,
      coverageStatus: row.coverage_status,
      delayMinutes: row.delay_minutes,
      licenseStatus: row.license_status,
      lastSynchronizedAt: row.last_synchronized_at,
      observedAt: row.observed_at,
      price: toNumber(row.price),
      changePercent: toNumber(row.change_percent),
      priceSource: row.price_source,
      forecast,
      researchScore: toNumber(row.research_score),
      researchClassification:
        row.research_classification as EquityResearchClassification | null,
      researchConfidence: toNumber(row.research_confidence),
      componentScores: {
        forecast: toNumber(row.forecast_score),
        momentum: toNumber(row.momentum_score),
        quality: toNumber(row.quality_score),
        valuation: toNumber(row.valuation_score),
        risk: toNumber(row.risk_score),
        dataQuality: toNumber(row.data_quality_score),
      },
      methodologyVersion: row.methodology_version,
      reasons: stringArray(row.reasons),
      riskFlags: stringArray(row.risk_flags),
      fundamentalPeriodEnd: row.fundamental_period_end,
      revenue: toNumber(row.revenue),
      netIncome: toNumber(row.net_income),
      dilutedEps: toNumber(row.diluted_eps),
      peRatio: toNumber(row.pe_ratio),
      priceToBook: toNumber(row.price_to_book),
      dividendYield: toNumber(row.dividend_yield),
    }
  })
}

export async function getEquityPriceHistory(
  marketAssetId: number,
): Promise<EquityPricePoint[]> {
  const { data, error } = await supabase
    .from('market_observations')
    .select('observed_at, price')
    .eq('asset_id', marketAssetId)
    .not('price', 'is', null)
    .order('observed_at', { ascending: false })
    .limit(180)

  if (error) {
    throw error
  }

  return data.flatMap((row) => {
    const price = toNumber(row.price)

    return price === null
      ? []
      : [{ observedAt: row.observed_at, price }]
  }).reverse()
}
