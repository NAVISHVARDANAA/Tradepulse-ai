import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [
  app,
  panel,
  decision,
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
  read('src/components/AudiencePilotDecisionPanel.tsx'),
  read('src/lib/audiencePilotDecision.ts'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('src/audience-pilot-decision.css'),
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
  read('docs/AUDIENCE_PILOT_DECISION_BRIEF.md'),
])

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)

assert(
  manifest.phase === '9D' && manifest.status === 'audience_pilot_decision_brief_candidate',
  'Manifest is not the Phase 9D audience-pilot decision-brief candidate',
)
assert(packageJson.scripts?.['check:audience-pilot-decision-brief'], 'Package omits the Phase 9D check')
assert(manifest.requiredChecks.includes('check:audience-pilot-decision-brief'), 'Manifest omits the Phase 9D check')

for (const contract of [
  'workspaceEnabled',
  'phase9CAggregateImportEnabled',
  'decisionReconciliationEnabled',
  'experimentBacklogEnabled',
  'boundedPilotEnvelopeEnabled',
  'aggregateDraftExportEnabled',
  'browserMemoryOnly',
  'externalHumanReviewRequired',
]) {
  assert(manifest.audiencePilotDecisionBrief?.[contract] === true, `Audience pilot decision contract is not enabled: ${contract}`)
}
assert(manifest.audiencePilotDecisionBrief?.maximumAggregateFileBytes === 98304, 'Aggregate file ceiling changed')
assert(manifest.audiencePilotDecisionBrief?.maximumPilotParticipants === 30, 'Pilot participant ceiling changed')
assert(manifest.audiencePilotDecisionBrief?.maximumPilotDurationWeeks === 4, 'Pilot duration ceiling changed')
for (const lock of [
  'sourceEvidenceRetained', 'rawTextAccepted', 'identityFieldsAccepted',
  'contactFieldsAccepted', 'automaticSubmissionEnabled', 'externalAnalyticsEnabled',
  'decisionRecordingEnabled', 'pilotAuthorizationEnabled', 'publicSignupEnabled',
  'invitationDeliveryEnabled', 'licensedRealtimeFeedEnabled', 'checkoutEnabled',
  'orderRoutingEnabled', 'paymentExecutionEnabled', 'moneyMovementEnabled',
  'customerFundingEnabled', 'custodyEnabled', 'settlementEnabled',
]) {
  assert(manifest.audiencePilotDecisionBrief?.[lock] === false, `Audience pilot decision lock changed: ${lock}`)
}

for (const contract of [
  'Turn aggregate evidence into a bounded pilot brief.',
  'Local review with fail-closed evidence checks',
  'Import Phase 9C aggregate',
  'Ready for accountable pilot review',
  'Experiment backlog',
  'Human review still required',
  'Download draft brief',
  'This draft cannot send invitations',
]) {
  assert(`${panel}\n${decision}`.includes(contract), `Audience pilot decision workspace omits: ${contract}`)
}
for (const forbidden of ['type="email"', 'type="tel"', 'fetch(', 'supabase', 'sessionStorage', 'localStorage']) {
  assert(!panel.includes(forbidden), `Decision panel introduces a forbidden collection, persistence or transport path: ${forbidden}`)
  assert(!decision.includes(forbidden), `Decision library introduces a forbidden collection, persistence or transport path: ${forbidden}`)
}
for (const contract of [
  'MAX_AUDIENCE_INSIGHT_FILE_BYTES = 96 * 1024',
  "input.schemaVersion !== 1 || input.phase !== '9C'",
  'containsSensitiveInput(input)',
  'expectedDecision(evidence)',
  "phase: '9D'",
  "status: 'draft-human-review-only'",
  'maximumParticipants: 30',
  'maximumDurationWeeks: 4',
  'authorizesInvitations: false',
  'authorizesLiveData: false',
  'authorizesFinancialExecution: false',
]) {
  assert(decision.includes(contract), `Audience pilot decision contract omits: ${contract}`)
}
for (const contract of [
  "import('./components/AudiencePilotDecisionPanel')",
  "activeHref === '#audience-pilot-decision'",
]) {
  assert(app.includes(contract), `App omits audience pilot decision contract: ${contract}`)
}
assert(navigation.includes("href: '#audience-pilot-decision'"), 'Navigation omits the pilot decision brief')
assert(pageHeader.includes("'#audience-pilot-decision'"), 'Audience pilot decision page header is missing')
for (const selector of ['.pilot-decision-hero', '.pilot-decision-import', '.pilot-decision-recommendation', '.pilot-decision-backlog', '.pilot-decision-columns']) {
  assert(styles.includes(selector), `Audience pilot decision styling omits ${selector}`)
}

for (const workflow of [ci, build, deploy, verify]) {
  assert(workflow.includes('npm run check:audience-pilot-decision-brief'), 'A web release gate omits the Phase 9D check')
}
for (const token of ['BUILD_PHASE_9D', 'DEPLOY_PHASE_9D', 'VERIFY_WEB_PHASE_9D']) {
  assert([build, deploy, verify].some((workflow) => workflow.includes(token)), `Web release token is missing: ${token}`)
}
for (const contract of ['audiencePilotDecisionBrief', 'maximumPilotParticipants', 'decisionRecordingEnabled']) {
  assert(deployedVerifier.includes(contract), `Deployed verifier omits Phase 9D contract: ${contract}`)
}
for (const contract of ['#audience-pilot-decision', 'Import Phase 9C aggregate', 'Ready for accountable pilot review']) {
  assert(browserTest.includes(contract) || productionTest.includes(contract), `Browser coverage omits: ${contract}`)
}
assert(roadmap.includes('Phase 9D — audience pilot decision brief'), 'Roadmap omits Phase 9D')
assert(guide.includes('unsigned local draft'), 'Phase 9D guide omits the non-authorization boundary')

console.log('Audience pilot decision brief passed: aggregate reconciliation, experiment priorities, bounded pilot envelope and activation locks guarded.')
