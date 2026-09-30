import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/059_global_provider_review_governance.sql',
  'supabase/tests/database/global_provider_review_governance.test.sql',
  'supabase/tests/production/global_provider_review_governance_smoke.sql',
  'src/lib/queries/globalProviderReviewGovernance.ts',
  'src/components/GlobalProviderReviewGovernancePanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_PROVIDER_REVIEW_GOVERNANCE.md',
].map(read))

for (const table of ['global_provider_review_governance_controls',
  'global_provider_review_role_templates', 'global_provider_evidence_lifecycle_templates',
  'global_provider_review_responsibility_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_provider_review_governance_status',
  'global_provider_review_role_catalog', 'global_provider_evidence_lifecycle_catalog',
  'global_provider_review_responsibility_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['source_family_target = 8', 'role_template_target = 8',
  'responsibility_target = 64', 'lifecycle_stage_target = 7',
  'independent_review_required', 'separation_of_duties_required',
  'least_privilege_custody_required', 'dual_control_activation_required',
  'expiry_and_revocation_required', 'not role_assignment_enabled',
  'not reviewer_identity_storage_enabled', 'not evidence_receipt_enabled',
  'not evidence_document_storage_enabled', 'not custody_location_provisioning_enabled',
  'not provider_candidate_selection_enabled', 'not review_packet_open_enabled',
  'not evidence_submission_enabled', 'not endpoint_connectivity_enabled',
  'not credential_storage_enabled', 'not external_payload_intake_enabled',
  'not fixture_execution_enabled', 'not conformance_approval_enabled',
  'not candidate_write_enabled', 'not observation_release_enabled',
  'not model_training_enabled', 'not autonomous_publication_enabled',
  'not autonomous_trade_execution_enabled',
  'Global provider review-governance reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8P governance boundary: ${contract}`)
}
assert((migration.match(/^  \([1-8],'.*','(?:governance|legal|rights|privacy|security|data_contract|testing_operations)','.*','.*'\)[,;]$/gm) ?? []).length === 8,
  'Expected eight review role templates')
for (const stage of ['not_received', 'received_sealed', 'triaged', 'under_review',
  'needs_remediation', 'accepted_until_expiry', 'expired_or_revoked']) {
  assert(migration.includes(`'${stage}'`), `Missing evidence lifecycle stage: ${stage}`)
}
assert(test.includes('select plan(40)'), 'PgTAP plan changed')
assert(smoke.includes('global_provider_review_governance_status'), 'Smoke omits review-governance status')

for (const view of ['global_provider_review_governance_status',
  'global_provider_review_role_catalog', 'global_provider_evidence_lifecycle_catalog',
  'global_provider_review_responsibility_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Provider review authority and evidence custody',
  'No reviewer or evidence custodian is assigned in Phase 8P',
  'Eight unassigned review roles', 'Seven-stage sealed-evidence lifecycle',
  'Phase 8P is governance scaffolding, not provider onboarding']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-review-governance'"), 'App omits review-governance route')
assert(app.includes("import('./components/GlobalProviderReviewGovernancePanel')"), 'Review-governance route is not lazy')
assert(navigation.includes("href: '#provider-review-governance'"), 'Navigation omits review-governance route')
assert(header.includes("'#provider-review-governance'"), 'Header omits review-governance route')
assert(browser.includes("page.goto('/#provider-review-governance')"), 'E2E omits review-governance route')
assert(production.includes("'#provider-review-governance'"), 'Production test omits review-governance route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalProviderReviewGovernance
assert(manifest.phase === '8S' && manifest.status === 'global_provider_activation_readiness_candidate',
  'Manifest is not Phase 8P')
assert(packageJson.scripts?.['check:global-provider-review-governance'], 'Package omits Phase 8P check')
assert(manifest.requiredChecks.includes('check:global-provider-review-governance'), 'Manifest omits Phase 8P check')
for (const key of ['workspaceEnabled', 'independentReviewRequired',
  'separationOfDutiesRequired', 'leastPrivilegeCustodyRequired',
  'dualControlActivationRequired', 'expiryAndRevocationRequired',
  'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['roleAssignmentEnabled', 'reviewerIdentityStorageEnabled',
  'evidenceReceiptEnabled', 'evidenceDocumentStorageEnabled',
  'custodyLocationProvisioningEnabled', 'providerCandidateSelectionEnabled',
  'reviewPacketOpenEnabled', 'evidenceSubmissionEnabled',
  'endpointConnectivityEnabled', 'credentialStorageEnabled',
  'externalPayloadIntakeEnabled', 'fixtureExecutionEnabled',
  'conformanceApprovalEnabled', 'candidateWriteEnabled',
  'observationReleaseEnabled', 'modelTrainingEnabled',
  'autonomousPublicationEnabled', 'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.roleTemplateCount === 8
  && release?.unassignedRoleCount === 8 && release?.lifecycleStageCount === 7,
  'Review-governance catalog counts changed')
assert(release?.responsibilityCount === 64 && release?.unassignedResponsibilityCount === 64
  && release?.authorizedResponsibilityCount === 0,
  'Review responsibility counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8S'],
  [verifyData, 'VERIFY_DATA_PHASE_8S'], [buildWeb, 'BUILD_PHASE_8S'],
  [deployWeb, 'DEPLOY_PHASE_8S'], [verifyWeb, 'VERIFY_WEB_PHASE_8S']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-provider-review-governance'), 'Web gate omits review-governance check')
}
assert(ci.includes('global_provider_review_governance.test.sql'), 'CI omits Phase 8P DB test')
assert(deployData.includes('global_provider_review_governance_smoke.sql')
  && verifyData.includes('global_provider_review_governance_smoke.sql'),
  'Data workflows omit Phase 8P smoke')
assert(deployData.includes("grep -Eq '(^|[^0-9])062([^0-9]|$)'"), 'Data deployment does not verify migration 062')
assert(verifyData.includes("grep -Eq '(^|[^0-9])062([^0-9]|$)'"), 'Data verification does not verify migration 062')
assert(publicRead.includes('global_provider_review_governance_status'), 'Public verifier omits Phase 8P')
assert(deployed.includes('manifest.globalProviderReviewGovernance'), 'Web verifier omits Phase 8P')
assert(roadmap.includes('Phase 8P — provider review authority and evidence custody (implemented foundation)'),
  'Roadmap omits Phase 8P')
assert(guide.includes('reviewer, evidence custodian, provider candidate or evidence location is')
  && guide.includes('assigned by this foundation'),
  'Guide omits the unassigned governance contract')

console.log('Global provider review governance passed: 64 unassigned responsibilities, zero evidence custody and no endpoint access.')
