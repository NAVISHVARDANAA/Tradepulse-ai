export const MAX_PILOT_DECISION_FILE_BYTES = 96 * 1024

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

export type PilotRecommendationState = 'collect-more' | 'pilot-review' | 'iterate' | 'reframe'

export type PilotDecisionEvidence = {
  sessionCount: number
  recommendation: {
    state: PilotRecommendationState
    label: string
    reason: string
  }
  topSignals: {
    audiencePerspective: string
    mostUseful: string
    biggestConfusion: string
    expectedNextAction: string
  }
  experimentBacklog: Array<{
    priority: number
    title: string
    outcome: string
  }>
}

export type PilotAudienceCohort = {
  key: string
  label: string
  participantTarget: number
  learningGoal: string
  recruitmentRoute: string
}

export type PilotInterviewQuestion = {
  sequence: number
  stage: 'context' | 'task' | 'trust' | 'value' | 'close'
  question: string
  facilitatorNote: string
}

export type PilotMarketingChannel = {
  priority: number
  channel: string
  participantTarget: number
  method: string
  guardrail: string
}

export type PilotLaunchKit = {
  readiness: 'hold-outreach' | 'human-review-required'
  readinessLabel: string
  readinessReason: string
  positioning: {
    headline: string
    promise: string
    proof: string
    boundary: string
  }
  cohorts: PilotAudienceCohort[]
  interviewGuide: PilotInterviewQuestion[]
  channels: PilotMarketingChannel[]
  scorecard: Array<{ metric: string; target: string; stopSignal: string }>
  weeklyPlan: Array<{ week: number; focus: string; output: string }>
  outreachDraft: string
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

function boundedString(value: unknown, field: string, maximum = 360) {
  if (typeof value !== 'string' || value.trim().length < 1 || value.trim().length > maximum) {
    throw new Error(`${field} is missing or outside the accepted decision-brief format.`)
  }
  return value.trim()
}

function requireFalse(input: Record<string, unknown>, field: string) {
  if (input[field] !== false) throw new Error(`The Phase 9D safety boundary is incomplete: ${field}.`)
}

export function parsePilotDecisionExport(input: unknown): PilotDecisionEvidence {
  if (!isRecord(input)) throw new Error('The file is not a TradePulse pilot decision brief.')
  if (containsSensitiveInput(input)) {
    throw new Error('The decision brief contains an identity, contact field or email-like value and was not imported.')
  }
  if (input.schemaVersion !== 1 || input.phase !== '9D' || input.status !== 'draft-human-review-only') {
    throw new Error('Only Phase 9D schema-version 1 unsigned decision drafts are accepted.')
  }
  if (!isRecord(input.sourceEvidence) || input.sourceEvidence.phase !== '9C') {
    throw new Error('The Phase 9C aggregate evidence reference is missing.')
  }
  if (!isRecord(input.recommendation) || !isRecord(input.sourceEvidence.researchDecision)) {
    throw new Error('The reconciled recommendation is missing.')
  }
  const states: PilotRecommendationState[] = ['collect-more', 'pilot-review', 'iterate', 'reframe']
  const state = input.recommendation.state as PilotRecommendationState
  if (!states.includes(state) || input.sourceEvidence.researchDecision.state !== state) {
    throw new Error('The decision recommendation does not reconcile to its Phase 9C evidence.')
  }
  const sessionCount = Number(input.sourceEvidence.sessionCount)
  if (!Number.isInteger(sessionCount) || sessionCount < 0 || sessionCount > 24) {
    throw new Error('The aggregate session count is outside the Phase 9C ceiling.')
  }
  if (!isRecord(input.sourceEvidence.topSignals)) throw new Error('The aggregate top signals are missing.')
  if (!Array.isArray(input.experimentBacklog) || input.experimentBacklog.length < 1 || input.experimentBacklog.length > 5) {
    throw new Error('The bounded Phase 9D experiment backlog is missing.')
  }
  const experimentBacklog = input.experimentBacklog.map((item, index) => {
    if (!isRecord(item) || item.priority !== index + 1) {
      throw new Error('The Phase 9D experiment priorities are inconsistent.')
    }
    return {
      priority: index + 1,
      title: boundedString(item.title, `Experiment ${index + 1} title`, 120),
      outcome: boundedString(item.outcome, `Experiment ${index + 1} outcome`, 240),
    }
  })
  if (!isRecord(input.boundedPilotEnvelope)
    || input.boundedPilotEnvelope.maximumParticipants !== 30
    || input.boundedPilotEnvelope.maximumDurationWeeks !== 4
    || input.boundedPilotEnvelope.freeOfCharge !== true
    || input.boundedPilotEnvelope.liveRealtimeDataRequired !== false
    || !Array.isArray(input.boundedPilotEnvelope.permittedData)
    || input.boundedPilotEnvelope.permittedData.join('|') !== 'reference|delayed|curated-demo') {
    throw new Error('The bounded Phase 9D pilot envelope is incomplete or changed.')
  }
  const requiredReviews = [
    'accountable product owner',
    'participant consent and privacy review',
    'support and incident owner',
    'privacy-safe measurement approval',
    'cost ceiling approval',
    'rollback owner',
    'documented go or no-go decision',
  ]
  const externalHumanReviewRequired = input.externalHumanReviewRequired
  if (!Array.isArray(externalHumanReviewRequired)
    || requiredReviews.some((review) => !externalHumanReviewRequired.includes(review))) {
    throw new Error('The external human-review requirements are incomplete.')
  }
  for (const field of [
    'containsIdentityFields',
    'containsContactFields',
    'containsRawText',
    'transmittedToTradePulse',
    'authorizesInvitations',
    'authorizesSignup',
    'authorizesLiveData',
    'authorizesFinancialExecution',
  ]) requireFalse(input, field)

  return {
    sessionCount,
    recommendation: {
      state,
      label: boundedString(input.recommendation.label, 'Recommendation label', 120),
      reason: boundedString(input.recommendation.reason, 'Recommendation reason'),
    },
    topSignals: {
      audiencePerspective: boundedString(input.sourceEvidence.topSignals.audiencePerspective, 'Audience perspective', 80),
      mostUseful: boundedString(input.sourceEvidence.topSignals.mostUseful, 'Most-useful signal', 80),
      biggestConfusion: boundedString(input.sourceEvidence.topSignals.biggestConfusion, 'Biggest-confusion signal', 80),
      expectedNextAction: boundedString(input.sourceEvidence.topSignals.expectedNextAction, 'Expected-next-action signal', 80),
    },
    experimentBacklog,
  }
}

export function buildPilotLaunchKit(evidence: PilotDecisionEvidence): PilotLaunchKit {
  const isReviewReady = evidence.recommendation.state === 'pilot-review'
  const outreachDraft = [
    'Hi — I am testing TradePulse AI, a research prototype that brings global market, country and event context into one guided workspace.',
    'I am looking for 20–25 minutes of honest usability feedback, not an endorsement or investment decision.',
    'The session is free and uses clearly labelled reference, delayed or curated demo data. It does not provide personalised investment advice or execute trades.',
    'Would you be open to a guided research session?',
  ].join(' ')

  return {
    readiness: isReviewReady ? 'human-review-required' : 'hold-outreach',
    readinessLabel: isReviewReady ? 'Prepare for accountable human review' : 'Hold audience outreach',
    readinessReason: isReviewReady
      ? 'The product evidence reached pilot review, but consent, privacy, support, measurement, cost and rollback owners must still approve outreach.'
      : `The Phase 9D recommendation is “${evidence.recommendation.label}”. Complete the experiment backlog before inviting a real audience.`,
    positioning: {
      headline: 'Understand global market signals without the data overload.',
      promise: 'TradePulse connects market movement, country context and world-event evidence in one guided research experience.',
      proof: 'Show the guided demo, transparent source and freshness labels, and the evidence behind each insight.',
      boundary: 'Research and education only. No guaranteed predictions, personalised advice, real-time-feed claim or trade execution.',
    },
    cohorts: [
      { key: 'self-directed-investors', label: 'Self-directed retail investors', participantTarget: 6, learningGoal: 'Test whether the guided workflow improves independent market research.', recruitmentRoute: 'Trusted personal network and consented introductions' },
      { key: 'active-research-users', label: 'Active market research users', participantTarget: 6, learningGoal: 'Compare the evidence workflow with existing research tools.', recruitmentRoute: 'Small investing and research communities with moderator approval' },
      { key: 'finance-data-professionals', label: 'Finance and data professionals', participantTarget: 6, learningGoal: 'Stress-test data labels, credibility and analytical usefulness.', recruitmentRoute: 'Professional peers and relevant LinkedIn contacts' },
      { key: 'global-sme-operators', label: 'Globally exposed SME operators', participantTarget: 6, learningGoal: 'Test currency, commodity and country-event relevance for business decisions.', recruitmentRoute: 'Founder and operator networks with direct consent' },
      { key: 'finance-learners', label: 'Finance learners and educators', participantTarget: 6, learningGoal: 'Test clarity, education value and misunderstanding risk.', recruitmentRoute: 'Alumni or learning groups with organizer approval' },
    ],
    interviewGuide: [
      { sequence: 1, stage: 'context', question: 'How do you currently understand a market move or world event?', facilitatorNote: 'Ask for the last real example; do not describe TradePulse yet.' },
      { sequence: 2, stage: 'context', question: 'What is the hardest or most time-consuming part of that process?', facilitatorNote: 'Capture the job and friction, not a feature request.' },
      { sequence: 3, stage: 'task', question: 'Looking at this first screen, what do you believe TradePulse helps you do?', facilitatorNote: 'Measure unaided comprehension before prompting.' },
      { sequence: 4, stage: 'task', question: 'Please use the guided demo to explain one market move in your own words.', facilitatorNote: 'Observe navigation, hesitation and time to first useful insight.' },
      { sequence: 5, stage: 'trust', question: 'Which source, freshness or uncertainty labels do you notice, and what do they mean to you?', facilitatorNote: 'Do not teach the labels until the participant answers.' },
      { sequence: 6, stage: 'trust', question: 'What would make you trust this more, and what claim would make you distrust it?', facilitatorNote: 'Probe evidence, data age and prediction expectations.' },
      { sequence: 7, stage: 'value', question: 'What was most useful, and what felt confusing or unnecessary?', facilitatorNote: 'Ask for one concrete example of each.' },
      { sequence: 8, stage: 'value', question: 'When, if ever, would you use this in a normal week?', facilitatorNote: 'Look for a repeatable job rather than polite interest.' },
      { sequence: 9, stage: 'value', question: 'What tool or manual process would TradePulse replace or sit beside?', facilitatorNote: 'This reveals alternatives and the real competitor.' },
      { sequence: 10, stage: 'close', question: 'If this reliably solved that job, what outcome would make it valuable enough to pay for?', facilitatorNote: 'Explore value and willingness to pay without selling or collecting payment.' },
      { sequence: 11, stage: 'close', question: 'What is the single most important change before you would recommend another session?', facilitatorNote: 'End with prioritization, then explain how aggregate feedback is used.' },
    ],
    channels: [
      { priority: 1, channel: 'Founder-led conversations', participantTarget: 10, method: 'Invite known, relevant people individually after approval.', guardrail: 'No bulk messaging, incentives, pressure or implied investment benefit.' },
      { priority: 2, channel: 'LinkedIn learning posts', participantTarget: 8, method: 'Share the problem, a labelled demo clip and a narrow research invitation.', guardrail: 'Do not claim accuracy, guaranteed returns, live data or autonomous trading.' },
      { priority: 3, channel: 'Approved niche communities', participantTarget: 6, method: 'Ask moderators before posting to investing, fintech or analytics groups.', guardrail: 'Respect community rules and avoid promotional repetition.' },
      { priority: 4, channel: 'Participant referrals', participantTarget: 6, method: 'Ask satisfied participants for one consented introduction.', guardrail: 'Never disclose who participated or import address books.' },
    ],
    scorecard: [
      { metric: 'Full guided-journey completion', target: '≥ 80%', stopSignal: '< 60% after the first five sessions' },
      { metric: 'Average clarity', target: '≥ 4.0 / 5', stopSignal: '< 3.0 / 5' },
      { metric: 'Average trust', target: '≥ 4.0 / 5', stopSignal: '< 3.0 / 5 or repeated unsafe interpretation' },
      { metric: 'Average perceived value', target: '≥ 4.0 / 5', stopSignal: '< 2.5 / 5' },
      { metric: 'Weekly-use interest', target: '≥ 70% yes or maybe', stopSignal: '≥ 50% not relevant' },
      { metric: 'Time to first useful insight', target: '≤ 5 minutes', stopSignal: '> 10 minutes in three sessions' },
      { metric: 'Organic follow-up interest', target: '≥ 30% request another session', stopSignal: 'No follow-up demand after ten sessions' },
    ],
    weeklyPlan: [
      { week: 1, focus: 'Approve and calibrate', output: 'Review owners assigned, script tested internally, first five sessions scheduled only after authorization.' },
      { week: 2, focus: 'Run the first evidence wave', output: 'Five to ten structured sessions and one privacy-safe aggregate.' },
      { week: 3, focus: 'Iterate one major friction', output: 'One focused product/message change tested with the next cohort.' },
      { week: 4, focus: 'Close and decide', output: 'Aggregate results, stop/continue recommendation and documented owner decision.' },
    ],
    outreachDraft,
  }
}

export function buildPilotLaunchExport(evidence: PilotDecisionEvidence) {
  const kit = buildPilotLaunchKit(evidence)
  return {
    schemaVersion: 1,
    phase: '9E',
    status: 'unsigned-research-launch-kit',
    sourceDecision: {
      phase: '9D',
      sessionCount: evidence.sessionCount,
      recommendation: evidence.recommendation,
      topSignals: evidence.topSignals,
      experimentBacklog: evidence.experimentBacklog,
    },
    ...kit,
    participantCeiling: 30,
    durationCeilingWeeks: 4,
    freeOfCharge: true,
    permittedData: ['reference', 'delayed', 'curated-demo'],
    containsIdentityFields: false,
    containsContactFields: false,
    containsRawParticipantNotes: false,
    transmittedToTradePulse: false,
    authorizesOutreach: false,
    authorizesSignup: false,
    authorizesAnalytics: false,
    authorizesLiveData: false,
    authorizesFinancialExecution: false,
    generatedAt: new Date().toISOString(),
  }
}

export function buildPilotInterviewText(evidence: PilotDecisionEvidence) {
  const kit = buildPilotLaunchKit(evidence)
  return [
    'TradePulse Phase 9E research interview guide',
    `Decision state: ${kit.readinessLabel}`,
    'Consent reminder: explain the research purpose, voluntary participation, data boundary and right to stop before beginning.',
    ...kit.interviewGuide.map((item) => `${item.sequence}. ${item.question} (${item.facilitatorNote})`),
    'Boundary: do not collect identity/contact details in TradePulse, provide investment advice, promise returns or execute any action.',
  ].join('\n')
}
