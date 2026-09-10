import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [migration, databaseTest, smoke, edgeFunction, query, panel, app, navigation,
  header, browserTest, productionTest, manifestText, packageText, ci, deployData,
  verifyData, buildWeb, deployWeb, verifyWeb, publicRead, deployedVerification,
  config, roadmap, guide] = await Promise.all([
  read('supabase/migrations/048_global_brokerage_custody_orchestration.sql'),
  read('supabase/tests/database/global_brokerage_custody_orchestration.test.sql'),
  read('supabase/tests/production/global_brokerage_custody_orchestration_smoke.sql'),
  read('supabase/functions/manage-global-brokerage-custody/index.ts'),
  read('src/lib/queries/globalBrokerageCustody.ts'),
  read('src/components/GlobalBrokerageCustodyPanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/components/ProductPageHeader.tsx'),
  read('tests/e2e/controlled-beta.spec.ts'),
  read('tests/e2e/production-smoke.spec.ts'),
  read('public/beta-release.json'),
  read('package.json'),
  read('.github/workflows/ci.yml'),
  read('.github/workflows/deploy-supabase.yml'),
  read('.github/workflows/verify-supabase-production.yml'),
  read('.github/workflows/build-web-release.yml'),
  read('.github/workflows/deploy-web-production.yml'),
  read('.github/workflows/verify-web-production.yml'),
  read('scripts/verify-public-runtime-read.sh'),
  read('scripts/verify-web-deployment.mjs'),
  read('supabase/config.toml'),
  read('docs/PRODUCT_ROADMAP.md'),
  read('docs/GLOBAL_BROKERAGE_CUSTODY_ORCHESTRATION.md'),
])

for (const table of [
  'global_brokerage_custody_controls', 'global_brokerage_partner_roles',
  'global_brokerage_launch_matrix', 'global_brokerage_onboarding_requirements',
  'global_brokerage_onboarding_cases', 'global_brokerage_evidence_rehearsals',
  'global_brokerage_order_previews', 'global_brokerage_reconciliation_runs',
  'global_brokerage_reconciliation_items',
]) assert(migration.includes(`create table public.${table}`), `Migration omits ${table}`)

for (const view of [
  'global_brokerage_launch_matrix_catalog', 'global_brokerage_orchestration_summary',
  'global_brokerage_onboarding_progress', 'global_brokerage_preview_history',
  'global_brokerage_reconciliation_history',
]) assert(migration.includes(`create view public.${view}`), `Migration omits ${view}`)

for (const fn of [
  'initialize_global_brokerage_case', 'record_global_brokerage_evidence_rehearsal',
  'create_global_brokerage_order_preview', 'reconcile_global_brokerage_case',
]) {
  assert(migration.includes(`create or replace function public.${fn}`), `Migration omits ${fn}`)
  assert(migration.includes(`grant execute on function public.${fn}`), `${fn} is not service-role executable`)
  assert(edgeFunction.includes(fn), `Protected Edge Function omits ${fn}`)
}

for (const contract of [
  "activation_status = 'blocked'", "matrix_status = 'blocked'",
  "assignment_status = 'unassigned'", "credential_status = 'absent'",
  'identity_bound', 'evidence_expires', 'not raw_evidence_storage_enabled',
  'not approval_effect', "source_type = 'deterministic_fixture'",
  'commission_amount', 'venue_fee_amount', 'estimated_tax_amount',
  'fx_rate_to_base', 'buying_power_status', 'settlement_currency',
  'route_option_count', "funding_source_type = 'separate_unconnected'",
  'not cross_border_payment_linked', 'not executable',
  'not partner_instruction_created', "reconciliation_status = 'not_ready'",
  'partner_statement_count', 'signed_event_count', 'not production_effect',
  "current_setting('request.jwt.claim.role', true) <> 'service_role'",
  'not live_broker_connectivity_enabled', 'not custody_accounts_enabled',
  'not exchange_access_assigned',
  'not real_cash_ledger_enabled', 'not real_position_ledger_enabled',
  'not settlement_instructions_enabled', 'not market_data_credentials_enabled',
  'not cross_border_funding_link_enabled', 'not live_order_routing_enabled',
  'not automatic_activation_enabled',
]) assert(migration.includes(contract), `Migration contract missing: ${contract}`)

assert(databaseTest.includes('select plan(96)'), 'Phase 8D PgTAP plan changed unexpectedly')
for (const index of [
  'idx_global_brokerage_evidence_user_created',
  'idx_global_brokerage_evidence_case_expiry',
  'idx_global_brokerage_previews_user_created',
  'idx_global_brokerage_reconciliation_user_created',
]) assert(migration.includes(index), `Phase 8D query index missing: ${index}`)
assert(migration.match(/pg_advisory_xact_lock/g)?.length === 4, 'Phase 8D mutations omit transaction-scoped idempotency locks')
for (const blockReason of [
  ['GLOBAL_ACTIVATION_BLOCKED', 'tradepulse'],
  ['PARTNERS_UNASSIGNED', 'operations'],
  ['ONBOARDING_UNAPPROVED', 'compliance'],
  ['BUYING_POWER_UNAVAILABLE', 'broker'],
  ['PAYMENT_FUNDING_SEPARATE', 'payments'],
]) {
  const [code, owner] = blockReason
  const objectPrefix = `jsonb_build_object('code', '${code}', 'owner', '${owner}', 'message', `
  assert(migration.includes(objectPrefix), `Phase 8D block reason is missing a complete code/owner/message tuple: ${code}`)
}
assert(smoke.includes("to_regclass('public.global_live_brokerage_orders') is not null"), 'Production smoke omits live-order absence check')
assert(smoke.includes("to_regprocedure('public.link_payment_quote_to_brokerage_cash(jsonb)') is not null"), 'Production smoke omits payment-funding absence check')
assert(edgeFunction.includes('requireVerifiedMfaWhenEnrolled: true'), 'Phase 8D API omits verified-MFA enforcement')
assert(edgeFunction.includes("observeEdgeHandler('global-brokerage-custody'"), 'Phase 8D API omits observability')
assert(edgeFunction.includes("crypto.subtle.digest('SHA-256'"), 'Evidence rehearsal omits one-way digesting')
assert(config.includes('[functions.manage-global-brokerage-custody]\nverify_jwt = true'), 'Phase 8D API does not explicitly verify JWTs')
assert(query.includes("from('global_brokerage_launch_matrix_catalog')"), 'Client query omits launch matrix')
assert(query.includes("functions.invoke('manage-global-brokerage-custody'"), 'Client query omits protected orchestration API')

for (const copy of [
  'Brokerage and custody control plane', 'Production credentials cannot activate a market',
  'A payment quote cannot become brokerage cash', 'Exact launch matrix',
  'Independent partner responsibilities', 'Expiring evidence rehearsal',
  'Complete cost preview', 'Independent ledger reconciliation',
]) assert(panel.includes(copy), `Phase 8D UI omits: ${copy}`)
assert(app.includes("activeHref === '#brokerage-custody'"), 'Application omits the Phase 8D route')
assert(app.includes("import('./components/GlobalBrokerageCustodyPanel')"), 'Phase 8D route is not deferred')
assert(navigation.includes("href: '#brokerage-custody'"), 'Product navigation omits Phase 8D')
assert(header.includes("title: 'Brokerage and custody control plane'"), 'Page header omits Phase 8D copy')
assert(browserTest.includes("page.goto('/#brokerage-custody')"), 'Controlled-beta browser test omits Phase 8D')
assert(productionTest.includes("'#brokerage-custody'"), 'Production browser test omits Phase 8D')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.globalBrokerageCustody
assert(manifest.phase === '8D', 'Release manifest is not Phase 8D')
assert(manifest.status === 'global_brokerage_custody_candidate', 'Release status is not the Phase 8D candidate')
assert(manifest.requiredChecks.includes('check:global-brokerage-custody'), 'Manifest omits the Phase 8D check')
assert(packageJson.scripts?.['check:global-brokerage-custody'], 'Package scripts omit the Phase 8D check')
assert(release?.launchMatrixCount === 4 && release?.partnerRoleCount === 5 && release?.onboardingRequirementCount === 10, 'Manifest Phase 8D scenario counts are incomplete')
for (const lock of [
  'liveBrokerConnectivityEnabled', 'exchangeConnectivityEnabled',
  'exchangeAccessAssigned',
  'clearingConnectivityEnabled', 'custodyAccountsEnabled',
  'customerAssetSafeguardingEnabled', 'realCashLedgerEnabled',
  'realPositionLedgerEnabled', 'settlementInstructionsEnabled',
  'marketDataCredentialsEnabled', 'crossBorderFundingLinkEnabled',
  'liveOrderRoutingEnabled', 'automaticActivationEnabled',
]) assert(release?.[lock] === false, `Phase 8D lock is not false: ${lock}`)

for (const [workflow, confirmation] of [
  [deployData, 'DEPLOY_DATA_PHASE_8D'], [verifyData, 'VERIFY_DATA_PHASE_8D'],
  [buildWeb, 'BUILD_PHASE_8D'], [deployWeb, 'DEPLOY_PHASE_8D'],
  [verifyWeb, 'VERIFY_WEB_PHASE_8D'],
]) assert(workflow.includes(confirmation), `Workflow omits ${confirmation}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:global-brokerage-custody'), 'A web gate omits the Phase 8D check')
}
assert(ci.includes('global_brokerage_custody_orchestration.test.sql'), 'CI omits Phase 8D database tests')
assert(deployData.includes('global_brokerage_custody_orchestration_smoke.sql'), 'Data deploy omits Phase 8D smoke')
assert(verifyData.includes('global_brokerage_custody_orchestration_smoke.sql'), 'Data verification omits Phase 8D smoke')
assert(deployData.includes('functions deploy manage-global-brokerage-custody'), 'Data deploy omits Phase 8D Edge Function')
assert(publicRead.includes('global_brokerage_launch_matrix_catalog'), 'Public runtime check omits Phase 8D launch matrix')
assert(deployedVerification.includes('manifest.globalBrokerageCustody'), 'Deployed verification omits Phase 8D locks')
assert(roadmap.includes('Phase 8D — global brokerage and custody orchestration (implemented foundation)'), 'Roadmap omits implemented Phase 8D foundation')
assert(guide.includes('Production credentials alone have no activation'), 'Phase 8D guide omits credential boundary')

console.log('Global brokerage and custody orchestration passed: exact blocked matrices, expiring evidence rehearsals, transparent costs and independent reconciliation gaps.')
