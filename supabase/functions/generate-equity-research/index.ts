import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type NumericValue = number | string | null

type Observation = {
  observed_at: string
  price: NumericValue
}

type Forecast = {
  predicted_price: NumericValue
  confidence_score: NumericValue
  baseline_mae: NumericValue
  model_mae: NumericValue
  generated_at: string
  reliability_status: 'insufficient_evidence' | 'qualified' | 'watch'
  reliability_evaluation_count: number
}

type Fundamentals = {
  revenue: NumericValue
  net_income: NumericValue
  operating_cash_flow: NumericValue
  pe_ratio: NumericValue
  price_to_book: NumericValue
  period_end: string
}

const METHODOLOGY_VERSION = 'equity-research-v1.0.0'

function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, value))
}

function numberOrNull(value: NumericValue | undefined) {
  if (value === null || value === undefined) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function standardDeviation(values: number[]) {
  if (values.length < 2) {
    return 0
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance = values.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0,
  ) / (values.length - 1)

  return Math.sqrt(variance)
}

function daysSince(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  return Math.max(
    0,
    (Date.now() - new Date(value).getTime()) / (24 * 60 * 60 * 1000),
  )
}

function scoreSecurity(
  observations: Observation[],
  forecast: Forecast | null,
  fundamentals: Fundamentals | null,
) {
  const clean = observations
    .map((row) => ({
      observedAt: row.observed_at,
      price: numberOrNull(row.price),
    }))
    .filter((row): row is { observedAt: string; price: number } =>
      row.price !== null && row.price > 0
    )
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt))
  const latest = clean.at(-1)
  const reasons: string[] = []
  const riskFlags: string[] = []

  if (!latest || clean.length < 20) {
    return {
      score: 50,
      classification: 'insufficient_data',
      confidence: 0.1,
      forecastScore: 50,
      momentumScore: 50,
      qualityScore: 50,
      valuationScore: 50,
      riskScore: 35,
      dataQualityScore: clamp(clean.length / 20 * 40),
      reasons: ['At least 20 verified daily observations are required.'],
      riskFlags: ['Insufficient price history for a research classification.'],
      asOfTime: latest?.observedAt ?? new Date().toISOString(),
    }
  }

  const lookback = clean[Math.max(0, clean.length - 21)]
  const momentumReturn = latest.price / lookback.price - 1
  const momentumScore = clamp(50 + momentumReturn * 200)
  reasons.push(
    `Twenty-session price momentum is ${(momentumReturn * 100).toFixed(1)}%.`,
  )

  const returns = clean.slice(-61).slice(1).map((row, index) =>
    Math.log(row.price / clean.slice(-61)[index].price)
  )
  const annualizedVolatility = standardDeviation(returns) * Math.sqrt(252)
  const riskScore = clamp(100 - annualizedVolatility * 160)

  if (annualizedVolatility > 0.45) {
    riskFlags.push('Recent annualized volatility is elevated.')
  }

  let forecastScore = 50
  const forecastPrice = numberOrNull(forecast?.predicted_price)
  const forecastConfidence = numberOrNull(forecast?.confidence_score)
  const baselineMae = numberOrNull(forecast?.baseline_mae)
  const modelMae = numberOrNull(forecast?.model_mae)

  if (forecast && forecastPrice && forecastConfidence !== null) {
    const expectedReturn = forecastPrice / latest.price - 1
    const validationLift = baselineMae && modelMae !== null
      ? clamp((1 - modelMae / baselineMae) * 100, 0, 100)
      : 0
    forecastScore = clamp(
      50 + expectedReturn * 180 * forecastConfidence + validationLift * 0.15,
    )
    reasons.push(
      `Display-qualified model outlook is ${(expectedReturn * 100).toFixed(1)}% with ${Math.round(forecastConfidence * 100)}% confidence.`,
    )
    if (forecast.reliability_status === 'watch') {
      riskFlags.push(
        `Forecast production reliability is on watch after ${forecast.reliability_evaluation_count} evaluated outcomes.`,
      )
    } else if (forecast.reliability_status === 'insufficient_evidence') {
      riskFlags.push(
        `Forecast production reliability is provisional after ${forecast.reliability_evaluation_count} evaluated outcomes.`,
      )
    }
  } else {
    riskFlags.push('No display-qualified forecast is available.')
  }

  let qualityScore = 50
  let valuationScore = 50
  const revenue = numberOrNull(fundamentals?.revenue)
  const netIncome = numberOrNull(fundamentals?.net_income)
  const operatingCashFlow = numberOrNull(fundamentals?.operating_cash_flow)
  const peRatio = numberOrNull(fundamentals?.pe_ratio)
  const priceToBook = numberOrNull(fundamentals?.price_to_book)

  if (revenue && revenue > 0 && netIncome !== null) {
    const netMargin = netIncome / revenue
    qualityScore = clamp(50 + netMargin * 125)

    if (operatingCashFlow !== null && netIncome > 0) {
      qualityScore = clamp(
        qualityScore + clamp(operatingCashFlow / netIncome, 0, 2) * 7.5,
      )
    }

    reasons.push(`Latest reported net margin is ${(netMargin * 100).toFixed(1)}%.`)
  } else {
    riskFlags.push('Licensed profitability data is not available.')
  }

  if (peRatio !== null) {
    valuationScore = peRatio <= 0
      ? 25
      : clamp(90 - Math.abs(peRatio - 15) * 2.2)

    if (priceToBook !== null && priceToBook > 0) {
      valuationScore = clamp(
        valuationScore * 0.75 + clamp(90 - Math.abs(priceToBook - 2) * 10) * 0.25,
      )
    }

    reasons.push(`Latest licensed price/earnings ratio is ${peRatio.toFixed(1)}.`)
  } else {
    riskFlags.push('Licensed valuation ratios are not available.')
  }

  const observationFreshness = daysSince(latest.observedAt)
  const forecastFreshness = daysSince(forecast?.generated_at ?? null)
  let dataQualityScore = clamp(clean.length / 120 * 45, 0, 45)
  dataQualityScore += observationFreshness <= 4 ? 25 : observationFreshness <= 10 ? 12 : 0
  dataQualityScore += forecast ? (forecastFreshness <= 4 ? 20 : 10) : 0
  dataQualityScore += fundamentals ? 10 : 0
  dataQualityScore = clamp(dataQualityScore)

  if (observationFreshness > 4) {
    riskFlags.push('The latest verified price is stale.')
  }

  const score = clamp(
    forecastScore * 0.25 +
      momentumScore * 0.2 +
      qualityScore * 0.2 +
      valuationScore * 0.1 +
      riskScore * 0.15 +
      dataQualityScore * 0.1,
  )
  const classification = score >= 65
    ? 'research_positive'
    : score < 40
      ? 'research_cautious'
      : 'research_neutral'
  const componentAvailability = [forecast, fundamentals].filter(Boolean).length
  const confidence = clamp(
    dataQualityScore * 0.006 + componentAvailability * 0.12,
    10,
    90,
  ) / 100

  return {
    score,
    classification,
    confidence,
    forecastScore,
    momentumScore,
    qualityScore,
    valuationScore,
    riskScore,
    dataQualityScore,
    reasons,
    riskFlags,
    asOfTime: latest.observedAt,
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const expectedSecret = Deno.env.get('SYNC_SECRET')

  if (!expectedSecret || request.headers.get('x-sync-secret') !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const { data: securities, error: securitiesError } = await admin
    .from('equity_securities')
    .select('id, market_asset_id, display_symbol')
    .eq('research_enabled', true)
    .eq('active', true)
    .limit(500)

  if (securitiesError) {
    return jsonResponse({ error: 'Unable to load equity coverage' }, 500)
  }

  let published = 0
  let insufficient = 0

  try {
    for (const security of securities ?? []) {
      const [observationResult, forecastResult, fundamentalResult] =
        await Promise.all([
          admin
            .from('market_observations')
            .select('observed_at, price')
            .eq('asset_id', security.market_asset_id)
            .not('price', 'is', null)
            .order('observed_at', { ascending: false })
            .limit(180),
          admin
            .from('display_qualified_market_forecasts')
            .select('predicted_price, confidence_score, baseline_mae, model_mae, generated_at, reliability_status, reliability_evaluation_count')
            .eq('asset_id', security.market_asset_id)
            .order('generated_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          admin
            .from('equity_fundamental_snapshots')
            .select('revenue, net_income, operating_cash_flow, pe_ratio, price_to_book, period_end')
            .eq('security_id', security.id)
            .eq('display_allowed', true)
            .order('period_end', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])

      if (observationResult.error || forecastResult.error || fundamentalResult.error) {
        throw observationResult.error ?? forecastResult.error ?? fundamentalResult.error
      }

      const scored = scoreSecurity(
        [...(observationResult.data ?? [])].reverse(),
        forecastResult.data as Forecast | null,
        fundamentalResult.data as Fundamentals | null,
      )

      await admin
        .from('equity_research_scores')
        .update({ is_latest: false })
        .eq('security_id', security.id)
        .eq('is_latest', true)

      const { error: writeError } = await admin
        .from('equity_research_scores')
        .insert({
          security_id: security.id,
          as_of_time: scored.asOfTime,
          score: scored.score,
          classification: scored.classification,
          confidence: scored.confidence,
          forecast_score: scored.forecastScore,
          momentum_score: scored.momentumScore,
          quality_score: scored.qualityScore,
          valuation_score: scored.valuationScore,
          risk_score: scored.riskScore,
          data_quality_score: scored.dataQualityScore,
          methodology_version: METHODOLOGY_VERSION,
          reasons: scored.reasons,
          risk_flags: scored.riskFlags,
          status: 'published',
          is_latest: true,
        })

      if (writeError) {
        throw writeError
      }

      published += 1
      if (scored.classification === 'insufficient_data') {
        insufficient += 1
      }
    }

    return jsonResponse({
      status: 'completed',
      methodologyVersion: METHODOLOGY_VERSION,
      published,
      insufficient,
    })
  } catch {
    return jsonResponse({ error: 'Equity research generation failed' }, 500)
  }
})
