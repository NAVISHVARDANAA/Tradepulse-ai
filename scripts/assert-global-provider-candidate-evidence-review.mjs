import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/058_global_provider_candidate_evidence_review.sql',
  'supabase/tests/database/global_provider_candidate_evidence_review.test.sql',
  'supabase/tests/production/global_provider_candidate_evidence_review_smoke.sql',
  'src/lib/queries/globalProviderCandidateReviews.ts',
  'src/components/GlobalProviderCandidateReviewPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_PROVIDER_CANDIDATE_EVIDENCE_REVIEW.md',
].map(read))

for (const table of ['global_provider_candidate_review_controls',
  'global_provider_candidate_review_profiles', 'global_provider_candidate_evidence_requirements',
  'global_provider_candidate_review_matrix']) {
  assert(migration.includes(`create table public.${table}`), `Missing ${table}`)
}
for (const view of ['global_provider_candidate_review_status',
  'global_provider_candidate_review_catalog', 'global_provider_candidate_evidence_catalog',
  'global_provider_candidate_review_matrix_catalog']) {
  assert(migration.includes(`create view public.${view}`), `Missing ${view}`)
}
for (const contract of ['source_family_target = 8', 'review_packet_target = 8',
  'evidence_requirement_target = 12', 'review_matrix_target = 96',
  'not provider_candidate_selection_enabled', 'not review_packet_open_enabled',
  'not evidence_submission_enabled', 'not evidence_document_storage_enabled',
  'not endpoint_connectivity_enabled', 'not credential_storage_enabled',
  'not external_payload_intake_enabled', 'not fixture_execution_enabled',
  'not conformance_approval_enabled', 'not candidate_write_enabled',
  'not observation_release_enabled', 'not model_training_enabled',
  'not autonomous_publication_enabled', 'not autonomous_trade_execution_enabled',
  'Global provider candidate-review reference records are append-only']) {
  assert(migration.includes(contract), `Missing Phase 8N candidate-review boundary: ${contract}`)
}
assert((migration.match(/^  \([1-9][0-9]?,'.*','(?:legal|rights|privacy|security|data_contract|testing|operations|governance)','.*','.*'\)[,;]$/gm) ?? []).length === 12,
  'Expected twelve candidate evidence requirements')
assert(test.includes('select plan(42)'), 'PgTAP plan changed')
assert(smoke.includes('global_provider_candidate_review_status'), 'Smoke omits candidate-review status')

for (const view of ['global_provider_candidate_review_status',
  'global_provider_candidate_review_catalog', 'global_provider_candidate_evidence_catalog',
  'global_provider_candidate_review_matrix_catalog']) {
  assert(query.includes(`from('${view}')`), `Client omits ${view}`)
}
for (const copy of ['Provider candidate evidence review',
  'No provider candidate is selected in Phase 8N',
  'Eight unopened review packets', 'Twelve evidence gates before conformance testing',
  'Phase 8N is an evidence checklist, not a provider onboarding or activation']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#provider-candidate-review'"), 'App omits candidate-review route')
assert(app.includes("import('./components/GlobalProviderCandidateReviewPanel')"), 'Candidate-review route is not lazy')
assert(navigation.includes("href: '#provider-candidate-review'"), 'Navigation omits candidate-review route')
assert(header.includes("'#provider-candidate-review'"), 'Header omits candidate-review route')
assert(browser.includes("page.goto('/#provider-candidate-review')"), 'E2E omits candidate-review route')
assert(production.includes("'#provider-candidate-review'"), 'Production test omits candidate-review route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalProviderCandidateReviews
assert(manifest.phase === '8N' && manifest.status === 'global_provider_candidate_evidence_review_candidate',
  'Manifest is not Phase 8N')
assert(packageJson.scripts?.['check:global-provider-candidate-review'], 'Package omits Phase 8N check')
assert(manifest.requiredChecks.includes('check:global-provider-candidate-review'), 'Manifest omits Phase 8N check')
for (const key of ['workspaceEnabled', 'manualReviewRequired',
  'signedEvidenceReferenceRequired', 'versionedFieldMappingRequired',
  'observedFailureDrillRequired', 'appendOnlyReferenceContracts']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['providerCandidateSelectionEnabled', 'reviewPacketOpenEnabled',
  'evidenceSubmissionEnabled', 'evidenceDocumentStorageEnabled',
  'endpointConnectivityEnabled', 'credentialStorageEnabled',
  'externalPayloadIntakeEnabled', 'fixtureExecutionEnabled',
  'conformanceApprovalEnabled', 'candidateWriteEnabled',
  'observationReleaseEnabled', 'modelTrainingEnabled',
  'autonomousPublicationEnabled', 'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release?.sourceFamilyCount === 8 && release?.reviewPacketCount === 8
  && release?.unopenedReviewPacketCount === 8 && release?.selectedCandidateCount === 0,
  'Candidate-review packet counts changed')
assert(release?.evidenceRequirementCount === 12 && release?.reviewMatrixCount === 96
  && release?.missingEvidenceCount === 96 && release?.approvedEvidenceCount === 0,
  'Candidate evidence counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8N'],
  [verifyData, 'VERIFY_DATA_PHASE_8N'], [buildWeb, 'BUILD_PHASE_8N'],
  [deployWeb, 'DEPLOY_PHASE_8N'], [verifyWeb, 'VERIFY_WEB_PHASE_8N']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-provider-candidate-review'), 'Web gate omits candidate review check')
}
assert(ci.includes('global_provider_candidate_evidence_review.test.sql'), 'CI omits Phase 8N DB test')
assert(deployData.includes('global_provider_candidate_evidence_review_smoke.sql')
  && verifyData.includes('global_provider_candidate_evidence_review_smoke.sql'),
  'Data workflows omit Phase 8N smoke')
assert(publicRead.includes('global_provider_candidate_review_status'), 'Public verifier omits Phase 8N')
assert(deployed.includes('manifest.globalProviderCandidateReviews'), 'Web verifier omits Phase 8N')
assert(roadmap.includes('Phase 8N — provider-candidate evidence review (implemented foundation)'),
  'Roadmap omits Phase 8N')
assert(guide.includes('No provider candidate is')
  && guide.includes('selected, named, connected or approved'),
  'Guide omits the no-provider-candidate contract')

console.log('Global provider candidate evidence review passed: 96 missing evidence cells, zero candidates and no endpoint access.')
