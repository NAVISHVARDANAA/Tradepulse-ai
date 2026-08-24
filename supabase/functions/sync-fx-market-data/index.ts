import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import { hasValidInternalSecret, internalJsonResponse as jsonResponse } from '../_shared/http.ts'

type FxPair = {
  symbol: string
  base: string
  quote: string
}

type FrankfurterRate = {
  date: string
  base: string
  quote: string
  rate: number
}

const pairs: FxPair[] = [
  { symbol: 'EURUSD', base: 'EUR', quote: 'USD' },
  { symbol: 'USDINR', base: 'USD', quote: 'INR' },
]

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  if (!await hasValidInternalSecret(request, 'SYNC_SECRET')) {
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
  const { data: syncRun, error: syncRunError } = await admin
    .from('data_sync_runs')
    .insert({
      source_name: 'Frankfurter',
      dataset: 'fx_reference_rates',
      status: 'running',
    })
    .select('id')
    .single()

  if (syncRunError || !syncRun) {
    return jsonResponse({ error: 'Unable to start sync audit record' }, 500)
  }

  let recordsWritten = 0

  try {
    for (const pair of pairs) {
      const response = await fetch(
        `https://api.frankfurter.dev/v2/rate/${pair.base}/${pair.quote}`,
        { headers: { Accept: 'application/json' } },
      )

      if (!response.ok) {
        throw new Error(
          `Frankfurter returned ${response.status} for ${pair.symbol}`,
        )
      }

      const rate = (await response.json()) as FrankfurterRate

      if (!Number.isFinite(rate.rate) || rate.rate <= 0) {
        throw new Error(`Invalid provider rate for ${pair.symbol}`)
      }

      const { data: asset, error: assetError } = await admin
        .from('market_assets')
        .select('id')
        .eq('symbol', pair.symbol)
        .single()

      if (assetError || !asset) {
        throw new Error(`Configured asset ${pair.symbol} was not found`)
      }

      const { data: previous } = await admin
        .from('market_observations')
        .select('price')
        .eq('asset_id', asset.id)
        .order('observed_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const previousPrice = previous?.price ? Number(previous.price) : null
      const changePercent =
        previousPrice && previousPrice > 0
          ? ((rate.rate - previousPrice) / previousPrice) * 100
          : null
      const observedAt = `${rate.date}T00:00:00.000Z`

      const { error: writeError } = await admin
        .from('market_observations')
        .upsert(
          {
            asset_id: asset.id,
            observed_at: observedAt,
            price: rate.rate,
            change_percent: changePercent,
            source: 'frankfurter-v2',
          },
          { onConflict: 'asset_id,observed_at,source' },
        )

      if (writeError) {
        throw writeError
      }

      recordsWritten += 1
    }

    await admin
      .from('data_sync_runs')
      .update({
        status: 'completed',
        records_read: pairs.length,
        records_written: recordsWritten,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncRun.id)

    return jsonResponse({
      status: 'completed',
      recordsWritten,
      source: 'Frankfurter v2',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'

    await admin
      .from('data_sync_runs')
      .update({
        status: recordsWritten > 0 ? 'partial' : 'failed',
        records_read: pairs.length,
        records_written: recordsWritten,
        completed_at: new Date().toISOString(),
        error_summary: message.slice(0, 1000),
      })
      .eq('id', syncRun.id)

    return jsonResponse({ error: 'FX synchronization failed' }, 502)
  }
})
