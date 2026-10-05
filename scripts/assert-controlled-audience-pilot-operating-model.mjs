import { readFile } from 'node:fs/promises'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [query, panel, app, navigation, header, browser, production, manifestText,
  packageText, ci, deployData, verifyData, buildWeb, deployWeb, verifyWeb,
  deployed, roadmap, guide] = await Promise.all([
  'src/lib/queries/controlledAudiencePilotOperatingModel.ts',
  'src/components/ControlledAudiencePilotOperatingModelPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-web-deployment.mjs',
  'docs/PRODUCT_ROADMAP.md', 'docs/CONTROLLED_AUDIENCE_PILOT_OPERATING_MODEL.md',
].map(read))

for (const view of ['external_audience_launch_status', 'licensed_live_data_integration_status',
  'licensed_provider_commercial_readiness_status']) {
  assert(query.includes(`from('${view}')`), `Pilot cockpit omits ${view}`)
}
for (const copy of ['Controlled-audience pilot operating model',
  'No participant invitations or public signup are enabled in Phase 8X',
  'Five learning cohorts', 'Three prerequisite foundations',
  'Eight operating workstreams', 'Seven go / no-go measures',
  'Phase 8X separates a controlled research/paper pilot from the real-time-data path']) {
  assert(panel.includes(copy), `Pilot cockpit omits ${copy}`)
}
assert(app.includes("activeHref === '#audience-pilot-plan'"), 'App omits pilot-plan route')
assert(app.includes("import('./components/ControlledAudiencePilotOperatingModelPanel')"), 'Pilot route is not lazy')
assert(navigation.includes("href: '#audience-pilot-plan'"), 'Navigation omits pilot-plan route')
assert(header.includes("'#audience-pilot-plan'"), 'Header omits pilot-plan route')
assert(browser.includes("page.goto('/#audience-pilot-plan')"), 'E2E omits pilot-plan route')
assert(production.includes("'#audience-pilot-plan'"), 'Production test omits pilot-plan route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.controlledAudiencePilotOperatingModel
assert(manifest.phase === '8Z' && manifest.status === 'licensed_realtime_data_activation_candidate',
  'Manifest is not Phase 8X')
assert(packageJson.scripts?.['check:controlled-audience-pilot-operating-model'], 'Package omits Phase 8X check')
assert(manifest.requiredChecks.includes('check:controlled-audience-pilot-operating-model'), 'Manifest omits Phase 8X check')
for (const key of ['workspaceEnabled', 'researchPaperPilotTrackDefined',
  'realTimeDataTrackSeparated', 'pilotFreeOfCharge']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['participantInvitationsEnabled', 'automatedProvisioningEnabled',
  'publicSignupEnabled', 'paymentCollectionEnabled', 'realTimeDataTrackEnabled',
  'liveProviderConnectivityEnabled', 'productionCredentialStorageEnabled',
  'productionPayloadIntakeEnabled', 'liveDataDisplayEnabled', 'orderRoutingEnabled',
  'moneyMovementEnabled', 'custodyEnabled', 'settlementEnabled', 'goNoGoAuthorized']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.maxPilotParticipants === 30 && release?.pilotDurationWeeks === 4,
  'Pilot size or duration changed')
assert(release?.cohortSegmentCount === 5 && release?.workstreamCount === 8
  && release?.decisionMetricCount === 7 && release?.prerequisiteFoundationCount === 3,
  'Pilot operating-model counts changed')
assert(release?.readyFoundationCount === 0 && release?.liveDataRequiredForPilot === false
  && release?.costCeilingApproved === false, 'Pilot readiness boundary changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8Z'],
  [verifyData, 'VERIFY_DATA_PHASE_8Z'], [buildWeb, 'BUILD_PHASE_8Z'],
  [deployWeb, 'DEPLOY_PHASE_8Z'], [verifyWeb, 'VERIFY_WEB_PHASE_8Z']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:controlled-audience-pilot-operating-model'), 'Web gate omits Phase 8X check')
}
assert(deployData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'")
  && verifyData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"),
  'Phase 8X must preserve migration 066')
assert(deployed.includes('manifest.controlledAudiencePilotOperatingModel'), 'Web verifier omits Phase 8X')
assert(roadmap.includes('Phase 8X — controlled-audience pilot operating model (implemented foundation)'),
  'Roadmap omits Phase 8X')
assert(guide.includes('Track A') && guide.includes('Track B')
  && guide.includes('no invitations, automated provisioning, public signup'),
  'Guide omits the two-track strategy or fail-closed boundary')

console.log('Controlled-audience pilot operating model passed: 30-person ceiling, two separated tracks, zero activated foundations and no invitation, payment, live-data or execution effects.')
