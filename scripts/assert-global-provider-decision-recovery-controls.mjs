import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/061_global_provider_decision_recovery_controls.sql',
  'supabase/tests/database/global_provider_decision_recovery_controls.test.sql',
  'supabase/tests/production/global_provider_decision_recovery_controls_smoke.sql',
  'src/lib/queries/globalProviderDecisionRecovery.ts',
  'src/components/GlobalProviderDecisionRecoveryPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_PROVIDER_DECISION_RECOVERY_CONTROLS.md',
].map(read))

for (const table of ['global_provider_decision_recovery_controls',
  'global_provider_decision_recovery_state_templates', 'global_provider_decision_recovery_trigger_templates',
  'global_provider_decision_recovery_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_provider_decision_recovery_status',
  'global_provider_decision_recovery_state_catalog', 'global_provider_decision_recovery_trigger_catalog',
  'global_provider_decision_recovery_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['source_family_target = 8', 'recovery_trigger_target = 8',
  'recovery_cell_target = 64', 'recovery_state_target = 7',
  'immediate_fail_closed_freeze_required', 'independent_recovery_review_required',
  'rollback_rehearsal_required', 'immutable_recovery_audit_required',
  'explicit_recovery_reason_required', 'expiry_and_revocation_enforced',
  'not exception_recording_enabled', 'not decision_challenge_recording_enabled',
  'not investigator_identity_storage_enabled', 'not recovery_evidence_linkage_enabled',
  'not automated_freeze_enabled', 'not rollback_execution_enabled',
  'not decision_revocation_enabled', 'not provider_candidate_selection_enabled',
  'not review_packet_open_enabled', 'not endpoint_connectivity_enabled',
  'not credential_storage_enabled', 'not external_payload_intake_enabled',
  'not fixture_execution_enabled', 'not conformance_approval_enabled',
  'not candidate_write_enabled', 'not observation_release_enabled',
  'not model_training_enabled', 'not autonomous_publication_enabled',
  'not autonomous_trade_execution_enabled',
  'Global provider decision recovery-control reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8R recovery boundary: ${contract}`)
}
for (const state of ['monitoring_inactive', 'exception_reported', 'protective_freeze_required',
  'independent_review_required', 'rollback_rehearsal_required', 'revocation_required',
  'recovery_closed_without_effect']) {
  assert(migration.includes(`'${state}'`), `Missing recovery state: ${state}`)
}
assert((migration.match(/^  \([1-8],'.*','(?:governance|legal|rights|privacy|security|data_contract|operations)','.*','.*'\)[,;]$/gm) ?? []).length === 8,
  'Expected eight recovery trigger templates')
assert(test.includes('select plan(42)'), 'PgTAP plan changed')
assert(smoke.includes('global_provider_decision_recovery_status'), 'Smoke omits recovery status')

for (const view of ['global_provider_decision_recovery_status',
  'global_provider_decision_recovery_state_catalog', 'global_provider_decision_recovery_trigger_catalog',
  'global_provider_decision_recovery_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Provider decision recovery and revocation controls',
  'No recovery event exists in Phase 8R', 'Eight fail-closed recovery triggers',
  'Seven manual recovery states', 'Phase 8R is recovery scaffolding, not incident handling or provider activation']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-decision-recovery'"), 'App omits provider-decision recovery route')
assert(app.includes("import('./components/GlobalProviderDecisionRecoveryPanel')"), 'Provider-decision recovery route is not lazy')
assert(navigation.includes("href: '#provider-decision-recovery'"), 'Navigation omits provider-decision recovery route')
assert(header.includes("'#provider-decision-recovery'"), 'Header omits provider-decision recovery route')
assert(browser.includes("page.goto('/#provider-decision-recovery')"), 'E2E omits provider-decision recovery route')
assert(production.includes("'#provider-decision-recovery'"), 'Production test omits provider-decision recovery route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalProviderDecisionRecovery
assert(manifest.phase === '8V' && manifest.status === 'licensed_live_data_integration_candidate',
  'Manifest is not Phase 8R')
assert(packageJson.scripts?.['check:global-provider-decision-recovery'], 'Package omits Phase 8R check')
assert(manifest.requiredChecks.includes('check:global-provider-decision-recovery'), 'Manifest omits Phase 8R check')
for (const key of ['workspaceEnabled', 'immediateFailClosedFreezeRequired',
  'independentRecoveryReviewRequired', 'rollbackRehearsalRequired',
  'immutableRecoveryAuditRequired', 'explicitRecoveryReasonRequired',
  'expiryAndRevocationEnforced', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['exceptionRecordingEnabled', 'decisionChallengeRecordingEnabled',
  'investigatorIdentityStorageEnabled', 'recoveryEvidenceLinkageEnabled',
  'automatedFreezeEnabled', 'rollbackExecutionEnabled', 'decisionRevocationEnabled',
  'providerCandidateSelectionEnabled', 'reviewPacketOpenEnabled',
  'endpointConnectivityEnabled', 'credentialStorageEnabled',
  'externalPayloadIntakeEnabled', 'fixtureExecutionEnabled',
  'conformanceApprovalEnabled', 'candidateWriteEnabled',
  'observationReleaseEnabled', 'modelTrainingEnabled',
  'autonomousPublicationEnabled', 'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.recoveryTriggerCount === 8
  && release?.recoveryStateCount === 7 && release?.recoveryCellCount === 64,
  'Provider decision recovery catalog counts changed')
assert(release?.blockedRecoveryCellCount === 64 && release?.authorizedRecoveryCellCount === 0,
  'Provider decision recovery counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8V'],
  [verifyData, 'VERIFY_DATA_PHASE_8V'], [buildWeb, 'BUILD_PHASE_8V'],
  [deployWeb, 'DEPLOY_PHASE_8V'], [verifyWeb, 'VERIFY_WEB_PHASE_8V']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-provider-decision-recovery'), 'Web gate omits provider-decision recovery check')
}
assert(ci.includes('global_provider_decision_recovery_controls.test.sql'), 'CI omits Phase 8R DB test')
assert(deployData.includes('global_provider_decision_recovery_controls_smoke.sql')
  && verifyData.includes('global_provider_decision_recovery_controls_smoke.sql'),
  'Data workflows omit Phase 8R smoke')
assert(deployData.includes("grep -Eq '(^|[^0-9])065([^0-9]|$)'"), 'Data deployment does not verify migration 065')
assert(verifyData.includes("grep -Eq '(^|[^0-9])065([^0-9]|$)'"), 'Data verification does not verify migration 065')
assert(publicRead.includes('global_provider_decision_recovery_status'), 'Public verifier omits Phase 8R')
assert(deployed.includes('manifest.globalProviderDecisionRecovery'), 'Web verifier omits Phase 8R')
assert(roadmap.includes('Phase 8R — provider decision recovery and revocation controls (implemented foundation)'),
  'Roadmap omits Phase 8R')
assert(guide.includes('It records no real recovery event, decision,')
  && guide.includes('exception, investigator, evidence reference, signature, provider or endpoint.'),
  'Guide omits the empty recovery contract')

console.log('Global provider decision recovery controls passed: 64 blocked cells, zero events and no recovery effects.')
