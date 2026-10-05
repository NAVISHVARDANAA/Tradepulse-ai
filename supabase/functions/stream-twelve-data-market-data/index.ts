import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import {
  hasValidInternalSecret,
  internalJsonResponse as jsonResponse,
  parseJsonBody,
  RequestValidationError,
} from '../_shared/http.ts'
import { observeEdgeHandler } from '../_shared/observability.ts'
import {
  parseTwelveDataPriceMessage,
  parseTwelveDataSymbolMap,
  type TwelveDataPriceObservation,
} from '../_shared/twelveDataRealtime.ts'

type StreamRequest = {
  confirmation?: string
  windowSeconds?: number
}

type MarketAsset = { id: number; symbol: string }

const requiredLicenseFlags = [
  'TWELVE_DATA_EXTERNAL_DISPLAY_LICENSED',
  'TWELVE_DATA_REALTIME_LICENSED',
  'TWELVE_DATA_REDISTRIBUTION_APPROVED',
  'TWELVE_DATA_STREAM_ENABLED',
] as const

function configured(value: string | undefined) {
  return Boolean(value?.trim())
}

function boundedWindow(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(100, Math.max(15, Math.round(parsed))) : 45
}

async function receiveWindow(
  apiKey: string,
  symbols: string[],
  windowSeconds: number,
): Promise<Map<string, TwelveDataPriceObservation>> {
  const allowed = new Set(symbols)
  const latest = new Map<string, TwelveDataPriceObservation>()
  const endpoint = `wss://ws.twelvedata.com/v1/quotes/price?apikey=${encodeURIComponent(apiKey)}`

  return await new Promise((resolve, reject) => {
    const socket = new WebSocket(endpoint)
    let settled = false
    let heartbeat: number | undefined
    let timeout: number | undefined

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      if (heartbeat !== undefined) clearInterval(heartbeat)
      if (timeout !== undefined) clearTimeout(timeout)
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        try {
          socket.close(1000, 'bounded-canary-complete')
        } catch {
          // The provider may close between the ready-state check and this call.
        }
      }
      error ? reject(error) : resolve(latest)
    }

    timeout = setTimeout(() => finish(), windowSeconds * 1000)
    socket.onopen = () => {
      socket.send(JSON.stringify({ action: 'subscribe', params: { symbols: symbols.join(',') } }))
      heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: 'heartbeat' }))
        }
      }, 10_000)
    }
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string' || event.data.length > 4096) return
      const observation = parseTwelveDataPriceMessage(event.data, allowed)
      if (observation) latest.set(observation.providerSymbol, observation)
    }
    socket.onerror = () => finish(new Error('Twelve Data WebSocket connection failed'))
    socket.onclose = (event) => {
      if (settled) return
      event.code === 1000
        ? finish()
        : finish(new Error('Twelve Data WebSocket closed before the canary window completed'))
    }
  })
}

Deno.serve(observeEdgeHandler('twelve-data-realtime', async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)
  if (!await hasValidInternalSecret(request, 'SYNC_SECRET')) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let body: StreamRequest
  try {
    body = await parseJsonBody<StreamRequest>(request, 2048)
  } catch (error) {
    return error instanceof RequestValidationError
      ? jsonResponse({ error: error.publicMessage }, error.status)
      : jsonResponse({ error: 'A valid JSON request is required' }, 400)
  }
  if (body.confirmation !== 'STREAM_PHASE_8Z') {
    return jsonResponse({ error: 'Phase 8Z streaming confirmation is required' }, 412)
  }

  const missingLicenseFlags = requiredLicenseFlags.filter((name) => Deno.env.get(name) !== 'true')
  if (missingLicenseFlags.length > 0) {
    return jsonResponse({ error: 'Licensed real-time streaming is not authorized' }, 412)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY')
  const rawMapping = Deno.env.get('TWELVE_DATA_MARKET_ASSET_MAP')
  if (![supabaseUrl, serviceRoleKey, apiKey, rawMapping].every(configured)) {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  let symbolMap: Record<string, string>
  try {
    symbolMap = parseTwelveDataSymbolMap(rawMapping!)
  } catch {
    return jsonResponse({ error: 'Provider symbol configuration is invalid' }, 500)
  }

  const admin = createClient(supabaseUrl!, serviceRoleKey!, { auth: { persistSession: false } })
  const localSymbols = Array.from(new Set(Object.values(symbolMap)))
  const { data, error } = await admin.from('market_assets').select('id,symbol').in('symbol', localSymbols)
  if (error) return jsonResponse({ error: 'Unable to resolve configured market assets' }, 500)

  const assets = (data ?? []) as MarketAsset[]
  const assetIdBySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset.id]))
  const unresolved = localSymbols.filter((symbol) => !assetIdBySymbol.has(symbol))
  if (unresolved.length > 0) {
    return jsonResponse({ error: 'One or more configured market assets do not exist' }, 412)
  }

  try {
    const observations = await receiveWindow(apiKey!, Object.keys(symbolMap), boundedWindow(body.windowSeconds))
    if (observations.size === 0) {
      return jsonResponse({ error: 'The bounded canary received no valid current price events' }, 502)
    }

    const rows = Array.from(observations.values()).map((observation) => ({
      asset_id: assetIdBySymbol.get(symbolMap[observation.providerSymbol]),
      observed_at: observation.observedAt,
      price: observation.price,
      change_percent: null,
      source: 'twelve-data-realtime-price-v1',
    }))
    const { error: writeError } = await admin.from('market_observations').upsert(rows, {
      onConflict: 'asset_id,observed_at,source',
    })
    if (writeError) return jsonResponse({ error: 'Validated observations could not be stored' }, 500)

    return jsonResponse({
      status: 'completed',
      mode: 'licensed-bounded-canary',
      symbolsConfigured: Object.keys(symbolMap).length,
      symbolsObserved: observations.size,
      recordsWritten: rows.length,
      browserCredentialExposure: false,
    })
  } catch {
    return jsonResponse({ error: 'Licensed real-time streaming canary failed' }, 502)
  }
}))
