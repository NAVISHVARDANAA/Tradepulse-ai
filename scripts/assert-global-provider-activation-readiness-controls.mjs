import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/062_global_provider_activation_readiness_controls.sql',
  'supabase/tests/database/global_provider_activation_readiness_controls.test.sql',
  'supabase/tests/production/global_provider_activation_readiness_controls_smoke.sql',
  'src/lib/queries/globalProviderActivationReadiness.ts',
  'src/components/GlobalProviderActivationReadinessPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_PROVIDER_ACTIVATION_READINESS_CONTROLS.md',
].map(read))

for (const table of ['global_provider_activation_controls',
  'global_provider_activation_state_templates', 'global_provider_activation_gate_templates',
  'global_provider_activation_readiness_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_provider_activation_status',
  'global_provider_activation_state_catalog', 'global_provider_activation_gate_catalog',
  'global_provider_activation_readiness_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['source_family_target = 8', 'activation_gate_target = 8',
  'readiness_cell_target = 64', 'activation_state_target = 7',
  'independent_activation_authorization_required', 'dual_control_activation_required',
  'bounded_maintenance_window_required', 'pre_activation_snapshot_required',
  'tested_abort_and_restoration_required', 'post_activation_verification_required',
  'immutable_change_audit_required', 'expiry_and_revocation_enforced',
  'not activation_request_recording_enabled', 'not activation_authorization_recording_enabled',
  'not maintenance_window_scheduling_enabled', 'not provider_candidate_selection_enabled',
  'not endpoint_connectivity_enabled', 'not credential_storage_enabled',
  'not external_payload_intake_enabled', 'not fixture_execution_enabled',
  'not conformance_approval_enabled', 'not provider_activation_enabled',
  'not candidate_write_enabled', 'not observation_release_enabled',
  'not model_training_enabled', 'not autonomous_publication_enabled',
  'not autonomous_trade_execution_enabled',
  'Global provider activation-readiness reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8S activation boundary: ${contract}`)
}
for (const state of ['activation_not_requested', 'change_packet_required',
  'independent_authorization_required', 'pre_activation_snapshot_required',
  'bounded_window_required', 'abort_and_verification_required', 'closed_without_activation']) {
  assert(migration.includes(`'${state}'`), `Missing activation state: ${state}`)
}
assert((migration.match(/^  \([1-8],'.*','(?:governance|identity|legal|rights|privacy_security|data_contract|operations)','.*','.*'\)[,;]$/gm) ?? []).length === 8,
  'Expected eight activation gate templates')
assert(test.includes('select plan(42)'), 'PgTAP plan changed')
assert(smoke.includes('global_provider_activation_status'), 'Smoke omits activation status')

for (const view of ['global_provider_activation_status',
  'global_provider_activation_state_catalog', 'global_provider_activation_gate_catalog',
  'global_provider_activation_readiness_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Provider activation authorization and change controls',
  'No provider activation exists in Phase 8S', 'Eight fail-closed activation gates',
  'Seven manual change-control states', 'Phase 8S is activation-readiness scaffolding, not provider onboarding or production change execution']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-activation-readiness'"), 'App omits provider activation-readiness route')
assert(app.includes("import('./components/GlobalProviderActivationReadinessPanel')"), 'Provider activation-readiness route is not lazy')
assert(navigation.includes("href: '#provider-activation-readiness'"), 'Navigation omits provider activation-readiness route')
assert(header.includes("'#provider-activation-readiness'"), 'Header omits provider activation-readiness route')
assert(browser.includes("page.goto('/#provider-activation-readiness')"), 'E2E omits provider activation-readiness route')
assert(production.includes("'#provider-activation-readiness'"), 'Production test omits provider activation-readiness route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalProviderActivationReadiness
assert(manifest.phase === '8W' && manifest.status === 'licensed_provider_commercial_readiness_candidate',
  'Manifest is not Phase 8T')
assert(packageJson.scripts?.['check:global-provider-activation-readiness'], 'Package omits Phase 8S check')
assert(manifest.requiredChecks.includes('check:global-provider-activation-readiness'), 'Manifest omits Phase 8S check')
for (const key of ['workspaceEnabled', 'independentActivationAuthorizationRequired',
  'dualControlActivationRequired', 'boundedMaintenanceWindowRequired',
  'preActivationSnapshotRequired', 'testedAbortAndRestorationRequired',
  'postActivationVerificationRequired', 'immutableChangeAuditRequired',
  'expiryAndRevocationEnforced', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['activationRequestRecordingEnabled', 'activationAuthorizationRecordingEnabled',
  'maintenanceWindowSchedulingEnabled', 'providerCandidateSelectionEnabled',
  'endpointConnectivityEnabled', 'credentialStorageEnabled',
  'externalPayloadIntakeEnabled', 'fixtureExecutionEnabled',
  'conformanceApprovalEnabled', 'providerActivationEnabled',
  'candidateWriteEnabled', 'observationReleaseEnabled',
  'modelTrainingEnabled', 'autonomousPublicationEnabled',
  'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.activationGateCount === 8
  && release?.activationStateCount === 7 && release?.readinessCellCount === 64,
  'Provider activation-readiness catalog counts changed')
assert(release?.blockedReadinessCellCount === 64 && release?.authorizedReadinessCellCount === 0,
  'Provider activation-readiness counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8W'],
  [verifyData, 'VERIFY_DATA_PHASE_8W'], [buildWeb, 'BUILD_PHASE_8W'],
  [deployWeb, 'DEPLOY_PHASE_8W'], [verifyWeb, 'VERIFY_WEB_PHASE_8W']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-provider-activation-readiness'), 'Web gate omits provider activation-readiness check')
}
assert(ci.includes('global_provider_activation_readiness_controls.test.sql'), 'CI omits Phase 8S DB test')
assert(deployData.includes('global_provider_activation_readiness_controls_smoke.sql')
  && verifyData.includes('global_provider_activation_readiness_controls_smoke.sql'),
  'Data workflows omit Phase 8S smoke')
assert(deployData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data deployment does not verify migration 066')
assert(verifyData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data verification does not verify migration 066')
assert(publicRead.includes('global_provider_activation_status'), 'Public verifier omits Phase 8S')
assert(deployed.includes('manifest.globalProviderActivationReadiness'), 'Web verifier omits Phase 8S')
assert(roadmap.includes('Phase 8S — provider activation authorization and change controls (implemented foundation)'),
  'Roadmap omits Phase 8S')
assert(guide.includes('It records no real provider, change packet, authorization, endpoint,')
  && guide.includes('credential, payload, maintenance window or activation.'),
  'Guide omits the empty activation contract')

console.log('Global provider activation readiness passed: 64 blocked cells, zero authorizations and no activation effects.')
