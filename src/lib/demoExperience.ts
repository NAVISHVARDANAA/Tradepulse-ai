import type {
  EquityPricePoint,
  EquityResearchSnapshot,
  MarketAssetSnapshot,
  MarketForecast,
  TradeDashboard,
} from '../types/domain'

const observedAt = '2026-09-30T16:00:00Z'

export const demoMarketAssets: MarketAssetSnapshot[] = [
  { id: 9001, symbol: 'SPX', name: 'S&P 500 reference', asset_type: 'index', currency: 'USD', price: 6847.12, change_percent: 0.64, source: 'TradePulse curated demo', observed_at: observedAt },
  { id: 9002, symbol: 'EURUSD', name: 'Euro / US dollar reference', asset_type: 'fx', currency: 'USD', price: 1.1842, change_percent: -0.18, source: 'TradePulse curated demo', observed_at: observedAt },
  { id: 9003, symbol: 'XAUUSD', name: 'Gold / US dollar reference', asset_type: 'commodity', currency: 'USD', price: 3788.4, change_percent: 0.91, source: 'TradePulse curated demo', observed_at: observedAt },
  { id: 9004, symbol: 'USDINR', name: 'US dollar / Indian rupee reference', asset_type: 'fx', currency: 'INR', price: 88.73, change_percent: 0.07, source: 'TradePulse curated demo', observed_at: observedAt },
]

export const demoForecasts: MarketForecast[] = [
  {
    id: 9101, symbol: 'SPX', assetName: 'S&P 500 reference', horizonHours: 24,
    predictedPrice: 6871.8, lowerBound: 6760.2, upperBound: 6988.4, confidence: 0.72,
    direction: 'up', modelName: 'TradePulse demo ensemble', modelVersion: 'demo-1',
    baselineMae: 64.2, modelMae: 48.1, directionalAccuracy: 0.61,
    governanceStatus: 'qualified', reliabilityEvaluationCount: 42,
    productionModelMae: 49.3, productionBaselineMae: 65.1,
    productionMaeImprovementPercent: 24.3, productionMape: 0.012,
    productionDirectionalAccuracy: 0.64, productionIntervalCoverage: 0.88,
    reliabilityReasons: ['curated_demo_evidence'], generatedAt: observedAt,
    targetAt: '2026-10-01T16:00:00Z',
  },
  {
    id: 9102, symbol: 'EURUSD', assetName: 'Euro / US dollar reference', horizonHours: 24,
    predictedPrice: 1.1816, lowerBound: 1.1712, upperBound: 1.1931, confidence: 0.66,
    direction: 'down', modelName: 'TradePulse demo ensemble', modelVersion: 'demo-1',
    baselineMae: 0.0092, modelMae: 0.0074, directionalAccuracy: 0.58,
    governanceStatus: 'watch', reliabilityEvaluationCount: 35,
    productionModelMae: 0.0078, productionBaselineMae: 0.0094,
    productionMaeImprovementPercent: 17.0, productionMape: 0.008,
    productionDirectionalAccuracy: 0.57, productionIntervalCoverage: 0.83,
    reliabilityReasons: ['curated_demo_evidence'], generatedAt: observedAt,
    targetAt: '2026-10-01T16:00:00Z',
  },
  {
    id: 9103, symbol: 'XAUUSD', assetName: 'Gold / US dollar reference', horizonHours: 72,
    predictedPrice: 3816.2, lowerBound: 3698.7, upperBound: 3929.4, confidence: 0.69,
    direction: 'up', modelName: 'TradePulse demo ensemble', modelVersion: 'demo-1',
    baselineMae: 71.8, modelMae: 56.3, directionalAccuracy: 0.6,
    governanceStatus: 'qualified', reliabilityEvaluationCount: 38,
    productionModelMae: 58.7, productionBaselineMae: 72.4,
    productionMaeImprovementPercent: 18.9, productionMape: 0.016,
    productionDirectionalAccuracy: 0.61, productionIntervalCoverage: 0.86,
    reliabilityReasons: ['curated_demo_evidence'], generatedAt: observedAt,
    targetAt: '2026-10-03T16:00:00Z',
  },
]

const demoEquityForecast = demoForecasts[0]

export const demoEquityResearch: EquityResearchSnapshot[] = [
  {
    securityId: 9201, marketAssetId: 9201, symbol: 'AAPL', companyName: 'Apple Inc. (demo)',
    assetClass: 'equity', exchangeCode: 'XNAS', exchangeName: 'Nasdaq', countryCode: 'US',
    currency: 'USD', sector: 'Technology', industry: 'Consumer electronics',
    providerName: 'TradePulse curated demo', coverageStatus: 'reference', delayMinutes: null,
    licenseStatus: 'demo_only', lastSynchronizedAt: observedAt, observedAt, price: 255.42,
    changePercent: 0.84, priceSource: 'Curated demo reference', forecast: { ...demoEquityForecast, id: 9201, symbol: 'AAPL', assetName: 'Apple Inc. (demo)', predictedPrice: 258.1, lowerBound: 247.9, upperBound: 264.8 },
    researchScore: 78, researchClassification: 'research_positive', researchConfidence: 0.74,
    componentScores: { forecast: 76, momentum: 81, quality: 88, valuation: 61, risk: 72, dataQuality: 92 },
    methodologyVersion: 'demo-1', reasons: ['Strong quality and momentum in the curated scenario', 'Forecast evidence clears the demo threshold'],
    riskFlags: ['Valuation sensitivity', 'Demo data—not investment advice'], fundamentalPeriodEnd: '2026-06-30',
    revenue: 418000000000, netIncome: 101000000000, dilutedEps: 6.71, peRatio: 37.9, priceToBook: 52.4, dividendYield: 0.004,
  },
  {
    securityId: 9202, marketAssetId: 9202, symbol: 'MSFT', companyName: 'Microsoft Corp. (demo)',
    assetClass: 'equity', exchangeCode: 'XNAS', exchangeName: 'Nasdaq', countryCode: 'US',
    currency: 'USD', sector: 'Technology', industry: 'Software infrastructure',
    providerName: 'TradePulse curated demo', coverageStatus: 'reference', delayMinutes: null,
    licenseStatus: 'demo_only', lastSynchronizedAt: observedAt, observedAt, price: 521.38,
    changePercent: 0.32, priceSource: 'Curated demo reference', forecast: { ...demoEquityForecast, id: 9202, symbol: 'MSFT', assetName: 'Microsoft Corp. (demo)', predictedPrice: 526.4, lowerBound: 507.2, upperBound: 539.1 },
    researchScore: 74, researchClassification: 'research_positive', researchConfidence: 0.7,
    componentScores: { forecast: 72, momentum: 74, quality: 91, valuation: 58, risk: 70, dataQuality: 90 },
    methodologyVersion: 'demo-1', reasons: ['High quality score in the curated scenario', 'Risk-adjusted evidence remains positive'],
    riskFlags: ['Multiple compression risk', 'Demo data—not investment advice'], fundamentalPeriodEnd: '2026-06-30',
    revenue: 286000000000, netIncome: 105000000000, dilutedEps: 14.05, peRatio: 37.1, priceToBook: 11.8, dividendYield: 0.006,
  },
  {
    securityId: 9203, marketAssetId: 9203, symbol: 'NVDA', companyName: 'NVIDIA Corp. (demo)',
    assetClass: 'equity', exchangeCode: 'XNAS', exchangeName: 'Nasdaq', countryCode: 'US',
    currency: 'USD', sector: 'Technology', industry: 'Semiconductors',
    providerName: 'TradePulse curated demo', coverageStatus: 'reference', delayMinutes: null,
    licenseStatus: 'demo_only', lastSynchronizedAt: observedAt, observedAt, price: 192.16,
    changePercent: -0.41, priceSource: 'Curated demo reference', forecast: null,
    researchScore: 63, researchClassification: 'research_neutral', researchConfidence: 0.61,
    componentScores: { forecast: null, momentum: 68, quality: 86, valuation: 43, risk: 57, dataQuality: 88 },
    methodologyVersion: 'demo-1', reasons: ['Business quality remains high', 'Forecast evidence is intentionally unavailable in this scenario'],
    riskFlags: ['Concentration risk', 'No qualified demo forecast', 'Demo data—not investment advice'], fundamentalPeriodEnd: '2026-07-31',
    revenue: 187000000000, netIncome: 101000000000, dilutedEps: 4.03, peRatio: 47.7, priceToBook: 39.2, dividendYield: 0.0005,
  },
]

export const demoTradeDashboard: TradeDashboard = {
  kpis: [
    { label: 'Tracked trade volume', value: '$14.8T', change: '+3.1%', note: 'Curated demo scenario', tone: 'positive' },
    { label: 'Export growth', value: '+2.7%', change: '+0.4pp', note: 'Illustrative period change', tone: 'positive' },
    { label: 'Import growth', value: '+2.2%', change: '-0.1pp', note: 'Illustrative period change', tone: 'neutral' },
    { label: 'Trade balance', value: '+$118B', change: '+5.8%', note: 'Curated demo scenario', tone: 'positive' },
  ],
  trend: [
    { period: '2026-04', exports: 1160, imports: 1138, balance: 22 },
    { period: '2026-05', exports: 1188, imports: 1152, balance: 36 },
    { period: '2026-06', exports: 1204, imports: 1179, balance: 25 },
    { period: '2026-07', exports: 1238, imports: 1191, balance: 47 },
    { period: '2026-08', exports: 1264, imports: 1218, balance: 46 },
    { period: '2026-09', exports: 1291, imports: 1234, balance: 57 },
  ],
  countries: [
    { isoCode: 'US', country: 'United States', exports: 2130000000000, imports: 3290000000000, balance: -1160000000000, growthPercent: 2.1, periodDate: '2026-09-30' },
    { isoCode: 'CN', country: 'China', exports: 3650000000000, imports: 2680000000000, balance: 970000000000, growthPercent: 3.4, periodDate: '2026-09-30' },
    { isoCode: 'DE', country: 'Germany', exports: 1820000000000, imports: 1590000000000, balance: 230000000000, growthPercent: 1.3, periodDate: '2026-09-30' },
    { isoCode: 'IN', country: 'India', exports: 512000000000, imports: 736000000000, balance: -224000000000, growthPercent: 5.7, periodDate: '2026-09-30' },
  ],
}

const historyByAsset = new Map<number, EquityPricePoint[]>(
  demoEquityResearch.map((security, securityIndex) => [
    security.marketAssetId,
    Array.from({ length: 18 }, (_, index) => ({
      observedAt: new Date(Date.UTC(2026, 8, 8 + index)).toISOString(),
      price: Number(((security.price ?? 100) * (0.94 + index * 0.003 + Math.sin(index + securityIndex) * 0.012)).toFixed(2)),
    })),
  ]),
)

export function getDemoEquityHistory(marketAssetId: number) {
  return historyByAsset.get(marketAssetId) ?? []
}
