import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/060_global_provider_review_decision_controls.sql',
  'supabase/tests/database/global_provider_review_decision_controls.test.sql',
  'supabase/tests/production/global_provider_review_decision_controls_smoke.sql',
  'src/lib/queries/globalProviderReviewDecisions.ts',
  'src/components/GlobalProviderReviewDecisionPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_PROVIDER_REVIEW_DECISION_CONTROLS.md',
].map(read))

for (const table of ['global_provider_review_decision_controls',
  'global_provider_review_decision_state_templates', 'global_provider_review_decision_gate_templates',
  'global_provider_review_decision_readiness_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_provider_review_decision_status',
  'global_provider_review_decision_state_catalog', 'global_provider_review_decision_gate_catalog',
  'global_provider_review_decision_readiness_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['source_family_target = 8', 'decision_gate_target = 8',
  'readiness_cell_target = 64', 'decision_state_target = 7',
  'independent_decision_required', 'dual_control_quorum_required',
  'immutable_audit_required', 'explicit_reason_code_required',
  'expiry_and_revocation_required', 'conflict_of_interest_review_required',
  'not decision_recording_enabled', 'not reviewer_signature_storage_enabled',
  'not evidence_linkage_enabled', 'not automated_quorum_evaluation_enabled',
  'not provider_candidate_selection_enabled', 'not review_packet_open_enabled',
  'not endpoint_connectivity_enabled', 'not credential_storage_enabled',
  'not external_payload_intake_enabled', 'not fixture_execution_enabled',
  'not conformance_approval_enabled', 'not candidate_write_enabled',
  'not observation_release_enabled', 'not model_training_enabled',
  'not autonomous_publication_enabled', 'not autonomous_trade_execution_enabled',
  'Global provider review decision-control reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8Q decision boundary: ${contract}`)
}
for (const state of ['not_assessed', 'awaiting_independent_reviews', 'blocked_by_gap',
  'remediation_required', 'decision_ready', 'accepted_until_expiry', 'expired_or_revoked']) {
  assert(migration.includes(`'${state}'`), `Missing decision state: ${state}`)
}
assert((migration.match(/^  \([1-8],'.*','(?:governance|legal|rights|privacy|security|data_contract|testing_operations)','.*','.*'\)[,;]$/gm) ?? []).length === 8,
  'Expected eight decision gate templates')
assert(test.includes('select plan(42)'), 'PgTAP plan changed')
assert(smoke.includes('global_provider_review_decision_status'), 'Smoke omits decision status')

for (const view of ['global_provider_review_decision_status',
  'global_provider_review_decision_state_catalog', 'global_provider_review_decision_gate_catalog',
  'global_provider_review_decision_readiness_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Provider review decisions and audit controls',
  'No provider review decision exists in Phase 8Q', 'Eight mandatory decision gates',
  'Seven human-only decision states', 'Phase 8Q is decision scaffolding, not provider approval']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-review-decisions'"), 'App omits provider-review decisions route')
assert(app.includes("import('./components/GlobalProviderReviewDecisionPanel')"), 'Provider-review decisions route is not lazy')
assert(navigation.includes("href: '#provider-review-decisions'"), 'Navigation omits provider-review decisions route')
assert(header.includes("'#provider-review-decisions'"), 'Header omits provider-review decisions route')
assert(browser.includes("page.goto('/#provider-review-decisions')"), 'E2E omits provider-review decisions route')
assert(production.includes("'#provider-review-decisions'"), 'Production test omits provider-review decisions route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalProviderReviewDecisions
assert(manifest.phase === '8R' && manifest.status === 'global_provider_decision_recovery_controls_candidate',
  'Manifest is not Phase 8Q')
assert(packageJson.scripts?.['check:global-provider-review-decisions'], 'Package omits Phase 8Q check')
assert(manifest.requiredChecks.includes('check:global-provider-review-decisions'), 'Manifest omits Phase 8Q check')
for (const key of ['workspaceEnabled', 'independentDecisionRequired',
  'dualControlQuorumRequired', 'immutableAuditRequired', 'explicitReasonCodeRequired',
  'expiryAndRevocationRequired', 'conflictOfInterestReviewRequired',
  'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['decisionRecordingEnabled', 'reviewerSignatureStorageEnabled',
  'evidenceLinkageEnabled', 'automatedQuorumEvaluationEnabled',
  'providerCandidateSelectionEnabled', 'reviewPacketOpenEnabled',
  'endpointConnectivityEnabled', 'credentialStorageEnabled',
  'externalPayloadIntakeEnabled', 'fixtureExecutionEnabled',
  'conformanceApprovalEnabled', 'candidateWriteEnabled',
  'observationReleaseEnabled', 'modelTrainingEnabled',
  'autonomousPublicationEnabled', 'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.decisionGateCount === 8
  && release?.decisionStateCount === 7 && release?.readinessCellCount === 64,
  'Provider review decision catalog counts changed')
assert(release?.unmetReadinessCellCount === 64 && release?.authorizedReadinessCellCount === 0,
  'Provider review decision readiness counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8R'],
  [verifyData, 'VERIFY_DATA_PHASE_8R'], [buildWeb, 'BUILD_PHASE_8R'],
  [deployWeb, 'DEPLOY_PHASE_8R'], [verifyWeb, 'VERIFY_WEB_PHASE_8R']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-provider-review-decisions'), 'Web gate omits provider-review decision check')
}
assert(ci.includes('global_provider_review_decision_controls.test.sql'), 'CI omits Phase 8Q DB test')
assert(deployData.includes('global_provider_review_decision_controls_smoke.sql')
  && verifyData.includes('global_provider_review_decision_controls_smoke.sql'),
  'Data workflows omit Phase 8Q smoke')
assert(deployData.includes("grep -Eq '(^|[^0-9])061([^0-9]|$)'"), 'Data deployment does not verify migration 061')
assert(verifyData.includes("grep -Eq '(^|[^0-9])061([^0-9]|$)'"), 'Data verification does not verify migration 061')
assert(publicRead.includes('global_provider_review_decision_status'), 'Public verifier omits Phase 8Q')
assert(deployed.includes('manifest.globalProviderReviewDecisions'), 'Web verifier omits Phase 8Q')
assert(roadmap.includes('Phase 8Q — provider review decisions and audit controls (implemented foundation)'),
  'Roadmap omits Phase 8Q')
assert(guide.includes('It records no real decision, approval,')
  && guide.includes('reviewer identity, evidence reference, signature, provider or endpoint.'),
  'Guide omits the empty decision contract')

console.log('Global provider review decision controls passed: 64 unmet readiness cells, zero decisions and no endpoint access.')
