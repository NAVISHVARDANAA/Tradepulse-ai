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
  modelVersion: string
  baselineMae: number | null
  modelMae: number | null
  directionalAccuracy: number | null
  governanceStatus: 'insufficient_evidence' | 'qualified' | 'watch' | 'suspended'
  reliabilityEvaluationCount: number
  productionModelMae: number | null
  productionBaselineMae: number | null
  productionMaeImprovementPercent: number | null
  productionMape: number | null
  productionDirectionalAccuracy: number | null
  productionIntervalCoverage: number | null
  reliabilityReasons: string[]
  generatedAt: string
  targetAt: string
}

export type PaymentCorridorRoute = {
  id: number
  routeCode: string
  corridorId: number
  corridorCode: string
  sourceCurrency: string
  destinationCurrency: string
  fxSymbol: string
  rateOperation: 'direct' | 'inverse'
  providerLabel: string
  providerRateMode: 'sandbox_model'
  deliveryTier: 'economy' | 'priority'
  providerSpreadBps: number
  variableFeeBps: number
  fixedFee: number
  minimumFee: number
  taxStatus: 'unavailable' | 'estimated' | 'not_applicable'
  estimatedTaxBps: number | null
  taxExplanation: string
  etaMinMinutes: number
  etaMaxMinutes: number
  availability: 'reference_only' | 'unavailable'
  availabilityReason: string
  maxReferenceAgeMinutes: number
  providerConnectivityEnabled: false
  beneficiaryCollectionEnabled: false
  quoteAcceptanceEnabled: false
  automaticRouteSelectionEnabled: false
  transferCreationEnabled: false
  paymentExecutionEnabled: false
  moneyMovementEnabled: false
  custodyEnabled: false
  settlementEnabled: false
}

export type EquityCoverageStatus =
  | 'reference'
  | 'delayed'
  | 'realtime'
  | 'unavailable'

export type EquityResearchClassification =
  | 'research_positive'
  | 'research_neutral'
  | 'research_cautious'
  | 'insufficient_data'

export type EquityResearchSnapshot = {
  securityId: number
  marketAssetId: number
  symbol: string
  companyName: string
  assetClass: 'equity' | 'etf'
  exchangeCode: string
  exchangeName: string | null
  countryCode: string | null
  currency: string
  sector: string | null
  industry: string | null
  providerName: string
  coverageStatus: EquityCoverageStatus | null
  delayMinutes: number | null
  licenseStatus: string | null
  lastSynchronizedAt: string | null
  observedAt: string | null
  price: number | null
  changePercent: number | null
  priceSource: string | null
  forecast: MarketForecast | null
  researchScore: number | null
  researchClassification: EquityResearchClassification | null
  researchConfidence: number | null
  componentScores: {
    forecast: number | null
    momentum: number | null
    quality: number | null
    valuation: number | null
    risk: number | null
    dataQuality: number | null
  }
  methodologyVersion: string | null
  reasons: string[]
  riskFlags: string[]
  fundamentalPeriodEnd: string | null
  revenue: number | null
  netIncome: number | null
  dilutedEps: number | null
  peRatio: number | null
  priceToBook: number | null
  dividendYield: number | null
}

export type EquityPricePoint = {
  observedAt: string
  price: number
}
