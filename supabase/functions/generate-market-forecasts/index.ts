import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type Observation = {
  observed_at: string
  price: number | string
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function buildForecast(observations: Observation[]) {
  const prices = observations
    .map((item) => Number(item.price))
    .filter((price) => Number.isFinite(price) && price > 0)

  if (prices.length < 5) {
    return null
  }

  const count = prices.length
  const xMean = (count - 1) / 2
  const yMean = prices.reduce((sum, price) => sum + price, 0) / count
  let numerator = 0
  let denominator = 0
  let totalVariance = 0
  let residualVariance = 0

  for (let index = 0; index < count; index += 1) {
    numerator += (index - xMean) * (prices[index] - yMean)
    denominator += (index - xMean) ** 2
  }

  const slope = denominator === 0 ? 0 : numerator / denominator
  const intercept = yMean - slope * xMean
  const linearNext = intercept + slope * count

  for (let index = 0; index < count; index += 1) {
    const fitted = intercept + slope * index
    totalVariance += (prices[index] - yMean) ** 2
    residualVariance += (prices[index] - fitted) ** 2
  }

  const rSquared =
    totalVariance === 0 ? 0 : clamp(1 - residualVariance / totalVariance, 0, 1)
  let ewma = prices[0]

  for (const price of prices.slice(1)) {
    ewma = 0.35 * price + 0.65 * ewma
  }

  const predictedPrice = Math.max(0, 0.65 * linearNext + 0.35 * ewma)
  const returns = prices.slice(1).map((price, index) =>
    Math.log(price / prices[index]),
  )
  const meanReturn =
    returns.reduce((sum, value) => sum + value, 0) / returns.length
  const volatility = Math.sqrt(
    returns.reduce((sum, value) => sum + (value - meanReturn) ** 2, 0) /
      Math.max(1, returns.length - 1),
  )
  const uncertainty = predictedPrice * Math.max(0.0025, volatility * 1.96)
  const latestPrice = prices[count - 1]
  const changePercent = ((predictedPrice - latestPrice) / latestPrice) * 100
  const direction =
    changePercent > 0.15 ? 'up' : changePercent < -0.15 ? 'down' : 'flat'
  const confidence = clamp(
    0.25 + rSquared * 0.55 - Math.min(volatility * 4, 0.2),
    0.1,
    0.85,
  )

  return {
    predictedPrice,
    lowerBound: Math.max(0, predictedPrice - uncertainty),
    upperBound: predictedPrice + uncertainty,
    confidence,
    direction,
    featureSnapshot: {
      observations: count,
      lastPrice: latestPrice,
      trendSlope: slope,
      ewma,
      volatility,
      rSquared,
    },
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
  const modelName = 'trend-ewma-baseline'
  const { data: run, error: runError } = await admin
    .from('forecast_runs')
    .insert({
      model_name: modelName,
      model_version: '1.0.0',
      status: 'running',
      training_window: 60,
    })
    .select('id')
    .single()

  if (runError || !run) {
    return jsonResponse({ error: 'Unable to create forecast run' }, 500)
  }

  try {
    const { data: assets, error: assetError } = await admin
      .from('market_assets')
      .select('id, symbol')

    if (assetError) {
      throw assetError
    }

    const generatedAt = new Date()
    const targetAt = new Date(generatedAt.getTime() + 24 * 60 * 60 * 1000)
    const rows = []
    let skipped = 0

    for (const asset of assets) {
      const { data: observations, error: observationError } = await admin
        .from('market_observations')
        .select('observed_at, price')
        .eq('asset_id', asset.id)
        .not('price', 'is', null)
        .order('observed_at', { ascending: false })
        .limit(60)

      if (observationError) {
        throw observationError
      }

      const forecast = buildForecast([...observations].reverse())

      if (!forecast) {
        skipped += 1
        continue
      }

      await admin
        .from('market_forecasts')
        .update({ is_latest: false })
        .eq('asset_id', asset.id)
        .eq('horizon_hours', 24)
        .eq('is_latest', true)

      rows.push({
        forecast_run_id: run.id,
        asset_id: asset.id,
        model_name: modelName,
        horizon_hours: 24,
        generated_at: generatedAt.toISOString(),
        target_at: targetAt.toISOString(),
        predicted_price: forecast.predictedPrice,
        lower_bound: forecast.lowerBound,
        upper_bound: forecast.upperBound,
        confidence_score: forecast.confidence,
        direction: forecast.direction,
        is_latest: true,
        feature_snapshot: forecast.featureSnapshot,
      })
    }

    if (rows.length > 0) {
      const { error: forecastError } = await admin
        .from('market_forecasts')
        .insert(rows)

      if (forecastError) {
        throw forecastError
      }
    }

    await admin
      .from('forecast_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        metrics: { generated: rows.length, skipped },
      })
      .eq('id', run.id)

    return jsonResponse({ generated: rows.length, skipped })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown model error'

    await admin
      .from('forecast_runs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_summary: message.slice(0, 1000),
      })
      .eq('id', run.id)

    return jsonResponse({ error: 'Forecast generation failed' }, 500)
  }
})
