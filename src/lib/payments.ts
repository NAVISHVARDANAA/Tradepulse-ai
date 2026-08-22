import type { MarketAssetSnapshot, PaymentCorridor } from '../types/domain'

export type IndicativePaymentQuote = {
  sourceAmount: number
  referenceRate: number
  customerRate: number
  variableFee: number
  fixedFee: number
  totalFee: number
  destinationAmount: number
}

export function createIndicativePaymentQuote(
  sourceAmount: number,
  corridor: PaymentCorridor,
  marketAssets: MarketAssetSnapshot[],
): IndicativePaymentQuote | null {
  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0) {
    return null
  }

  const market = marketAssets.find(
    (asset) => asset.symbol === corridor.fxSymbol,
  )

  if (!market?.price || market.price <= 0) {
    return null
  }

  const referenceRate =
    corridor.rateOperation === 'inverse'
      ? 1 / market.price
      : market.price
  const customerRate =
    referenceRate * (1 - corridor.spreadBps / 10_000)
  const variableFee = Math.max(
    corridor.minimumFee,
    sourceAmount * (corridor.variableFeeBps / 10_000),
  )
  const totalFee = variableFee + corridor.fixedFee
  const convertibleAmount = Math.max(0, sourceAmount - totalFee)

  return {
    sourceAmount,
    referenceRate,
    customerRate,
    variableFee,
    fixedFee: corridor.fixedFee,
    totalFee,
    destinationAmount: convertibleAmount * customerRate,
  }
}
