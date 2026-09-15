import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (value, message) => { if (!value) throw new Error(message) }

const [migration, test, smoke, query, panel, app, navigation, header, browser,
  production, manifestText, packageText, ci, deployData, verifyData, buildWeb,
  deployWeb, verifyWeb, publicRead, deployed, roadmap, guide] = await Promise.all([
  'supabase/migrations/052_global_evidence_corroboration_operations.sql',
  'supabase/tests/database/global_evidence_corroboration_operations.test.sql',
  'supabase/tests/production/global_evidence_corroboration_operations_smoke.sql',
  'src/lib/queries/globalEvidenceOperations.ts',
  'src/components/EvidenceCorroborationPanel.tsx', 'src/App.tsx',
  'src/components/ProductNavigation.tsx', 'src/components/ProductPageHeader.tsx',
  'tests/e2e/controlled-beta.spec.ts', 'tests/e2e/production-smoke.spec.ts',
  'public/beta-release.json', 'package.json', '.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml', '.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml', '.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml', 'scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs', 'docs/PRODUCT_ROADMAP.md',
  'docs/GLOBAL_EVIDENCE_CORROBORATION_OPERATIONS.md',
].map(read))

for (const table of ['operations_controls', 'source_lanes', 'corroboration_policies',
  'review_cases', 'review_stages', 'decision_ledger']) {
  assert(migration.includes(`create table public.global_evidence_${table}`), `Missing evidence ${table}`)
}
for (const view of ['operations_status', 'source_lane_catalog', 'corroboration_catalog',
  'review_queue_catalog', 'review_stage_catalog']) {
  assert(migration.includes(`create view public.global_evidence_${view}`), `Missing evidence ${view}`)
}
for (const lock of ['connected_source_count = 0', 'not raw_web_scraping_enabled',
  'not private_source_access_enabled', 'not credential_bypass_enabled',
  'not unlicensed_content_storage_enabled', 'not automatic_verification_enabled',
  'not rumor_promotion_enabled', 'not autonomous_publication_enabled',
  'not production_ingestion_enabled', 'not model_training_enabled',
  'not autonomous_trade_execution_enabled', 'Global evidence review records are append-only']) {
  assert(migration.includes(lock), `Missing fail-closed evidence contract: ${lock}`)
}
assert(test.includes('select plan(51)'), 'PgTAP plan changed')
assert(smoke.includes("publish_global_evidence(jsonb)') is not null"), 'Smoke omits publication absence')
assert(query.includes("from('global_evidence_review_queue_catalog')"), 'Client omits review queue')
assert(query.includes("from('global_evidence_review_stage_catalog')"), 'Client omits review stages')
for (const copy of ['Global evidence control room', 'No external source is connected in Phase 8H',
  'Governed source lanes', 'Corroboration rehearsal queue', 'Independent review stages',
  'Claim-specific corroboration policy']) {
  assert(panel.includes(copy), `UI omits ${copy}`)
}
assert(app.includes("activeHref === '#evidence-operations'"), 'App omits evidence route')
assert(app.includes("import('./components/EvidenceCorroborationPanel')"), 'Evidence route is not lazy')
assert(navigation.includes("href: '#evidence-operations'"), 'Navigation omits evidence route')
assert(header.includes("title: 'Evidence operations'"), 'Header omits evidence route')
assert(browser.includes("page.goto('/#evidence-operations')"), 'E2E omits evidence route')
assert(production.includes("'#evidence-operations'"), 'Production test omits evidence route')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalEvidenceOperations
assert(manifest.phase === '8I' && manifest.status === 'global_country_coverage_candidate', 'Manifest is not Phase 8H')
assert(packageJson.scripts?.['check:global-evidence-operations'], 'Package omits Phase 8H check')
assert(manifest.requiredChecks.includes('check:global-evidence-operations'), 'Manifest omits Phase 8H check')
for (const key of ['workspaceEnabled', 'immutableProvenanceRequired', 'sourceRightsReviewRequired',
  'independentCorroborationRequired', 'conflictReviewRequired',
  'humanPublicationReviewRequired', 'appendOnlyDecisionEvidence']) {
  assert(release?.[key] === true, `${key} is not true`)
}
for (const key of ['rawWebScrapingEnabled', 'privateSourceAccessEnabled',
  'credentialBypassEnabled', 'unlicensedContentStorageEnabled',
  'automaticVerificationEnabled', 'rumorPromotionEnabled',
  'autonomousPublicationEnabled', 'productionIngestionEnabled',
  'modelTrainingEnabled', 'autonomousTradeExecutionEnabled']) {
  assert(release?.[key] === false, `${key} is not false`)
}
assert(release.countryCoverageTarget === 195 && release.connectedSourceCount === 0, 'Coverage or connection counts changed')
assert(release.sourceLaneCount === 5 && release.corroborationPolicyCount === 6, 'Evidence policy counts changed')
assert(release.rehearsalCaseCount === 5 && release.reviewStagesPerCase === 8, 'Review counts changed')

for (const [workflow, token] of [[deployData, 'DEPLOY_DATA_PHASE_8I'],
  [verifyData, 'VERIFY_DATA_PHASE_8I'], [buildWeb, 'BUILD_PHASE_8I'],
  [deployWeb, 'DEPLOY_PHASE_8I'], [verifyWeb, 'VERIFY_WEB_PHASE_8I']]) {
  assert(workflow.includes(token), `Workflow omits ${token}`)
}
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-evidence-operations'), 'Web gate omits evidence check')
}
assert(ci.includes('global_evidence_corroboration_operations.test.sql'), 'CI omits Phase 8H DB test')
assert(deployData.includes('global_evidence_corroboration_operations_smoke.sql')
  && verifyData.includes('global_evidence_corroboration_operations_smoke.sql'), 'Data workflows omit Phase 8H smoke')
assert(publicRead.includes('global_evidence_operations_status'), 'Public verifier omits Phase 8H')
assert(deployed.includes('manifest.globalEvidenceOperations'), 'Web verifier omits Phase 8H')
assert(roadmap.includes('Phase 8H — global evidence corroboration operations (implemented foundation)'), 'Roadmap omits Phase 8H')
assert(guide.includes('No external provider is connected by Phase 8H'), 'Guide omits provider boundary')

console.log('Global evidence operations passed: rights, corroboration, publication, training and execution remain fail-closed.')
