import {
  normalizeTwelveDataSymbols,
  parseTwelveDataPriceMessage,
  parseTwelveDataSymbolMap,
  TWELVE_DATA_MAX_SYMBOLS,
} from './twelveDataRealtime.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

Deno.test('normalizes, deduplicates and bounds provider symbols', () => {
  const values = [' aapl ', 'AAPL', 'EUR/USD', 'bad symbol', ...Array.from({ length: 50 }, (_, index) => `S${index}`)]
  const symbols = normalizeTwelveDataSymbols(values)
  assert(symbols[0] === 'AAPL' && symbols[1] === 'EUR/USD', 'valid symbols were not normalized')
  assert(symbols.length === TWELVE_DATA_MAX_SYMBOLS, 'symbol limit was not enforced')
  assert(!symbols.includes('BAD SYMBOL'), 'invalid symbol was accepted')
})

Deno.test('parses a strict provider-to-local asset map', () => {
  const mapping = parseTwelveDataSymbolMap(JSON.stringify({
    aapl: 'alpaca:aapl',
    'EUR/USD': 'eurusd',
  }))
  assert(mapping.AAPL === 'ALPACA:AAPL', 'equity mapping was not normalized')
  assert(mapping['EUR/USD'] === 'EURUSD', 'FX mapping was not normalized')
})

Deno.test('rejects invalid or duplicate mapping keys', () => {
  for (const value of ['[]', '{"bad symbol":"AAPL"}', '{"aapl":"AAPL","AAPL":"MSFT"}']) {
    let rejected = false
    try {
      parseTwelveDataSymbolMap(value)
    } catch {
      rejected = true
    }
    assert(rejected, `invalid map was accepted: ${value}`)
  }
})

Deno.test('accepts only current positive prices for allow-listed symbols', () => {
  const nowMs = Date.parse('2026-10-05T12:00:00.000Z')
  const message = JSON.stringify({
    event: 'price',
    symbol: 'AAPL',
    timestamp: nowMs / 1000,
    price: '225.125',
  })
  const observation = parseTwelveDataPriceMessage(message, new Set(['AAPL']), nowMs)
  assert(observation?.providerSymbol === 'AAPL', 'allow-listed symbol was rejected')
  assert(observation?.price === 225.125, 'price was not parsed')
  assert(observation?.observedAt === '2026-10-05T12:00:00.000Z', 'timestamp was not normalized')
})

Deno.test('drops malformed, unknown, stale, future and non-positive events', () => {
  const nowMs = Date.parse('2026-10-05T12:00:00.000Z')
  const invalid = [
    'not-json',
    JSON.stringify({ event: 'subscribe-status', symbol: 'AAPL' }),
    JSON.stringify({ event: 'price', symbol: 'MSFT', timestamp: nowMs / 1000, price: 1 }),
    JSON.stringify({ event: 'price', symbol: 'AAPL', timestamp: (nowMs - 11 * 60_000) / 1000, price: 1 }),
    JSON.stringify({ event: 'price', symbol: 'AAPL', timestamp: (nowMs + 3 * 60_000) / 1000, price: 1 }),
    JSON.stringify({ event: 'price', symbol: 'AAPL', timestamp: nowMs / 1000, price: 0 }),
  ]
  for (const message of invalid) {
    assert(parseTwelveDataPriceMessage(message, new Set(['AAPL']), nowMs) === null, 'unsafe event was accepted')
  }
})

