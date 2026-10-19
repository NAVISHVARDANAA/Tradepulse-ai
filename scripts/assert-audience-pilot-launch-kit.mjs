import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => { if (!condition) throw new Error(message) }

const [
  manifestText,
  packageText,
  panel,
  launchKit,
  styles,
  app,
  navigation,
  pageHeader,
  ci,
  build,
  deploy,
  verify,
  deployedVerifier,
  roadmap,
  guide,
  browserTests,
  productionTests,
] = await Promise.all([
  read('public/beta-release.json'),
  read('package.json'),
  read('src/components/AudiencePilotLaunchKitPanel.tsx'),
  read('src/lib/audiencePilotLaunchKit.ts'),
  read('src/audience-pilot-launch-kit.css'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('scripts/verify-web-deployment.mjs'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/AUDIENCE_PILOT_LAUNCH_KIT.md'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
])

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)

assert(manifest.phase === '9F' && manifest.status === 'market_impact_brief_candidate', 'Manifest is not the Phase 9E audience-pilot launch-kit candidate')
assert(packageJson.scripts?.['check:audience-pilot-launch-kit'], 'Package omits the Phase 9E check')
assert(manifest.requiredChecks.includes('check:audience-pilot-launch-kit'), 'Manifest omits the Phase 9E check')

for (const contract of [
  'workspaceEnabled', 'phase9DDecisionImportEnabled', 'balancedCohortPlanEnabled',
  'neutralInterviewGuideEnabled', 'founderLedChannelPlanEnabled', 'pilotScorecardEnabled',
  'fourWeekOperatingPlanEnabled', 'reviewableOutreachDraftEnabled',
  'aggregateDraftExportEnabled', 'browserMemoryOnly', 'externalHumanReviewRequired',
]) assert(manifest.audiencePilotLaunchKit?.[contract] === true, `Audience launch-kit contract is not enabled: ${contract}`)

for (const [contract, expected] of [
  ['maximumDecisionFileBytes', 98304], ['maximumPilotParticipants', 30],
  ['maximumPilotDurationWeeks', 4], ['targetCohortCount', 5],
  ['interviewQuestionCount', 11], ['marketingChannelCount', 4], ['scorecardMetricCount', 7],
]) assert(manifest.audiencePilotLaunchKit?.[contract] === expected, `Audience launch-kit boundary changed: ${contract}`)

for (const lock of [
  'realtimeDataRequiredForPilot', 'sourceEvidenceRetained', 'rawParticipantNotesAccepted',
  'identityFieldsAccepted', 'contactFieldsAccepted', 'automaticSubmissionEnabled',
  'externalAnalyticsEnabled', 'outreachAuthorizationEnabled', 'outreachDeliveryEnabled',
  'publicSignupEnabled', 'automatedProvisioningEnabled', 'licensedRealtimeFeedEnabled',
  'personalizedAdviceEnabled', 'checkoutEnabled', 'orderRoutingEnabled',
  'paymentExecutionEnabled', 'moneyMovementEnabled', 'customerFundingEnabled',
  'custodyEnabled', 'settlementEnabled',
]) assert(manifest.audiencePilotLaunchKit?.[lock] === false, `Audience launch-kit lock changed: ${lock}`)

for (const contract of [
  'MAX_PILOT_DECISION_FILE_BYTES', 'containsSensitiveInput', 'parsePilotDecisionExport',
  'buildPilotLaunchKit', 'buildPilotLaunchExport', 'buildPilotInterviewText',
  "'hold-outreach'", "'human-review-required'", 'participantCeiling: 30',
  'authorizesOutreach: false', 'authorizesSignup: false', 'authorizesAnalytics: false',
  'authorizesLiveData: false', 'authorizesFinancialExecution: false',
]) assert(launchKit.includes(contract), `Audience launch-kit logic omits: ${contract}`)

for (const copy of [
  'Five balanced audience cohorts', 'Eleven neutral research questions',
  'Founder-led channel mix', 'Pilot scorecard', 'Four-week operating rhythm',
  'First outreach message', 'No message was sent', 'no outreach authority',
]) assert(panel.includes(copy), `Audience launch-kit workspace omits: ${copy}`)

assert(app.includes("activeHref === '#audience-pilot-launch-kit'"), 'App omits the Phase 9E workspace route')
assert(app.includes('AudiencePilotLaunchKitPanel'), 'App omits the lazy Phase 9E module')
assert(navigation.includes("href: '#audience-pilot-launch-kit'"), 'Navigation omits the Phase 9E launch kit')
assert(pageHeader.includes("'#audience-pilot-launch-kit'"), 'Page header omits the Phase 9E launch kit')
for (const selector of ['.pilot-launch-hero', '.pilot-launch-cohorts', '.pilot-launch-questions', '.pilot-launch-scorecard']) {
  assert(styles.includes(selector), `Audience launch-kit styling omits ${selector}`)
}

for (const workflow of [ci, build, deploy, verify]) {
  assert(workflow.includes('npm run check:audience-pilot-launch-kit'), 'A web release gate omits the Phase 9E check')
}
for (const token of ['BUILD_PHASE_9F', 'DEPLOY_PHASE_9F', 'VERIFY_WEB_PHASE_9F']) {
  assert(`${build}\n${deploy}\n${verify}`.includes(token), `Release workflows omit ${token}`)
}
for (const contract of ['audiencePilotLaunchKit', 'targetCohortCount !== 5', 'outreachDeliveryEnabled !== false']) {
  assert(deployedVerifier.includes(contract), `Deployed verifier omits Phase 9E contract: ${contract}`)
}

assert(roadmap.includes('Phase 9E — real-audience pilot launch kit'), 'Roadmap omits Phase 9E')
assert(guide.includes('Do not buy ads yet'), 'Phase 9E guide omits the staged marketing boundary')
assert(guide.includes('Eleven neutral research questions') || guide.includes('## Questions to ask'), 'Phase 9E guide omits the interview plan')
assert(browserTests.includes('Phase 9E audience pilot launch kit'), 'Controlled browser coverage omits Phase 9E')
assert(productionTests.includes('Phase 9E launch kit remains non-authorizing'), 'Production browser coverage omits Phase 9E')

console.log('Audience pilot launch kit passed: cohorts, interview guide, marketing channels, scorecard, four-week plan and outreach locks guarded.')
