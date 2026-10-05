export const TWELVE_DATA_MAX_SYMBOLS = 30
export const TWELVE_DATA_MAX_STALENESS_MS = 10 * 60 * 1000
export const TWELVE_DATA_MAX_FUTURE_SKEW_MS = 2 * 60 * 1000

const providerSymbolPattern = /^[A-Z0-9][A-Z0-9.-]{0,19}(?:\/[A-Z0-9][A-Z0-9.-]{0,19})?$/
const localAssetSymbolPattern = /^[A-Z0-9][A-Z0-9:._/-]{0,63}$/

export type TwelveDataPriceObservation = {
  providerSymbol: string
  observedAt: string
  price: number
}

export type TwelveDataSymbolMap = Record<string, string>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeTwelveDataSymbols(values: unknown[]): string[] {
  return Array.from(new Set(values
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim().toUpperCase())
    .filter((value) => providerSymbolPattern.test(value))))
    .slice(0, TWELVE_DATA_MAX_SYMBOLS)
}

export function parseTwelveDataSymbolMap(value: string): TwelveDataSymbolMap {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    throw new Error('TWELVE_DATA_MARKET_ASSET_MAP must be valid JSON')
  }

  if (!isRecord(parsed)) {
    throw new Error('TWELVE_DATA_MARKET_ASSET_MAP must be a JSON object')
  }

  const entries = Object.entries(parsed)
  const providerSymbols = normalizeTwelveDataSymbols(entries.map(([symbol]) => symbol))
  if (providerSymbols.length === 0 || providerSymbols.length !== entries.length) {
    throw new Error('TWELVE_DATA_MARKET_ASSET_MAP contains an invalid or duplicate provider symbol')
  }

  const normalized: TwelveDataSymbolMap = {}
  for (const providerSymbol of providerSymbols) {
    const rawLocalSymbol = entries.find(([symbol]) => symbol.trim().toUpperCase() === providerSymbol)?.[1]
    if (typeof rawLocalSymbol !== 'string') {
      throw new Error('TWELVE_DATA_MARKET_ASSET_MAP contains a non-string asset symbol')
    }
    const localSymbol = rawLocalSymbol.trim().toUpperCase()
    if (!localAssetSymbolPattern.test(localSymbol)) {
      throw new Error('TWELVE_DATA_MARKET_ASSET_MAP contains an invalid local asset symbol')
    }
    normalized[providerSymbol] = localSymbol
  }

  return normalized
}

export function parseTwelveDataPriceMessage(
  raw: string,
  allowedSymbols: ReadonlySet<string>,
  nowMs = Date.now(),
): TwelveDataPriceObservation | null {
  let message: unknown
  try {
    message = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isRecord(message) || message.event !== 'price') return null

  const providerSymbol = typeof message.symbol === 'string'
    ? message.symbol.trim().toUpperCase()
    : ''
  if (!allowedSymbols.has(providerSymbol)) return null

  const price = Number(message.price)
  const timestamp = Number(message.timestamp)
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(timestamp) || timestamp <= 0) {
    return null
  }

  const observedMs = timestamp >= 1_000_000_000_000 ? timestamp : timestamp * 1000
  if (
    observedMs < nowMs - TWELVE_DATA_MAX_STALENESS_MS ||
    observedMs > nowMs + TWELVE_DATA_MAX_FUTURE_SKEW_MS
  ) return null

  return {
    providerSymbol,
    observedAt: new Date(observedMs).toISOString(),
    price,
  }
}

