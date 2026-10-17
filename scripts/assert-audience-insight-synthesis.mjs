import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  app,
  panel,
  synthesis,
  navigation,
  pageHeader,
  styles,
  manifestText,
  packageText,
  ci,
  build,
  deploy,
  verify,
  deployedVerifier,
  browserTest,
  productionTest,
  roadmap,
  guide,
] = await Promise.all([
  read('src/App.tsx'),
  read('src/components/AudienceInsightsPanel.tsx'),
  read('src/lib/audienceInsights.ts'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/audience-insights.css'),
  read('public/beta-release.json'),
  read('package.json'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('scripts/verify-web-deployment.mjs'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/AUDIENCE_INSIGHT_SYNTHESIS.md'),
])

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)

assert(
  manifest.phase === '9D' && manifest.status === 'audience_pilot_decision_brief_candidate',
  'Manifest is not the Phase 9C audience-insight synthesis candidate',
)
assert(packageJson.scripts?.['check:audience-insight-synthesis'], 'Package omits the Phase 9C check')
assert(manifest.requiredChecks.includes('check:audience-insight-synthesis'), 'Manifest omits the Phase 9C check')

for (const contract of [
  'workspaceEnabled',
  'phase9BImportEnabled',
  'aggregateScorecardEnabled',
  'segmentDistributionsEnabled',
  'explicitResearchThresholdsEnabled',
  'aggregateExportEnabled',
  'browserMemoryOnly',
]) {
  assert(manifest.audienceInsightSynthesis?.[contract] === true, `Audience insight contract is not enabled: ${contract}`)
}
assert(manifest.audienceInsightSynthesis?.maximumLocalEvidenceFiles === 24, 'Local evidence ceiling changed')
assert(manifest.audienceInsightSynthesis?.minimumResearchSample === 5, 'Minimum research sample changed')
for (const lock of [
  'sourceFilesRetained', 'rawFacilitatorNotesIncluded', 'identityFieldsAccepted',
  'contactFieldsAccepted', 'automaticSubmissionEnabled', 'externalAnalyticsEnabled',
  'pilotAuthorizationEnabled', 'publicSignupEnabled', 'invitationDeliveryEnabled',
  'licensedRealtimeFeedEnabled', 'checkoutEnabled', 'orderRoutingEnabled',
  'paymentExecutionEnabled', 'moneyMovementEnabled', 'customerFundingEnabled',
  'custodyEnabled', 'settlementEnabled',
]) {
  assert(manifest.audienceInsightSynthesis?.[lock] === false, `Audience insight lock changed: ${lock}`)
}

for (const contract of [
  'Turn debrief files into a research decision.',
  'On-device, aggregate-only analysis',
  'Import Phase 9B JSON',
  'Files with identity or contact fields fail closed.',
  'Evidence supports pilot review',
  'does not authorize invitations or activation',
  'Download aggregate JSON',
  'This research signal cannot invite participants',
]) {
  assert(`${panel}\n${synthesis}`.includes(contract), `Audience insight workspace omits: ${contract}`)
}
for (const forbidden of ['type="email"', 'type="tel"', 'fetch(', 'supabase', 'sessionStorage', 'localStorage']) {
  assert(!panel.includes(forbidden), `Audience insight panel introduces a forbidden collection, persistence or transport path: ${forbidden}`)
  assert(!synthesis.includes(forbidden), `Audience insight library introduces a forbidden collection, persistence or transport path: ${forbidden}`)
}
for (const contract of [
  'MAX_AUDIENCE_EVIDENCE_FILES = 24',
  'MAX_AUDIENCE_EVIDENCE_FILE_BYTES = 64 * 1024',
  'MIN_AUDIENCE_RESEARCH_SESSIONS = 5',
  "input.schemaVersion !== 1 || input.phase !== '9B'",
  'containsSensitiveInput(input)',
  "decision = 'reframe'",
  "decision = 'pilot-review'",
  "decision = 'iterate'",
  'containsRawText: false',
  'sourceFilesRetained: false',
  'transmittedToTradePulse: false',
  'authorizesAudienceActivation: false',
]) {
  assert(synthesis.includes(contract), `Audience synthesis contract omits: ${contract}`)
}
for (const contract of [
  "import('./components/AudienceInsightsPanel')",
  "activeHref === '#audience-insights'",
]) {
  assert(app.includes(contract), `App omits audience-insight contract: ${contract}`)
}
assert(navigation.includes("href: '#audience-insights'"), 'Navigation omits audience insights')
assert(pageHeader.includes("'#audience-insights'"), 'Audience insight page header is missing')
for (const selector of ['.audience-insights-hero', '.audience-insights-import', '.audience-insight-metrics', '.audience-insight-decision', '.audience-insight-distributions']) {
  assert(styles.includes(selector), `Audience insight styling omits ${selector}`)
}

for (const workflow of [ci, build, deploy, verify]) {
  assert(workflow.includes('npm run check:audience-insight-synthesis'), 'A web release gate omits the Phase 9C check')
}
for (const token of ['BUILD_PHASE_9D', 'DEPLOY_PHASE_9D', 'VERIFY_WEB_PHASE_9D']) {
  assert([build, deploy, verify].some((workflow) => workflow.includes(token)), `Web release token is missing: ${token}`)
}
for (const contract of ['audienceInsightSynthesis', 'maximumLocalEvidenceFiles', 'pilotAuthorizationEnabled']) {
  assert(deployedVerifier.includes(contract), `Deployed verifier omits Phase 9C contract: ${contract}`)
}
for (const contract of ['#audience-insights', 'Import Phase 9B JSON', 'identity or contact field']) {
  assert(browserTest.includes(contract) || productionTest.includes(contract), `Browser coverage omits: ${contract}`)
}
assert(productionTest.includes('Evidence supports pilot review'), 'Production smoke omits the Phase 9C decision path')
assert(roadmap.includes('Phase 9C — audience-insight synthesis'), 'Roadmap omits Phase 9C')
assert(guide.includes('No source file, raw note, identity or contact field is retained'), 'Phase 9C guide omits the privacy boundary')

console.log('Audience-insight synthesis contract passed: local validation, aggregate research thresholds and activation locks guarded.')
