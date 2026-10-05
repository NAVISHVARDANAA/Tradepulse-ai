import { readFile } from 'node:fs/promises'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [query, panel, app, navigation, header, browser, production, manifestText,
  packageText, ci, deployData, verifyData, buildWeb, deployWeb, verifyWeb,
  deployed, roadmap, guide] = await Promise.all([
  'src/lib/queries/controlledPilotActivation.ts',
  'src/components/ControlledPilotActivationPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-web-deployment.mjs',
  'docs/PRODUCT_ROADMAP.md', 'docs/CONTROLLED_PILOT_ACTIVATION.md',
].map(read))

for (const contract of ['getControlledAudiencePilotOperatingModel',
  "activationAuthorized: false", "invitationsEnabled: false",
  "realTimeDataEnabled: false", "pilotDataMode: 'authorized-reference-or-delayed'"]) {
  assert(query.includes(contract), `Pilot activation query omits ${contract}`)
}
for (const copy of ['Controlled pilot activation cockpit',
  'No participant invitation or pilot access is authorized in Phase 8Y',
  'Real-time market data is not active', 'Eight activation gates',
  'Three progressive pilot waves', 'Eight immediate stop conditions',
  'Phase 8Y prepares the pilot launch decision; it does not make that decision']) {
  assert(panel.includes(copy), `Pilot activation cockpit omits ${copy}`)
}
assert(app.includes("activeHref === '#pilot-activation'"), 'App omits pilot-activation route')
assert(app.includes("import('./components/ControlledPilotActivationPanel')"), 'Pilot activation route is not lazy')
assert(navigation.includes("href: '#pilot-activation'"), 'Navigation omits pilot-activation route')
assert(header.includes("'#pilot-activation'"), 'Header omits pilot-activation route')
assert(browser.includes("page.goto('/#pilot-activation')"), 'E2E omits pilot-activation route')
assert(production.includes("'#pilot-activation'"), 'Production test omits pilot-activation route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.controlledPilotActivation
assert(manifest.phase === '8Y' && manifest.status === 'controlled_pilot_activation_candidate',
  'Manifest is not Phase 8Y')
assert(packageJson.scripts?.['check:controlled-pilot-activation'], 'Package omits Phase 8Y check')
assert(manifest.requiredChecks.includes('check:controlled-pilot-activation'), 'Manifest omits Phase 8Y check')
for (const key of ['workspaceEnabled', 'authorizedReferenceOrDelayedDataOnly',
  'realTimeDataOptionalForPilot']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['participantRosterApproved', 'consentPackApproved',
  'supportOwnerAssigned', 'privacySafeTelemetryApproved', 'costCeilingApproved',
  'rollbackOwnerAssigned', 'goNoGoAuthorized', 'participantInvitationsEnabled',
  'automatedProvisioningEnabled', 'publicSignupEnabled', 'liveProviderConnectivityEnabled',
  'productionCredentialStorageEnabled', 'productionPayloadIntakeEnabled',
  'liveDataDisplayEnabled', 'orderRoutingEnabled', 'paymentCollectionEnabled',
  'moneyMovementEnabled', 'custodyEnabled', 'settlementEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.activationGateCount === 8 && release?.pilotWaveCount === 3
  && release?.stopConditionCount === 8 && release?.readyActivationGateCount === 0,
  'Pilot activation counts changed')
assert(release?.maxPilotParticipants === 30 && release?.pilotDurationWeeks === 4,
  'Pilot activation size or duration changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8Y'],
  [verifyData, 'VERIFY_DATA_PHASE_8Y'], [buildWeb, 'BUILD_PHASE_8Y'],
  [deployWeb, 'DEPLOY_PHASE_8Y'], [verifyWeb, 'VERIFY_WEB_PHASE_8Y']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:controlled-pilot-activation'), 'Web gate omits Phase 8Y check')
}
assert(deployData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'")
  && verifyData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"),
  'Phase 8Y must preserve migration 066')
assert(deployed.includes('manifest.controlledPilotActivation'), 'Web verifier omits Phase 8Y')
assert(roadmap.includes('Phase 8Y — controlled pilot activation (implemented foundation)'),
  'Roadmap omits Phase 8Y')
for (const contract of ['eight gates', 'Wave 1', 'Real-time display',
  'no invitation delivery', 'database migration 066']) {
  assert(guide.includes(contract), `Pilot activation guide omits ${contract}`)
}

console.log('Controlled pilot activation passed: eight human gates, three waves, 30-person ceiling, explicit stop conditions and no invitation, real-time-data or execution effects.')
