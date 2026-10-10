import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  app,
  panel,
  journey,
  banner,
  navigation,
  pageHeader,
  styles,
  manifestText,
  packageText,
  ci,
  build,
  deploy,
  verify,
  productionTest,
  roadmap,
] = await Promise.all([
  read('src/App.tsx'),
  read('src/components/DemoFeedbackPanel.tsx'),
  read('src/lib/demoFeedback.ts'),
  read('src/components/DemoModeBanner.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/demo-feedback.css'),
  read('public/beta-release.json'),
  read('package.json'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('docs/PRODUCT_ROADMAP.md'),
])

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)

assert(
  manifest.phase === '9B' && manifest.status === 'audience_feedback_readiness_candidate',
  'Manifest is not the Phase 9B audience-feedback readiness candidate',
)
assert(packageJson.scripts?.['check:audience-feedback-readiness'], 'Package omits the Phase 9B check')
assert(manifest.requiredChecks.includes('check:audience-feedback-readiness'), 'Manifest omits the Phase 9B check')

for (const contract of [
  'workspaceEnabled',
  'structuredDebriefEnabled',
  'guidedJourneyProgressEnabled',
  'browserSessionStorageOnly',
  'userControlledCopyEnabled',
  'userControlledExportEnabled',
]) {
  assert(manifest.audienceFeedbackReadiness?.[contract] === true, `Audience feedback contract is not enabled: ${contract}`)
}
assert(manifest.audienceFeedbackReadiness?.audienceJourneyStepCount === 4, 'Audience journey is not four steps')
for (const lock of [
  'identityFieldsRequested', 'contactFieldsRequested', 'automaticSubmissionEnabled',
  'externalAnalyticsEnabled', 'publicSignupEnabled', 'invitationDeliveryEnabled',
  'checkoutEnabled', 'orderRoutingEnabled', 'paymentExecutionEnabled',
  'moneyMovementEnabled', 'customerFundingEnabled', 'custodyEnabled', 'settlementEnabled',
]) {
  assert(manifest.audienceFeedbackReadiness?.[lock] === false, `Audience feedback lock changed: ${lock}`)
}

for (const contract of [
  'Turn a live demo into evidence.',
  'Audience perspective',
  'Clarity rating',
  'Trust rating',
  'Value rating',
  'Expected next action',
  'do not enter names or contact details',
  'Save local debrief',
  'Copy summary',
  'Download JSON',
  'Nothing was submitted',
]) {
  assert(panel.includes(contract), `Audience debrief omits: ${contract}`)
}
for (const forbidden of ['type="email"', 'type="tel"', 'fetch(', 'supabase']) {
  assert(!panel.includes(forbidden), `Audience debrief introduces a forbidden collection or transport path: ${forbidden}`)
  assert(!journey.includes(forbidden), `Audience journey introduces a forbidden transport path: ${forbidden}`)
}
for (const contract of [
  "DEMO_JOURNEY_KEY = 'tradepulse-demo-journey-v1'",
  'sessionStorage.setItem',
  'sessionStorage.removeItem',
  'containsRequestedIdentityFields: false',
  'transmittedToTradePulse: false',
]) {
  assert(journey.includes(contract), `Audience journey contract omits: ${contract}`)
}
for (const route of ['#markets', '#analytics-studio', '#stock-research', '#forecasts']) {
  assert(journey.includes(`'${route}'`), `Guided audience journey omits ${route}`)
}
for (const contract of [
  "import('./components/DemoFeedbackPanel')",
  "activeHref === '#demo-feedback'",
  'recordDemoRouteVisit(activeHref)',
  'resetDemoJourney()',
]) {
  assert(app.includes(contract), `App omits audience-feedback contract: ${contract}`)
}
assert(navigation.includes("href: '#demo-feedback'"), 'Navigation omits audience debrief')
assert(pageHeader.includes("'#demo-feedback'"), 'Audience debrief page header is missing')
assert(banner.includes('Audience debrief') && banner.includes('guided stops'), 'Demo banner omits feedback progress')
for (const selector of ['.demo-feedback-summary', '.demo-feedback-progress', '.demo-feedback-form', '.demo-feedback-export']) {
  assert(styles.includes(selector), `Audience feedback styling omits ${selector}`)
}

for (const workflow of [ci, build, deploy, verify]) {
  assert(workflow.includes('npm run check:audience-feedback-readiness'), 'A web release gate omits the Phase 9B check')
}
for (const token of ['BUILD_PHASE_9B', 'DEPLOY_PHASE_9B', 'VERIFY_WEB_PHASE_9B']) {
  assert([build, deploy, verify].some((workflow) => workflow.includes(token)), `Web release token is missing: ${token}`)
}
for (const contract of ['#demo-feedback', 'Turn a live demo into evidence.', 'Save local debrief', 'tradepulse-demo-journey-v1']) {
  assert(productionTest.includes(contract), `Production audience-feedback smoke omits: ${contract}`)
}
assert(roadmap.includes('Phase 9B — audience-feedback readiness'), 'Roadmap omits Phase 9B')

console.log('Audience-feedback readiness contract passed: guided progress, privacy-safe debrief and controlled export guarded.')
