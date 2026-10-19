import type { DemoAudienceRole } from './demoFeedback'

export const MAX_AUDIENCE_EVIDENCE_FILES = 24
export const MAX_AUDIENCE_EVIDENCE_FILE_BYTES = 64 * 1024
export const MIN_AUDIENCE_RESEARCH_SESSIONS = 5

const audienceRoles: DemoAudienceRole[] = [
  'investor',
  'analyst',
  'operator',
  'product-buyer',
  'other',
]

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

export type AudienceEvidence = {
  fingerprint: string
  audienceRole: DemoAudienceRole
  clarityScore: number
  trustScore: number
  valueScore: number
  mostUseful: string
  confusionArea: string
  expectedNextAction: string
  weeklyUse: 'yes' | 'maybe' | 'no' | 'not-answered'
  completedStops: number
  totalStops: number
}

export type AudienceDecisionState =
  | 'collect-more'
  | 'pilot-review'
  | 'iterate'
  | 'reframe'

export type AudienceInsightGate = {
  label: string
  value: string
  target: string
  met: boolean
}

export type AudienceInsightSummary = {
  sessionCount: number
  averageClarity: number
  averageTrust: number
  averageValue: number
  fullJourneyPercent: number
  weeklyInterestPercent: number
  notRelevantPercent: number
  roleCounts: Record<string, number>
  usefulCounts: Record<string, number>
  confusionCounts: Record<string, number>
  nextActionCounts: Record<string, number>
  weeklyUseCounts: Record<string, number>
  decision: AudienceDecisionState
  decisionLabel: string
  decisionReason: string
  gates: AudienceInsightGate[]
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

function boundedLabel(value: unknown, field: string, optional = false) {
  if (optional && (value === '' || value === null || value === undefined)) return 'Not answered'
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > 80) {
    throw new Error(`${field} is missing or outside the accepted evidence format.`)
  }
  return value.trim()
}

function rating(value: unknown, field: string) {
  if (!Number.isInteger(value) || Number(value) < 1 || Number(value) > 5) {
    throw new Error(`${field} must be a whole-number rating from 1 to 5.`)
  }
  return Number(value)
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round((values.reduce((total, value) => total + value, 0) / values.length) * 10) / 10
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return 0
  return Math.round((numerator / denominator) * 100)
}

export function parseAudienceFeedbackExport(input: unknown): AudienceEvidence {
  if (!isRecord(input)) throw new Error('The file is not a TradePulse feedback object.')
  if (containsSensitiveInput(input)) {
    throw new Error('The file contains an identity or contact field and was not imported.')
  }
  if (input.schemaVersion !== 1 || input.phase !== '9B') {
    throw new Error('Only Phase 9B schema-version 1 feedback exports are accepted.')
  }
  if (input.containsRequestedIdentityFields !== false || input.transmittedToTradePulse !== false) {
    throw new Error('The privacy boundary in this feedback export is incomplete.')
  }
  if (!isRecord(input.journey) || !isRecord(input.feedback)) {
    throw new Error('The journey or structured feedback record is missing.')
  }

  const feedback = input.feedback
  if (typeof feedback.audienceRole !== 'string' || !audienceRoles.includes(feedback.audienceRole as DemoAudienceRole)) {
    throw new Error('Audience perspective is not recognized.')
  }
  const completedStops = Number(input.journey.completedStops)
  const totalStops = Number(input.journey.totalStops)
  const supportedJourney = totalStops === 4 || totalStops === 5
  if (!Number.isInteger(completedStops) || completedStops < 0 || !supportedJourney || completedStops > totalStops) {
    throw new Error('The guided-journey evidence is not a supported four- or five-stop record.')
  }
  const weeklyUse = feedback.weeklyUse === '' || feedback.weeklyUse === undefined
    ? 'not-answered'
    : feedback.weeklyUse
  if (!['yes', 'maybe', 'no', 'not-answered'].includes(String(weeklyUse))) {
    throw new Error('Weekly-use intent is not recognized.')
  }

  const evidence = {
    audienceRole: feedback.audienceRole as DemoAudienceRole,
    clarityScore: rating(feedback.clarityScore, 'Clarity'),
    trustScore: rating(feedback.trustScore, 'Trust'),
    valueScore: rating(feedback.valueScore, 'Value'),
    mostUseful: boundedLabel(feedback.mostUseful, 'Most-useful signal'),
    confusionArea: boundedLabel(feedback.confusionArea, 'Confusion signal', true),
    expectedNextAction: boundedLabel(feedback.expectedNextAction, 'Next-action signal'),
    weeklyUse: weeklyUse as AudienceEvidence['weeklyUse'],
    completedStops,
    totalStops,
  }
  const fingerprint = JSON.stringify([
    input.feedbackSavedAt ?? null,
    input.exportedAt ?? null,
    ...Object.values(evidence),
  ])

  return { fingerprint, ...evidence }
}

export function synthesizeAudienceEvidence(evidence: AudienceEvidence[]): AudienceInsightSummary {
  const sessionCount = evidence.length
  const averageClarity = average(evidence.map((item) => item.clarityScore))
  const averageTrust = average(evidence.map((item) => item.trustScore))
  const averageValue = average(evidence.map((item) => item.valueScore))
  const fullJourneyPercent = percent(
    evidence.filter((item) => item.completedStops === item.totalStops).length,
    sessionCount,
  )
  const weeklyInterestPercent = percent(
    evidence.filter((item) => item.weeklyUse === 'yes' || item.weeklyUse === 'maybe').length,
    sessionCount,
  )
  const notRelevantPercent = percent(
    evidence.filter((item) => item.expectedNextAction === 'Not relevant today').length,
    sessionCount,
  )
  const gates: AudienceInsightGate[] = [
    { label: 'Research sample', value: `${sessionCount} sessions`, target: `At least ${MIN_AUDIENCE_RESEARCH_SESSIONS}`, met: sessionCount >= MIN_AUDIENCE_RESEARCH_SESSIONS },
    { label: 'Journey completion', value: `${fullJourneyPercent}%`, target: 'At least 80%', met: fullJourneyPercent >= 80 },
    { label: 'Clarity', value: `${averageClarity}/5`, target: 'At least 4.0', met: averageClarity >= 4 },
    { label: 'Trust', value: `${averageTrust}/5`, target: 'At least 4.0', met: averageTrust >= 4 },
    { label: 'Perceived value', value: `${averageValue}/5`, target: 'At least 4.0', met: averageValue >= 4 },
    { label: 'Weekly interest', value: `${weeklyInterestPercent}%`, target: 'At least 70%', met: weeklyInterestPercent >= 70 },
  ]

  let decision: AudienceDecisionState = 'collect-more'
  let decisionLabel = 'Collect more evidence'
  let decisionReason = `Import at least ${MIN_AUDIENCE_RESEARCH_SESSIONS} valid debriefs before interpreting the pattern.`
  if (sessionCount >= 8 && (averageValue < 2.5 || notRelevantPercent >= 50)) {
    decision = 'reframe'
    decisionLabel = 'Stop and reframe the proposition'
    decisionReason = 'A sufficiently sized sample shows weak value or strong irrelevance. Reframe before another audience wave.'
  } else if (gates.every((gate) => gate.met)) {
    decision = 'pilot-review'
    decisionLabel = 'Evidence supports pilot review'
    decisionReason = 'The research thresholds are met. This supports an accountable go/no-go review; it does not authorize invitations or activation.'
  } else if (sessionCount >= MIN_AUDIENCE_RESEARCH_SESSIONS) {
    decision = 'iterate'
    decisionLabel = 'Iterate before the next wave'
    decisionReason = 'The sample is usable, but one or more clarity, trust, value, completion or intent thresholds remain below target.'
  }

  return {
    sessionCount,
    averageClarity,
    averageTrust,
    averageValue,
    fullJourneyPercent,
    weeklyInterestPercent,
    notRelevantPercent,
    roleCounts: countBy(evidence.map((item) => item.audienceRole)),
    usefulCounts: countBy(evidence.map((item) => item.mostUseful)),
    confusionCounts: countBy(evidence.map((item) => item.confusionArea)),
    nextActionCounts: countBy(evidence.map((item) => item.expectedNextAction)),
    weeklyUseCounts: countBy(evidence.map((item) => item.weeklyUse)),
    decision,
    decisionLabel,
    decisionReason,
    gates,
  }
}

export function buildAudienceInsightExport(evidence: AudienceEvidence[]) {
  const summary = synthesizeAudienceEvidence(evidence)
  return {
    schemaVersion: 1,
    phase: '9C',
    dataClassification: 'aggregate local audience research evidence',
    containsIdentityFields: false,
    containsContactFields: false,
    containsRawText: false,
    sourceFilesRetained: false,
    transmittedToTradePulse: false,
    sessionCount: summary.sessionCount,
    scores: {
      averageClarity: summary.averageClarity,
      averageTrust: summary.averageTrust,
      averageValue: summary.averageValue,
      fullJourneyPercent: summary.fullJourneyPercent,
      weeklyInterestPercent: summary.weeklyInterestPercent,
      notRelevantPercent: summary.notRelevantPercent,
    },
    distributions: {
      audienceRoles: summary.roleCounts,
      mostUseful: summary.usefulCounts,
      confusionAreas: summary.confusionCounts,
      expectedNextActions: summary.nextActionCounts,
      weeklyUse: summary.weeklyUseCounts,
    },
    researchDecision: {
      state: summary.decision,
      label: summary.decisionLabel,
      reason: summary.decisionReason,
      gates: summary.gates,
      authorizesAudienceActivation: false,
    },
    generatedAt: new Date().toISOString(),
  }
}

export function buildAudienceInsightText(evidence: AudienceEvidence[]) {
  const summary = synthesizeAudienceEvidence(evidence)
  const top = (counts: Record<string, number>) => Object.entries(counts)
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'Not enough evidence'

  return [
    'TradePulse Phase 9C audience insight synthesis',
    `Sessions: ${summary.sessionCount}`,
    `Clarity / trust / value: ${summary.averageClarity} / ${summary.averageTrust} / ${summary.averageValue} out of 5`,
    `Full journey: ${summary.fullJourneyPercent}%`,
    `Weekly interest (yes or maybe): ${summary.weeklyInterestPercent}%`,
    `Top audience perspective: ${top(summary.roleCounts)}`,
    `Most useful: ${top(summary.usefulCounts)}`,
    `Most common confusion: ${top(summary.confusionCounts)}`,
    `Most common next action: ${top(summary.nextActionCounts)}`,
    `Research decision: ${summary.decisionLabel}`,
    `Reason: ${summary.decisionReason}`,
    'Boundary: aggregate local evidence only; no raw notes, identity, contact data, upload, invitation or activation.',
  ].join('\n')
}
