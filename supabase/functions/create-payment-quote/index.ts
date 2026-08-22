import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type QuoteRequest = {
  corridorCode?: string
  sourceAmount?: number
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return jsonResponse({ error: 'Authentication is required' }, 401)
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return jsonResponse({ error: 'Authentication is required' }, 401)
  }

  let input: QuoteRequest

  try {
    input = (await request.json()) as QuoteRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON request' }, 400)
  }

  const sourceAmount = Number(input.sourceAmount)

  if (
    !input.corridorCode ||
    !Number.isFinite(sourceAmount) ||
    sourceAmount <= 0 ||
    sourceAmount > 1_000_000
  ) {
    return jsonResponse({ error: 'Invalid corridor or source amount' }, 400)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const { data: corridor, error: corridorError } = await admin
    .from('payment_corridors')
    .select('*')
    .eq('code', input.corridorCode)
    .eq('enabled', true)
    .single()

  if (corridorError || !corridor) {
    return jsonResponse({ error: 'Payment corridor is not available' }, 404)
  }

  const { data: asset, error: assetError } = await admin
    .from('market_assets')
    .select('id')
    .eq('symbol', corridor.fx_symbol)
    .single()

  if (assetError || !asset) {
    return jsonResponse({ error: 'FX reference asset is not configured' }, 409)
  }

  const { data: observation, error: observationError } = await admin
    .from('market_observations')
    .select('price, observed_at')
    .eq('asset_id', asset.id)
    .not('price', 'is', null)
    .order('observed_at', { ascending: false })
    .limit(1)
    .single()

  const marketPrice = Number(observation?.price)

  if (observationError || !Number.isFinite(marketPrice) || marketPrice <= 0) {
    return jsonResponse({ error: 'A current FX reference rate is unavailable' }, 409)
  }

  const referenceRate =
    corridor.rate_operation === 'inverse' ? 1 / marketPrice : marketPrice
  const customerRate = referenceRate * (1 - Number(corridor.spread_bps) / 10_000)
  const variableFee = Math.max(
    Number(corridor.minimum_fee),
    sourceAmount * (Number(corridor.variable_fee_bps) / 10_000),
  )
  const fixedFee = Number(corridor.fixed_fee)
  const totalFee = variableFee + fixedFee
  const destinationAmount = Math.max(0, sourceAmount - totalFee) * customerRate
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
  const { data: quote, error: quoteError } = await admin
    .from('payment_quotes')
    .insert({
      user_id: user.id,
      corridor_id: corridor.id,
      source_amount: sourceAmount,
      reference_rate: referenceRate,
      customer_rate: customerRate,
      variable_fee: variableFee,
      fixed_fee: fixedFee,
      total_fee: totalFee,
      destination_amount: destinationAmount,
      status: 'indicative',
      expires_at: expiresAt.toISOString(),
    })
    .select('id, source_amount, customer_rate, total_fee, destination_amount, expires_at')
    .single()

  if (quoteError || !quote) {
    return jsonResponse({ error: 'Unable to create payment quote' }, 500)
  }

  return jsonResponse({
    quote: {
      ...quote,
      source_currency: corridor.source_currency,
      destination_currency: corridor.destination_currency,
      settlement_minutes: corridor.settlement_minutes,
      executable: false,
    },
    disclaimer:
      'Indicative only. No funds are reserved or transferred by this quote.',
  })
})
