import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type AlpacaAsset = {
  symbol: string
  name: string
  class: string
  exchange: string
  status: string
}

type AlpacaBar = {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

type AlpacaBarsResponse = {
  bars?: Record<string, AlpacaBar[]>
  next_page_token?: string | null
  message?: string
}

type SyncRequest = {
  symbols?: string[]
  historyDays?: number
}

const exchangeMetadata: Record<
  string,
  { name: string; mic: string }
> = {
  AMEX: { name: 'NYSE American', mic: 'XASE' },
  ARCA: { name: 'NYSE Arca', mic: 'ARCX' },
  BATS: { name: 'Cboe BZX', mic: 'BATS' },
  NASDAQ: { name: 'Nasdaq', mic: 'XNAS' },
  NYSE: { name: 'New York Stock Exchange', mic: 'XNYS' },
}

function normalizeSymbols(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim().toUpperCase())
        .filter((value) => /^[A-Z0-9.-]{1,15}$/.test(value)),
    ),
  ).slice(0, 100)
}

function positiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function providerHeaders(keyId: string, secretKey: string) {
  return {
    Accept: 'application/json',
    'APCA-API-KEY-ID': keyId,
    'APCA-API-SECRET-KEY': secretKey,
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
  const providerKeyId = Deno.env.get('ALPACA_API_KEY_ID')
  const providerSecret = Deno.env.get('ALPACA_API_SECRET_KEY')

  if (!supabaseUrl || !serviceRoleKey || !providerKeyId || !providerSecret) {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  let body: SyncRequest = {}

  try {
    body = (await request.json()) as SyncRequest
  } catch {
    body = {}
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  const configuredSymbols = (Deno.env.get('EQUITY_SYNC_SYMBOLS') ?? '')
    .split(',')
    .filter(Boolean)
  let symbols = normalizeSymbols(
    Array.isArray(body.symbols) ? body.symbols : configuredSymbols,
  )

  if (symbols.length === 0) {
    const { data: configured, error } = await admin
      .from('equity_securities')
      .select('provider_symbol')
      .eq('provider_name', 'alpaca')
      .eq('active', true)
      .eq('forecast_enabled', true)
      .limit(100)

    if (error) {
      return jsonResponse({ error: 'Unable to load configured equity coverage' }, 500)
    }

    symbols = normalizeSymbols(
      (configured ?? []).map((item) => item.provider_symbol),
    )
  }

  if (symbols.length === 0) {
    return jsonResponse(
      { error: 'No equity symbols are configured for synchronization' },
      422,
    )
  }

  const feed = Deno.env.get('ALPACA_DATA_FEED') ?? 'iex'
  const allowedFeeds = new Set(['iex', 'delayed_sip', 'sip'])

  if (!allowedFeeds.has(feed)) {
    return jsonResponse({ error: 'Unsupported ALPACA_DATA_FEED' }, 500)
  }

  const displayLicensed = Deno.env.get('EQUITY_DATA_DISPLAY_LICENSED') === 'true'

  if (!displayLicensed) {
    return jsonResponse(
      { error: 'Equity data display licensing approval is required before synchronization' },
      412,
    )
  }

  const realtimeLicensed =
    feed === 'sip' &&
    displayLicensed &&
    Deno.env.get('ALPACA_REALTIME_LICENSED') === 'true'
  const coverageStatus = realtimeLicensed
    ? 'realtime'
    : feed === 'delayed_sip'
      ? 'delayed'
      : 'reference'
  const delayMinutes = feed === 'delayed_sip' ? 15 : 0
  const licenseStatus = displayLicensed ? 'licensed' : 'review_required'
  const requestedHistoryDays = Number(body.historyDays ?? 400)
  const historyDays = Number.isFinite(requestedHistoryDays)
    ? Math.min(730, Math.max(180, requestedHistoryDays))
    : 400
  const dataApiUrl = Deno.env.get('ALPACA_DATA_API_URL') ??
    'https://data.alpaca.markets'
  const tradingApiUrl = Deno.env.get('ALPACA_TRADING_API_URL') ??
    'https://paper-api.alpaca.markets'
  const headers = providerHeaders(providerKeyId, providerSecret)
  const { data: syncRun, error: syncRunError } = await admin
    .from('data_sync_runs')
    .insert({
      source_name: 'Alpaca Market Data',
      dataset: 'us_equity_reference_and_daily_bars',
      status: 'running',
      metadata: {
        feed,
        requested_symbols: symbols.length,
        display_licensed: displayLicensed,
      },
    })
    .select('id')
    .single()

  if (syncRunError || !syncRun) {
    return jsonResponse({ error: 'Unable to start sync audit record' }, 500)
  }

  let recordsRead = 0
  let recordsWritten = 0

  try {
    const assetsResponse = await fetch(
      `${tradingApiUrl}/v2/assets?status=active&asset_class=us_equity`,
      { headers },
    )

    if (!assetsResponse.ok) {
      throw new Error(`Alpaca assets returned ${assetsResponse.status}`)
    }

    const providerAssets = (await assetsResponse.json()) as AlpacaAsset[]
    const requested = new Set(symbols)
    const assets = providerAssets.filter((asset) =>
      requested.has(asset.symbol.toUpperCase()) &&
      asset.class === 'us_equity' &&
      asset.status === 'active'
    )
    recordsRead += providerAssets.length

    if (assets.length === 0) {
      throw new Error('None of the requested symbols are active US equities')
    }

    const securityBySymbol = new Map<
      string,
      { id: number; marketAssetId: number }
    >()

    for (const asset of assets) {
      const symbol = asset.symbol.toUpperCase()
      const exchange = asset.exchange.toUpperCase()
      const securityKey = `US:${exchange}:${symbol}`
      const marketSymbol = `ALPACA:${symbol}`
      const exchangeInfo = exchangeMetadata[exchange]
      const { data: marketAsset, error: marketAssetError } = await admin
        .from('market_assets')
        .upsert(
          {
            symbol: marketSymbol,
            name: asset.name,
            asset_type: 'equity',
            currency: 'USD',
          },
          { onConflict: 'symbol' },
        )
        .select('id')
        .single()

      if (marketAssetError || !marketAsset) {
        throw marketAssetError ?? new Error(`Unable to register ${symbol}`)
      }

      const { data: instrument, error: instrumentError } = await admin
        .from('investment_instruments')
        .upsert(
          {
            canonical_symbol: securityKey,
            display_symbol: symbol,
            name: asset.name,
            asset_class: 'equity',
            market_asset_id: marketAsset.id,
            quote_currency: 'USD',
            research_enabled: true,
            paper_trading_enabled: false,
            live_execution_enabled: false,
          },
          { onConflict: 'canonical_symbol' },
        )
        .select('id')
        .single()

      if (instrumentError || !instrument) {
        throw instrumentError ?? new Error(`Unable to register ${symbol}`)
      }

      const { data: security, error: securityError } = await admin
        .from('equity_securities')
        .upsert(
          {
            market_asset_id: marketAsset.id,
            instrument_id: instrument.id,
            security_key: securityKey,
            display_symbol: symbol,
            company_name: asset.name,
            asset_class: 'equity',
            exchange_code: exchange,
            exchange_name: exchangeInfo?.name ?? exchange,
            exchange_mic: exchangeInfo?.mic ?? null,
            country_code: 'US',
            quote_currency: 'USD',
            provider_name: 'alpaca',
            provider_symbol: symbol,
            research_enabled: true,
            forecast_enabled: true,
            active: true,
          },
          { onConflict: 'provider_name,provider_symbol' },
        )
        .select('id')
        .single()

      if (securityError || !security) {
        throw securityError ?? new Error(`Unable to register ${symbol}`)
      }

      securityBySymbol.set(symbol, {
        id: security.id,
        marketAssetId: marketAsset.id,
      })
    }

    const start = new Date(Date.now() - historyDays * 24 * 60 * 60 * 1000)
      .toISOString()
    const query = new URLSearchParams({
      symbols: Array.from(securityBySymbol.keys()).join(','),
      timeframe: '1Day',
      start,
      limit: '10000',
      adjustment: 'all',
      feed,
      sort: 'asc',
    })
    let pageToken: string | null = null

    do {
      if (pageToken) {
        query.set('page_token', pageToken)
      }

      const barsResponse = await fetch(
        `${dataApiUrl}/v2/stocks/bars?${query.toString()}`,
        { headers },
      )
      const payload = (await barsResponse.json()) as AlpacaBarsResponse

      if (!barsResponse.ok) {
        throw new Error(
          `Alpaca bars returned ${barsResponse.status}: ${payload.message ?? 'provider error'}`,
        )
      }

      for (const [symbol, bars] of Object.entries(payload.bars ?? {})) {
        const security = securityBySymbol.get(symbol.toUpperCase())

        if (!security) {
          continue
        }

        let previousPrice: number | null = null
        const observations = bars.flatMap((bar) => {
          const price = positiveNumber(bar.c)

          if (!price || !bar.t) {
            return []
          }

          const changePercent = previousPrice
            ? ((price - previousPrice) / previousPrice) * 100
            : null
          previousPrice = price

          return [{
            asset_id: security.marketAssetId,
            observed_at: bar.t,
            price,
            change_percent: changePercent,
            source: `alpaca-${feed}-daily-adjusted`,
          }]
        })

        if (observations.length > 0) {
          const { error: observationError } = await admin
            .from('market_observations')
            .upsert(observations, {
              onConflict: 'asset_id,observed_at,source',
            })

          if (observationError) {
            throw observationError
          }

          recordsWritten += observations.length
          const lastObservedAt = observations[observations.length - 1].observed_at
          const { error: coverageError } = await admin
            .from('equity_data_coverage')
            .upsert(
              {
                security_id: security.id,
                provider_name: 'alpaca',
                dataset: 'prices',
                coverage_status: coverageStatus,
                delay_minutes: delayMinutes,
                license_status: licenseStatus,
                last_synchronized_at: new Date().toISOString(),
                last_observed_at: lastObservedAt,
                error_summary: null,
                metadata: {
                  feed,
                  adjusted: true,
                  scope: feed === 'iex' ? 'single_exchange_partial' : 'consolidated',
                },
              },
              { onConflict: 'security_id,provider_name,dataset' },
            )

          if (coverageError) {
            throw coverageError
          }
        }
      }

      pageToken = payload.next_page_token ?? null
    } while (pageToken)

    await admin
      .from('data_sync_runs')
      .update({
        status: 'completed',
        records_read: recordsRead,
        records_written: recordsWritten,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncRun.id)

    return jsonResponse({
      status: 'completed',
      securities: securityBySymbol.size,
      recordsWritten,
      coverageStatus,
      displayLicensed,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'

    await admin
      .from('data_sync_runs')
      .update({
        status: recordsWritten > 0 ? 'partial' : 'failed',
        records_read: recordsRead,
        records_written: recordsWritten,
        completed_at: new Date().toISOString(),
        error_summary: message.slice(0, 1000),
      })
      .eq('id', syncRun.id)

    return jsonResponse({ error: 'Equity synchronization failed' }, 502)
  }
})
