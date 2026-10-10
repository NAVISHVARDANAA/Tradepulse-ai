export const DEMO_JOURNEY_EVENT = 'tradepulse-demo-journey-change'
export const DEMO_JOURNEY_KEY = 'tradepulse-demo-journey-v1'

export const DEMO_JOURNEY_ROUTES = [
  '#markets',
  '#analytics-studio',
  '#stock-research',
  '#forecasts',
] as const

export type DemoAudienceRole =
  | 'investor'
  | 'analyst'
  | 'operator'
  | 'product-buyer'
  | 'other'

export type DemoFeedbackDraft = {
  audienceRole: DemoAudienceRole | ''
  clarityScore: number
  trustScore: number
  valueScore: number
  mostUseful: string
  confusionArea: string
  expectedNextAction: string
  weeklyUse: 'yes' | 'maybe' | 'no' | ''
  facilitatorObservation: string
}

export type DemoJourneySnapshot = {
  startedAt: string | null
  visitedRoutes: string[]
  feedback: DemoFeedbackDraft | null
  feedbackSavedAt: string | null
}

export const emptyDemoFeedback: DemoFeedbackDraft = {
  audienceRole: '',
  clarityScore: 0,
  trustScore: 0,
  valueScore: 0,
  mostUseful: '',
  confusionArea: '',
  expectedNextAction: '',
  weeklyUse: '',
  facilitatorObservation: '',
}

const emptySnapshot = (): DemoJourneySnapshot => ({
  startedAt: null,
  visitedRoutes: [],
  feedback: null,
  feedbackSavedAt: null,
})

function emit(snapshot: DemoJourneySnapshot) {
  window.dispatchEvent(new CustomEvent(DEMO_JOURNEY_EVENT, { detail: snapshot }))
}

function store(snapshot: DemoJourneySnapshot) {
  sessionStorage.setItem(DEMO_JOURNEY_KEY, JSON.stringify(snapshot))
  emit(snapshot)
  return snapshot
}

export function getDemoJourneySnapshot(): DemoJourneySnapshot {
  try {
    const stored = sessionStorage.getItem(DEMO_JOURNEY_KEY)
    if (!stored) return emptySnapshot()
    const parsed = JSON.parse(stored) as Partial<DemoJourneySnapshot>
    return {
      startedAt: typeof parsed.startedAt === 'string' ? parsed.startedAt : null,
      visitedRoutes: Array.isArray(parsed.visitedRoutes)
        ? parsed.visitedRoutes.filter((route) => DEMO_JOURNEY_ROUTES.includes(route as typeof DEMO_JOURNEY_ROUTES[number]))
        : [],
      feedback: parsed.feedback ?? null,
      feedbackSavedAt: typeof parsed.feedbackSavedAt === 'string' ? parsed.feedbackSavedAt : null,
    }
  } catch {
    return emptySnapshot()
  }
}

export function resetDemoJourney() {
  return store({
    ...emptySnapshot(),
    startedAt: new Date().toISOString(),
  })
}

export function recordDemoRouteVisit(route: string) {
  if (!DEMO_JOURNEY_ROUTES.includes(route as typeof DEMO_JOURNEY_ROUTES[number])) {
    return getDemoJourneySnapshot()
  }

  const snapshot = getDemoJourneySnapshot()
  const visitedRoutes = snapshot.visitedRoutes.includes(route)
    ? snapshot.visitedRoutes
    : [...snapshot.visitedRoutes, route]

  return store({
    ...snapshot,
    startedAt: snapshot.startedAt ?? new Date().toISOString(),
    visitedRoutes,
  })
}

export function saveDemoFeedback(feedback: DemoFeedbackDraft) {
  return store({
    ...getDemoJourneySnapshot(),
    feedback,
    feedbackSavedAt: new Date().toISOString(),
  })
}

export function clearDemoFeedbackSession() {
  sessionStorage.removeItem(DEMO_JOURNEY_KEY)
  const snapshot = emptySnapshot()
  emit(snapshot)
  return snapshot
}

export function buildDemoFeedbackExport(snapshot = getDemoJourneySnapshot()) {
  return {
    schemaVersion: 1,
    phase: '9B',
    dataClassification: 'user-controlled local demo evidence',
    containsRequestedIdentityFields: false,
    transmittedToTradePulse: false,
    journey: {
      startedAt: snapshot.startedAt,
      completedStops: snapshot.visitedRoutes.length,
      totalStops: DEMO_JOURNEY_ROUTES.length,
      visitedRoutes: snapshot.visitedRoutes,
    },
    feedback: snapshot.feedback,
    feedbackSavedAt: snapshot.feedbackSavedAt,
    exportedAt: new Date().toISOString(),
  }
}

export function buildDemoFeedbackSummary(snapshot = getDemoJourneySnapshot()) {
  const feedback = snapshot.feedback
  if (!feedback) return 'No audience feedback has been saved for this demo session.'

  return [
    'TradePulse Phase 9B audience debrief',
    `Journey: ${snapshot.visitedRoutes.length}/${DEMO_JOURNEY_ROUTES.length} stops`,
    `Audience role: ${feedback.audienceRole}`,
    `Clarity: ${feedback.clarityScore}/5`,
    `Trust: ${feedback.trustScore}/5`,
    `Perceived value: ${feedback.valueScore}/5`,
    `Most useful: ${feedback.mostUseful}`,
    `Confusion area: ${feedback.confusionArea || 'None selected'}`,
    `Expected next action: ${feedback.expectedNextAction}`,
    `Would use weekly: ${feedback.weeklyUse || 'Not answered'}`,
    `Facilitator observation: ${feedback.facilitatorObservation || 'None recorded'}`,
    'Boundary: local-only evidence; no identity or contact field requested; not submitted to TradePulse.',
  ].join('\n')
}
