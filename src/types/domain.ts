export type MarketAssetSnapshot = {
  id: number
  symbol: string
  name: string
  asset_type: string
  currency: string | null
  price: number | null
  change_percent: number | null
  source: string | null
  observed_at: string | null
}

export type TradeKpi = {
  label: string
  value: string
  change: string
  note: string
  tone: 'positive' | 'negative' | 'neutral'
}

export type TradeTrendPoint = {
  period: string
  exports: number
  imports: number
  balance: number
}

export type CountryTradeSnapshot = {
  isoCode: string
  country: string
  exports: number
  imports: number
  balance: number
  growthPercent: number | null
  periodDate: string
}

export type TradeDashboard = {
  kpis: TradeKpi[]
  trend: TradeTrendPoint[]
  countries: CountryTradeSnapshot[]
}

export type MarketForecast = {
  id: number
  symbol: string
  assetName: string
  horizonHours: number
  predictedPrice: number
  lowerBound: number | null
  upperBound: number | null
  confidence: number | null
  direction: 'up' | 'down' | 'flat'
  modelName: string
  generatedAt: string
  targetAt: string
}

export type PaymentCorridor = {
  id: number
  code: string
  sourceCurrency: string
  destinationCurrency: string
  fxSymbol: string
  rateOperation: 'direct' | 'inverse'
  spreadBps: number
  variableFeeBps: number
  fixedFee: number
  minimumFee: number
  settlementMinutes: number
}
