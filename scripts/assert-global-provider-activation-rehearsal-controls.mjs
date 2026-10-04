import { readFile } from 'node:fs/promises'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')
const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/063_global_provider_activation_rehearsal_controls.sql',
  'supabase/tests/database/global_provider_activation_rehearsal_controls.test.sql',
  'supabase/tests/production/global_provider_activation_rehearsal_controls_smoke.sql',
  'src/lib/queries/globalProviderActivationRehearsal.ts',
  'src/components/GlobalProviderActivationRehearsalPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_PROVIDER_ACTIVATION_REHEARSAL_CONTROLS.md',
].map(read))

for (const table of ['global_provider_activation_rehearsal_controls',
  'global_provider_activation_rehearsal_state_templates',
  'global_provider_activation_rehearsal_gate_templates',
  'global_provider_activation_rehearsal_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_provider_activation_rehearsal_status',
  'global_provider_activation_rehearsal_state_catalog',
  'global_provider_activation_rehearsal_gate_catalog',
  'global_provider_activation_rehearsal_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['source_family_target = 8', 'rehearsal_gate_target = 8',
  'rehearsal_cell_target = 64', 'rehearsal_state_target = 7',
  'isolated_nonproduction_environment_required', 'synthetic_only_inputs_required',
  'outbound_egress_allowlist_required', 'ephemeral_secret_custody_required',
  'pre_rehearsal_snapshot_required', 'tested_abort_and_restoration_required',
  'post_rehearsal_verification_required', 'independent_closeout_required',
  'immutable_rehearsal_audit_required', 'expiry_and_revocation_enforced',
  'not rehearsal_request_recording_enabled', 'not rehearsal_window_scheduling_enabled',
  'not isolated_egress_test_enabled', 'not synthetic_credential_binding_enabled',
  'not synthetic_payload_execution_enabled', 'not abort_drill_execution_enabled',
  'not restoration_drill_execution_enabled', 'not reconciliation_execution_enabled',
  'not provider_candidate_selection_enabled', 'not endpoint_connectivity_enabled',
  'not credential_storage_enabled', 'not external_payload_intake_enabled',
  'not fixture_execution_enabled', 'not conformance_approval_enabled',
  'not provider_activation_enabled', 'not candidate_write_enabled',
  'not observation_release_enabled', 'not model_training_enabled',
  'not autonomous_publication_enabled', 'not autonomous_trade_execution_enabled',
  'Global provider activation-rehearsal reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8T rehearsal boundary: ${contract}`)
}
for (const state of ['rehearsal_not_requested', 'runbook_required',
  'isolation_and_synthetic_inputs_required', 'pre_rehearsal_snapshot_required',
  'bounded_rehearsal_window_required', 'abort_restore_and_verify_required',
  'closed_without_activation']) {
  assert(migration.includes(`'${state}'`), `Missing rehearsal state: ${state}`)
}
assert((migration.match(/^  \([1-8],'.*','(?:governance|isolation|identity|data_contract|observability|recovery|verification)','.*','.*'\)[,;]$/gm) ?? []).length === 8,
  'Expected eight activation rehearsal gate templates')
assert(test.includes('select plan(42)'), 'PgTAP plan changed')
assert(smoke.includes('global_provider_activation_rehearsal_status'), 'Smoke omits rehearsal status')

for (const view of ['global_provider_activation_rehearsal_status',
  'global_provider_activation_rehearsal_state_catalog',
  'global_provider_activation_rehearsal_gate_catalog',
  'global_provider_activation_rehearsal_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Provider activation rehearsal and rollback verification',
  'No provider rehearsal exists in Phase 8T', 'Eight fail-closed rehearsal gates',
  'Seven manual rehearsal states',
  'Phase 8T is rehearsal-readiness scaffolding, not provider testing or activation']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-activation-rehearsal'"), 'App omits provider activation-rehearsal route')
assert(app.includes("import('./components/GlobalProviderActivationRehearsalPanel')"), 'Provider activation-rehearsal route is not lazy')
assert(navigation.includes("href: '#provider-activation-rehearsal'"), 'Navigation omits provider activation-rehearsal route')
assert(header.includes("'#provider-activation-rehearsal'"), 'Header omits provider activation-rehearsal route')
assert(browser.includes("page.goto('/#provider-activation-rehearsal')"), 'E2E omits provider activation-rehearsal route')
assert(production.includes("'#provider-activation-rehearsal'"), 'Production test omits provider activation-rehearsal route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalProviderActivationRehearsal
assert(manifest.phase === '8W' && manifest.status === 'licensed_provider_commercial_readiness_candidate',
  'Manifest is not Phase 8T')
assert(packageJson.scripts?.['check:global-provider-activation-rehearsal'], 'Package omits Phase 8T check')
assert(manifest.requiredChecks.includes('check:global-provider-activation-rehearsal'), 'Manifest omits Phase 8T check')
for (const key of ['workspaceEnabled', 'isolatedNonproductionEnvironmentRequired',
  'syntheticOnlyInputsRequired', 'outboundEgressAllowlistRequired',
  'ephemeralSecretCustodyRequired', 'preRehearsalSnapshotRequired',
  'testedAbortAndRestorationRequired', 'postRehearsalVerificationRequired',
  'independentCloseoutRequired', 'immutableRehearsalAuditRequired',
  'expiryAndRevocationEnforced', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['rehearsalRequestRecordingEnabled', 'rehearsalWindowSchedulingEnabled',
  'isolatedEgressTestEnabled', 'syntheticCredentialBindingEnabled',
  'syntheticPayloadExecutionEnabled', 'abortDrillExecutionEnabled',
  'restorationDrillExecutionEnabled', 'reconciliationExecutionEnabled',
  'providerCandidateSelectionEnabled', 'endpointConnectivityEnabled',
  'credentialStorageEnabled', 'externalPayloadIntakeEnabled', 'fixtureExecutionEnabled',
  'conformanceApprovalEnabled', 'providerActivationEnabled', 'candidateWriteEnabled',
  'observationReleaseEnabled', 'modelTrainingEnabled', 'autonomousPublicationEnabled',
  'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.rehearsalGateCount === 8
  && release?.rehearsalStateCount === 7 && release?.rehearsalCellCount === 64,
  'Provider activation-rehearsal catalog counts changed')
assert(release?.blockedRehearsalCellCount === 64 && release?.authorizedRehearsalCellCount === 0,
  'Provider activation-rehearsal counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8W'],
  [verifyData, 'VERIFY_DATA_PHASE_8W'], [buildWeb, 'BUILD_PHASE_8W'],
  [deployWeb, 'DEPLOY_PHASE_8W'], [verifyWeb, 'VERIFY_WEB_PHASE_8W']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-provider-activation-rehearsal'), 'Web gate omits provider activation-rehearsal check')
}
assert(ci.includes('global_provider_activation_rehearsal_controls.test.sql'), 'CI omits Phase 8T DB test')
assert(deployData.includes('global_provider_activation_rehearsal_controls_smoke.sql')
  && verifyData.includes('global_provider_activation_rehearsal_controls_smoke.sql'),
  'Data workflows omit Phase 8T smoke')
assert(deployData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data deployment does not verify migration 066')
assert(verifyData.includes("grep -Eq '(^|[^0-9])066([^0-9]|$)'"), 'Data verification does not verify migration 066')
assert(publicRead.includes('global_provider_activation_rehearsal_status'), 'Public verifier omits Phase 8T')
assert(deployed.includes('manifest.globalProviderActivationRehearsal'), 'Web verifier omits Phase 8T')
assert(roadmap.includes('Phase 8T — provider activation rehearsal and rollback verification (implemented foundation)'),
  'Roadmap omits Phase 8T')
assert(guide.includes('It records') && guide.includes('no real provider, runbook, environment, endpoint, credential, payload,'),
  'Guide omits the empty rehearsal contract')

console.log('Global provider activation rehearsal passed: 64 blocked cells, zero authorizations and no rehearsal effects.')
