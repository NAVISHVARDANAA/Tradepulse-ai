import type { MarketAssetSnapshot, PaymentCorridorRoute } from '../types/domain'

export type CorridorIntelligenceQuote = {
  sourceAmount: number
  referenceRate: number
  providerRate: number
  providerSpreadBps: number
  variableFee: number
  fixedFee: number
  knownFees: number
  taxAmount: number | null
  taxStatus: PaymentCorridorRoute['taxStatus']
  destinationAmount: number
  destinationAmountIncludesTax: boolean
  referenceDestinationAmount: number
  fxSpreadCostDestination: number
  knownReductionDestination: number
  effectiveRate: number
  referenceObservedAt: string | null
  referenceAgeMinutes: number | null
  referenceFresh: boolean
}

export function createCorridorIntelligenceQuote(
  sourceAmount: number,
  route: PaymentCorridorRoute,
  marketAssets: MarketAssetSnapshot[],
  now = Date.now(),
): CorridorIntelligenceQuote | null {
  if (!Number.isFinite(sourceAmount) || sourceAmount <= 0 || sourceAmount > 1_000_000) {
    return null
  }

  const market = marketAssets.find((asset) => asset.symbol === route.fxSymbol)
  if (!market?.price || market.price <= 0) {
    return null
  }

  const referenceRate = route.rateOperation === 'inverse'
    ? 1 / market.price
    : market.price
  const providerRate = referenceRate * (1 - route.providerSpreadBps / 10_000)
  const variableFee = Math.max(
    route.minimumFee,
    sourceAmount * (route.variableFeeBps / 10_000),
  )
  const fixedFee = route.fixedFee
  const knownFees = variableFee + fixedFee
  const taxAmount = route.taxStatus === 'estimated' && route.estimatedTaxBps !== null
    ? sourceAmount * (route.estimatedTaxBps / 10_000)
    : route.taxStatus === 'not_applicable'
      ? 0
      : null
  const convertibleAmount = Math.max(0, sourceAmount - knownFees - (taxAmount ?? 0))
  const destinationAmount = convertibleAmount * providerRate
  const referenceDestinationAmount = sourceAmount * referenceRate
  const fxSpreadCostDestination = Math.max(0, convertibleAmount * (referenceRate - providerRate))
  const knownReductionDestination = Math.max(0, referenceDestinationAmount - destinationAmount)
  const referenceTimestamp = market.observed_at ? Date.parse(market.observed_at) : Number.NaN
  const referenceAgeMinutes = Number.isFinite(referenceTimestamp)
    ? Math.max(0, (now - referenceTimestamp) / 60_000)
    : null

  return {
    sourceAmount,
    referenceRate,
    providerRate,
    providerSpreadBps: route.providerSpreadBps,
    variableFee,
    fixedFee,
    knownFees,
    taxAmount,
    taxStatus: route.taxStatus,
    destinationAmount,
    destinationAmountIncludesTax: taxAmount !== null,
    referenceDestinationAmount,
    fxSpreadCostDestination,
    knownReductionDestination,
    effectiveRate: destinationAmount / sourceAmount,
    referenceObservedAt: market.observed_at,
    referenceAgeMinutes,
    referenceFresh: referenceAgeMinutes !== null && referenceAgeMinutes <= route.maxReferenceAgeMinutes,
  }
}
