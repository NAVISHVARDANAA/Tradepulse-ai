import type { MarketAssetSnapshot } from '../types/domain'

export type MarketImpactScenarioId =
  | 'shipping-disruption'
  | 'rate-surprise'
  | 'commodity-supply-shock'
  | 'export-restriction'

export type MarketImpactDecisionLens = 'investor' | 'operator' | 'analyst'
export type MarketImpactSeverity = 'moderate' | 'high' | 'critical'
export type MarketImpactHorizon = '24-hours' | '7-days' | '30-days'

export type MarketImpactScenario = {
  id: MarketImpactScenarioId
  label: string
  defaultHeadline: string
  origin: string
  summary: string
  transmission: string[]
  assets: Array<{
    symbol: string
    pressure: 'upward' | 'downward' | 'mixed'
    hypothesis: string
  }>
  confirmingSignals: string[]
  counterSignals: string[]
}

export type MarketImpactObservation = {
  symbol: string
  name: string
  pressure: 'upward' | 'downward' | 'mixed'
  hypothesis: string
  price: number | null
  changePercent: number | null
  source: string | null
  observedAt: string | null
  freshness: string
}

export type MarketImpactBrief = {
  title: string
  scenarioLabel: string
  decisionLens: MarketImpactDecisionLens
  severity: MarketImpactSeverity
  horizon: MarketImpactHorizon
  origin: string
  framing: string
  transmission: string[]
  observations: MarketImpactObservation[]
  confirmingSignals: string[]
  counterSignals: string[]
  decisionQuestions: string[]
  missingObservationCount: number
}

export const MARKET_IMPACT_SCENARIOS: readonly MarketImpactScenario[] = [
  {
    id: 'shipping-disruption',
    label: 'Shipping or logistics disruption',
    defaultHeadline: 'A major shipping lane faces a sustained disruption',
    origin: 'Cross-border logistics',
    summary: 'Tests how constrained freight capacity could affect energy, input costs, inflation expectations and risk appetite.',
    transmission: [
      'Shipping capacity or route availability tightens.',
      'Freight, insurance and delivery lead times may rise.',
      'Energy and imported-input costs may transmit into margins and inflation expectations.',
      'Currencies and broad risk assets may reprice as evidence develops.',
    ],
    assets: [
      { symbol: 'WTI', pressure: 'upward', hypothesis: 'Longer or constrained energy routes could add a transport and availability premium.' },
      { symbol: 'EURUSD', pressure: 'mixed', hypothesis: 'Relative import exposure and policy expectations could pull the currency in either direction.' },
      { symbol: 'SPX', pressure: 'downward', hypothesis: 'Higher input costs and uncertainty could pressure broad risk appetite.' },
    ],
    confirmingSignals: ['Sustained freight-rate increase', 'Official route restrictions or port notices', 'Longer delivery estimates across independent carriers'],
    counterSignals: ['Rapid route normalization', 'Available spare capacity absorbs the disruption', 'Energy inventories remain ample and stable'],
  },
  {
    id: 'rate-surprise',
    label: 'Unexpected interest-rate decision',
    defaultHeadline: 'A major central bank delivers a more restrictive decision than expected',
    origin: 'Monetary policy',
    summary: 'Tests how a policy surprise could move relative yields, currencies, financing conditions and duration-sensitive assets.',
    transmission: [
      'The policy decision differs materially from the market baseline.',
      'Relative interest-rate expectations and bond yields adjust.',
      'Currencies, financing costs and valuation discount rates react.',
      'Equities and defensive assets may reprice as the new path is assessed.',
    ],
    assets: [
      { symbol: 'EURUSD', pressure: 'mixed', hypothesis: 'The currency response depends on which central bank surprises and how relative rate expectations change.' },
      { symbol: 'SPX', pressure: 'downward', hypothesis: 'A higher discount-rate path could pressure duration-sensitive equity valuations.' },
      { symbol: 'XAUUSD', pressure: 'mixed', hypothesis: 'Higher real yields may weigh on gold while risk aversion could support demand.' },
    ],
    confirmingSignals: ['Official decision and voting record', 'Material yield-curve repricing', 'Consistent guidance across the press conference and minutes'],
    counterSignals: ['Decision was already priced', 'Guidance offsets the headline move', 'Subsequent macro data weakens the expected policy path'],
  },
  {
    id: 'commodity-supply-shock',
    label: 'Commodity supply shock',
    defaultHeadline: 'A material commodity supply interruption is reported',
    origin: 'Commodity supply',
    summary: 'Tests how a verified loss of supply could affect the commodity, importing economies, production costs and inflation-sensitive assets.',
    transmission: [
      'Available supply or expected production falls.',
      'Inventories, substitutes and spare capacity determine the effective shortage.',
      'Import bills and downstream production costs may rise.',
      'Commodity prices, exposed currencies and broad markets may adjust.',
    ],
    assets: [
      { symbol: 'XAUUSD', pressure: 'mixed', hypothesis: 'Gold may respond to risk aversion, real yields and whether the shock directly affects precious-metal supply.' },
      { symbol: 'USDINR', pressure: 'upward', hypothesis: 'A larger import bill could create depreciation pressure on an exposed importing currency.' },
      { symbol: 'SPX', pressure: 'mixed', hypothesis: 'Producer gains may offset margin pressure for commodity-consuming sectors.' },
    ],
    confirmingSignals: ['Primary producer or regulator confirmation', 'Inventory draws across more than one source', 'Physical-market premiums or delivery times rise'],
    counterSignals: ['Production returns quickly', 'Strategic inventory release offsets the loss', 'Demand weakness absorbs the supply reduction'],
  },
  {
    id: 'export-restriction',
    label: 'Export restriction or tariff shock',
    defaultHeadline: 'A major exporter announces a new restriction on a critical input',
    origin: 'Trade policy',
    summary: 'Tests how an export restriction could affect substitute sourcing, trade balances, exposed currencies and company margins.',
    transmission: [
      'Cross-border availability of a critical input is restricted.',
      'Buyers seek substitutes, new routes or inventory buffers.',
      'Prices, working capital and production schedules may change.',
      'Trade balances, currencies and exposed sectors may reprice.',
    ],
    assets: [
      { symbol: 'USDINR', pressure: 'mixed', hypothesis: 'The currency effect depends on whether the economy is a net importer, exporter or substitute supplier.' },
      { symbol: 'SPX', pressure: 'mixed', hypothesis: 'Sector-level winners and losers may offset in the broad index.' },
      { symbol: 'XAUUSD', pressure: 'upward', hypothesis: 'Escalating trade uncertainty may increase defensive demand, subject to real-yield moves.' },
    ],
    confirmingSignals: ['Published legal text and effective date', 'Customs or shipment data shows a volume change', 'Importers report substitute costs or delivery delays'],
    counterSignals: ['Exemptions materially narrow the restriction', 'Alternative supply is available at similar cost', 'The measure is delayed, reversed or not enforced'],
  },
] as const

const lensQuestions: Record<MarketImpactDecisionLens, string[]> = {
  investor: [
    'Which existing holdings have direct revenue, cost or currency exposure?',
    'What observable signal would confirm or invalidate the impact path?',
    'Is the move already reflected in price, liquidity or positioning?',
  ],
  operator: [
    'Which suppliers, routes, contracts or customer prices are exposed?',
    'How long can inventory, hedges or alternative suppliers absorb the disruption?',
    'Which cash-flow, margin or FX threshold requires an operating response?',
  ],
  analyst: [
    'What is the primary source and does it have publication rights?',
    'Which independent source corroborates the claim and its timing?',
    'What alternative explanation fits the observed market move?',
  ],
}

export function marketObservationFreshness(observedAt: string | null, now = Date.now()) {
  if (!observedAt) return 'Timestamp unavailable'
  const observed = Date.parse(observedAt)
  if (!Number.isFinite(observed)) return 'Invalid timestamp'
  const minutes = Math.max(0, Math.round((now - observed) / 60_000))
  if (minutes < 60) return `${Math.max(1, minutes)} min old`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours} hr old`
  const days = Math.round(hours / 24)
  return `${days} days old · reference context`
}

export function buildMarketImpactBrief(
  input: {
    headline: string
    scenarioId: MarketImpactScenarioId
    decisionLens: MarketImpactDecisionLens
    severity: MarketImpactSeverity
    horizon: MarketImpactHorizon
  },
  marketAssets: readonly MarketAssetSnapshot[],
  now = Date.now(),
): MarketImpactBrief {
  const scenario = MARKET_IMPACT_SCENARIOS.find((item) => item.id === input.scenarioId)
    ?? MARKET_IMPACT_SCENARIOS[0]
  const title = input.headline.trim().slice(0, 140) || scenario.defaultHeadline
  const assetsBySymbol = new Map(marketAssets.map((asset) => [asset.symbol.toUpperCase(), asset]))
  const observations = scenario.assets.map((impact) => {
    const observation = assetsBySymbol.get(impact.symbol)
    return {
      ...impact,
      name: observation?.name ?? `${impact.symbol} observation unavailable`,
      price: observation?.price ?? null,
      changePercent: observation?.change_percent ?? null,
      source: observation?.source ?? null,
      observedAt: observation?.observed_at ?? null,
      freshness: marketObservationFreshness(observation?.observed_at ?? null, now),
    }
  })

  return {
    title,
    scenarioLabel: scenario.label,
    decisionLens: input.decisionLens,
    severity: input.severity,
    horizon: input.horizon,
    origin: scenario.origin,
    framing: scenario.summary,
    transmission: scenario.transmission,
    observations,
    confirmingSignals: scenario.confirmingSignals,
    counterSignals: scenario.counterSignals,
    decisionQuestions: lensQuestions[input.decisionLens],
    missingObservationCount: observations.filter((item) => item.price === null || item.observedAt === null).length,
  }
}

function readable(value: string) {
  return value.replace(/-/g, ' ')
}

export function marketImpactBriefText(brief: MarketImpactBrief, evidenceChecks: readonly string[]) {
  const lines = [
    'TradePulse Phase 9F event-to-market impact brief',
    '',
    `Event: ${brief.title}`,
    `Scenario: ${brief.scenarioLabel}`,
    `Origin: ${brief.origin}`,
    `Decision lens: ${readable(brief.decisionLens)}`,
    `Severity: ${readable(brief.severity)}`,
    `Horizon: ${readable(brief.horizon)}`,
    '',
    'Working frame',
    brief.framing,
    '',
    'Transmission hypothesis',
    ...brief.transmission.map((step, index) => `${index + 1}. ${step}`),
    '',
    'Market observations and hypotheses',
    ...brief.observations.map((item) => {
      const price = item.price === null ? 'unavailable' : item.price.toLocaleString('en-GB', { maximumFractionDigits: 4 })
      const change = item.changePercent === null ? 'change unavailable' : `${item.changePercent > 0 ? '+' : ''}${item.changePercent.toFixed(2)}%`
      return `- ${item.symbol}: ${price}; ${change}; ${item.freshness}; source: ${item.source ?? 'unavailable'}. Hypothesis: ${item.hypothesis}`
    }),
    '',
    'Confirming signals',
    ...brief.confirmingSignals.map((signal) => `- ${signal}`),
    '',
    'Counter-signals',
    ...brief.counterSignals.map((signal) => `- ${signal}`),
    '',
    'Decision questions',
    ...brief.decisionQuestions.map((question) => `- ${question}`),
    '',
    `User-marked evidence: ${evidenceChecks.length ? evidenceChecks.join('; ') : 'none yet'}`,
    '',
    'Boundary: This is a scenario hypothesis, not proof of causation, a price prediction, personalised advice or an instruction to trade. Observations retain their own source and timestamp.',
  ]
  return lines.join('\n')
}
