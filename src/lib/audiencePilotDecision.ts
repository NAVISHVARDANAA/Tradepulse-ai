export const MAX_AUDIENCE_INSIGHT_FILE_BYTES = 96 * 1024

const sensitiveKeys = new Set([
  'name',
  'fullname',
  'email',
  'emailaddress',
  'phone',
  'phonenumber',
  'telephone',
  'contact',
  'contactdetails',
  'participantid',
  'userid',
  'accountnumber',
  'brokerageaccount',
])

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i

type ResearchDecisionState = 'collect-more' | 'pilot-review' | 'iterate' | 'reframe'

export type AudienceInsightGate = {
  label: string
  value: string
  target: string
  met: boolean
}

export type AudienceInsightEvidence = {
  sessionCount: number
  scores: {
    averageClarity: number
    averageTrust: number
    averageValue: number
    fullJourneyPercent: number
    weeklyInterestPercent: number
    notRelevantPercent: number
  }
  distributions: {
    audienceRoles: Record<string, number>
    mostUseful: Record<string, number>
    confusionAreas: Record<string, number>
    expectedNextActions: Record<string, number>
    weeklyUse: Record<string, number>
  }
  researchDecision: {
    state: ResearchDecisionState
    label: string
    reason: string
    gates: AudienceInsightGate[]
  }
}

export type PilotDecisionBrief = {
  recommendation: ResearchDecisionState
  recommendationLabel: string
  recommendationReason: string
  experimentBacklog: Array<{
    priority: number
    title: string
    outcome: string
  }>
  topSignals: {
    audiencePerspective: string
    mostUseful: string
    biggestConfusion: string
    expectedNextAction: string
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function containsSensitiveInput(value: unknown): boolean {
  if (typeof value === 'string') return emailPattern.test(value)
  if (Array.isArray(value)) return value.some(containsSensitiveInput)
  if (!isRecord(value)) return false

  return Object.entries(value).some(([key, child]) => (
    sensitiveKeys.has(normalizeKey(key)) || containsSensitiveInput(child)
  ))
}

function boundedString(value: unknown, field: string, maximum = 240) {
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > maximum) {
    throw new Error(`${field} is missing or outside the accepted aggregate format.`)
  }
  return value.trim()
}

function boundedNumber(value: unknown, field: string, minimum: number, maximum: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(`${field} is outside the accepted aggregate range.`)
  }
  return value
}

function parseDistribution(value: unknown, field: string, sessionCount: number) {
  if (!isRecord(value) || Object.keys(value).length > 24) {
    throw new Error(`${field} is not a bounded aggregate distribution.`)
  }
  const parsed: Record<string, number> = {}
  for (const [label, count] of Object.entries(value)) {
    const safeLabel = boundedString(label, `${field} label`, 80)
    if (!Number.isInteger(count) || Number(count) < 0 || Number(count) > sessionCount) {
      throw new Error(`${field} contains an invalid aggregate count.`)
    }
    parsed[safeLabel] = Number(count)
  }
  const total = Object.values(parsed).reduce((sum, count) => sum + count, 0)
  if (total !== sessionCount) throw new Error(`${field} does not reconcile to the session count.`)
  return parsed
}

function expectedDecision(evidence: Pick<AudienceInsightEvidence, 'sessionCount' | 'scores' | 'researchDecision'>): ResearchDecisionState {
  if (evidence.sessionCount >= 8 && (
    evidence.scores.averageValue < 2.5 || evidence.scores.notRelevantPercent >= 50
  )) return 'reframe'
  if (evidence.researchDecision.gates.every((gate) => gate.met)) return 'pilot-review'
  if (evidence.sessionCount >= 5) return 'iterate'
  return 'collect-more'
}

export function parseAudienceInsightExport(input: unknown): AudienceInsightEvidence {
  if (!isRecord(input)) throw new Error('The file is not a TradePulse aggregate insight object.')
  if (containsSensitiveInput(input)) {
    throw new Error('The aggregate contains an identity, contact field or email-like value and was not imported.')
  }
  if (input.schemaVersion !== 1 || input.phase !== '9C') {
    throw new Error('Only Phase 9C schema-version 1 aggregate exports are accepted.')
  }
  for (const field of ['containsIdentityFields', 'containsContactFields', 'containsRawText', 'sourceFilesRetained', 'transmittedToTradePulse']) {
    if (input[field] !== false) throw new Error(`The aggregate privacy boundary is incomplete: ${field}.`)
  }
  const sessionCount = Number(input.sessionCount)
  if (!Number.isInteger(sessionCount) || sessionCount < 0 || sessionCount > 24) {
    throw new Error('Session count is outside the Phase 9C evidence ceiling.')
  }
  if (!isRecord(input.scores) || !isRecord(input.distributions) || !isRecord(input.researchDecision)) {
    throw new Error('The aggregate score, distribution or decision record is missing.')
  }
  const scores = {
    averageClarity: boundedNumber(input.scores.averageClarity, 'Average clarity', 0, 5),
    averageTrust: boundedNumber(input.scores.averageTrust, 'Average trust', 0, 5),
    averageValue: boundedNumber(input.scores.averageValue, 'Average value', 0, 5),
    fullJourneyPercent: boundedNumber(input.scores.fullJourneyPercent, 'Journey completion', 0, 100),
    weeklyInterestPercent: boundedNumber(input.scores.weeklyInterestPercent, 'Weekly interest', 0, 100),
    notRelevantPercent: boundedNumber(input.scores.notRelevantPercent, 'Not-relevant share', 0, 100),
  }
  const states: ResearchDecisionState[] = ['collect-more', 'pilot-review', 'iterate', 'reframe']
  if (!states.includes(input.researchDecision.state as ResearchDecisionState)) {
    throw new Error('The Phase 9C research decision is not recognized.')
  }
  if (input.researchDecision.authorizesAudienceActivation !== false) {
    throw new Error('The aggregate does not preserve the non-authorization boundary.')
  }
  if (!Array.isArray(input.researchDecision.gates) || input.researchDecision.gates.length !== 6) {
    throw new Error('The Phase 9C research gate set is incomplete.')
  }
  const gates = input.researchDecision.gates.map((gate, index) => {
    if (!isRecord(gate) || typeof gate.met !== 'boolean') {
      throw new Error(`Research gate ${index + 1} is invalid.`)
    }
    return {
      label: boundedString(gate.label, `Research gate ${index + 1} label`, 80),
      value: boundedString(gate.value, `Research gate ${index + 1} value`, 80),
      target: boundedString(gate.target, `Research gate ${index + 1} target`, 80),
      met: gate.met,
    }
  })
  const evidence: AudienceInsightEvidence = {
    sessionCount,
    scores,
    distributions: {
      audienceRoles: parseDistribution(input.distributions.audienceRoles, 'Audience roles', sessionCount),
      mostUseful: parseDistribution(input.distributions.mostUseful, 'Most-useful signals', sessionCount),
      confusionAreas: parseDistribution(input.distributions.confusionAreas, 'Confusion signals', sessionCount),
      expectedNextActions: parseDistribution(input.distributions.expectedNextActions, 'Expected next actions', sessionCount),
      weeklyUse: parseDistribution(input.distributions.weeklyUse, 'Weekly-use intent', sessionCount),
    },
    researchDecision: {
      state: input.researchDecision.state as ResearchDecisionState,
      label: boundedString(input.researchDecision.label, 'Research decision label', 120),
      reason: boundedString(input.researchDecision.reason, 'Research decision reason', 360),
      gates,
    },
  }
  if (expectedDecision(evidence) !== evidence.researchDecision.state) {
    throw new Error('The aggregate research decision does not reconcile to its evidence and gates.')
  }
  return evidence
}

function topLabel(counts: Record<string, number>) {
  return Object.entries(counts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'No signal'
}

export function buildPilotDecisionBrief(evidence: AudienceInsightEvidence): PilotDecisionBrief {
  const backlog: PilotDecisionBrief['experimentBacklog'] = []
  const add = (title: string, outcome: string) => backlog.push({ priority: backlog.length + 1, title, outcome })

  if (evidence.researchDecision.state === 'reframe') {
    add('Pause the pilot proposition', 'Reframe the audience problem and value promise before collecting another wave.')
  }
  if (evidence.sessionCount < 5) add('Complete the minimum research sample', 'Reach at least five valid, privacy-safe demo debriefs.')
  if (evidence.scores.fullJourneyPercent < 80) add('Simplify the guided journey', 'At least 80% of sessions complete all four demo stops.')
  if (evidence.scores.averageClarity < 4) add('Clarify the product story', 'Average clarity reaches at least 4.0 out of 5.')
  if (evidence.scores.averageTrust < 4) add('Strengthen evidence and data labels', 'Average trust reaches at least 4.0 out of 5.')
  if (evidence.scores.averageValue < 4) add('Tighten problem-solution fit', 'Average perceived value reaches at least 4.0 out of 5.')
  if (evidence.scores.weeklyInterestPercent < 70) add('Validate a repeat-use job', 'At least 70% answer yes or maybe to weekly use.')
  if (!backlog.length) {
    add('Run an accountable pilot review', 'Product, privacy and support owners independently review the evidence and bounded pilot envelope.')
    add('Prepare the first research wave', 'Use reference, delayed or curated demo data with no signup, payment or live execution.')
    add('Define stop and rollback evidence', 'Record support, privacy, cost and rollback ownership before any invitation decision.')
  }

  const labels: Record<ResearchDecisionState, [string, string]> = {
    'collect-more': ['Collect more evidence', 'The minimum sample is not met. Continue structured discovery before considering a pilot review.'],
    'iterate': ['Iterate before another audience wave', 'One or more research thresholds are below target. Address the prioritized experiments first.'],
    'reframe': ['Stop and reframe the proposition', 'The evidence meets the Phase 9C stop condition. Do not advance the current proposition.'],
    'pilot-review': ['Ready for accountable pilot review', 'All research thresholds are met, but external owners and evidence must still approve any outreach.'],
  }
  const [recommendationLabel, recommendationReason] = labels[evidence.researchDecision.state]

  return {
    recommendation: evidence.researchDecision.state,
    recommendationLabel,
    recommendationReason,
    experimentBacklog: backlog.slice(0, 5),
    topSignals: {
      audiencePerspective: topLabel(evidence.distributions.audienceRoles),
      mostUseful: topLabel(evidence.distributions.mostUseful),
      biggestConfusion: topLabel(evidence.distributions.confusionAreas),
      expectedNextAction: topLabel(evidence.distributions.expectedNextActions),
    },
  }
}

export function buildPilotDecisionExport(evidence: AudienceInsightEvidence) {
  const brief = buildPilotDecisionBrief(evidence)
  return {
    schemaVersion: 1,
    phase: '9D',
    status: 'draft-human-review-only',
    dataClassification: 'aggregate local audience decision brief',
    sourceEvidence: {
      phase: '9C',
      sessionCount: evidence.sessionCount,
      scores: evidence.scores,
      researchDecision: evidence.researchDecision,
      topSignals: brief.topSignals,
    },
    recommendation: {
      state: brief.recommendation,
      label: brief.recommendationLabel,
      reason: brief.recommendationReason,
    },
    experimentBacklog: brief.experimentBacklog,
    boundedPilotEnvelope: {
      maximumParticipants: 30,
      maximumDurationWeeks: 4,
      freeOfCharge: true,
      permittedData: ['reference', 'delayed', 'curated-demo'],
      liveRealtimeDataRequired: false,
    },
    externalHumanReviewRequired: [
      'accountable product owner',
      'participant consent and privacy review',
      'support and incident owner',
      'privacy-safe measurement approval',
      'cost ceiling approval',
      'rollback owner',
      'documented go or no-go decision',
    ],
    containsIdentityFields: false,
    containsContactFields: false,
    containsRawText: false,
    transmittedToTradePulse: false,
    authorizesInvitations: false,
    authorizesSignup: false,
    authorizesLiveData: false,
    authorizesFinancialExecution: false,
    generatedAt: new Date().toISOString(),
  }
}

export function buildPilotDecisionText(evidence: AudienceInsightEvidence) {
  const brief = buildPilotDecisionBrief(evidence)
  return [
    'TradePulse Phase 9D audience pilot decision brief',
    `Evidence: ${evidence.sessionCount} aggregate Phase 9C sessions`,
    `Recommendation: ${brief.recommendationLabel}`,
    `Reason: ${brief.recommendationReason}`,
    `Top perspective: ${brief.topSignals.audiencePerspective}`,
    `Most useful: ${brief.topSignals.mostUseful}`,
    `Biggest confusion: ${brief.topSignals.biggestConfusion}`,
    `Expected next action: ${brief.topSignals.expectedNextAction}`,
    'Prioritized experiments:',
    ...brief.experimentBacklog.map((item) => `${item.priority}. ${item.title} — ${item.outcome}`),
    'Pilot envelope: maximum 30 participants, four weeks, free, reference/delayed/curated data only.',
    'Boundary: unsigned draft only; no identity, contact data, upload, invitation, signup, live data or financial execution.',
  ].join('\n')
}
