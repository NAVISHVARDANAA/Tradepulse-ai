import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [migration, databaseTest, smoke, edgeFunction, query, panel, app, navigation, header,
  browserTest, productionTest, manifestText, packageText, ci, deployData, verifyData,
  buildWeb, deployWeb, verifyWeb, publicRead, deployedVerification, config, roadmap, guide] = await Promise.all([
  read('supabase/migrations/047_options_education_paper_trading.sql'),
  read('supabase/tests/database/options_education_paper_trading.test.sql'),
  read('supabase/tests/production/options_education_paper_trading_smoke.sql'),
  read('supabase/functions/manage-options-paper/index.ts'),
  read('src/lib/queries/optionsPaperTrading.ts'),
  read('src/components/OptionsPaperTradingPanel.tsx'),
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
  read('docs/OPTIONS_EDUCATION_PAPER_TRADING.md'),
])

for (const table of [
  'options_paper_controls', 'options_chain_entitlements', 'options_chain_scenarios',
  'options_paper_accounts', 'options_paper_appropriateness_profiles',
  'options_paper_strategies', 'options_paper_legs', 'options_paper_events',
  'options_paper_journal_entries', 'options_paper_journal_lines',
  'options_paper_reconciliations',
]) assert(migration.includes(`create table public.${table}`), `Migration omits ${table}`)

for (const fn of [
  'initialize_options_paper_account', 'create_options_paper_strategy',
  'simulate_options_paper_event', 'reconcile_options_paper_portfolio',
]) {
  assert(migration.includes(`create or replace function public.${fn}`), `Migration omits ${fn}`)
  assert(migration.includes(`grant execute on function public.${fn}`), `${fn} is not service-role executable`)
  assert(edgeFunction.includes(fn), `Protected Edge Function omits ${fn}`)
}

for (const contract of [
  "strategy_type in ('long_call', 'long_put', 'bull_call_spread', 'bear_put_spread')",
  "loss_risk = 'bounded'", 'protective_long_leg_required', 'max_profit', 'max_loss',
  'break_even_price', 'implied_volatility', 'delta', 'gamma', 'theta', 'vega',
  "event_type in ('expiration', 'exercise', 'assignment', 'early_assignment', 'corporate_action')",
  'options_paper_journal_lines', "source_type = 'deterministic_fixture'",
  "current_setting('request.jwt.claim.role', true) <> 'service_role'",
  'not live_market_data_enabled', 'not live_options_routing_enabled',
  'not broker_connectivity_enabled', 'not real_customer_funds_enabled',
  'not real_positions_enabled', 'not custody_enabled', 'not real_settlement_enabled',
  'not margin_enabled', 'not uncovered_short_options_enabled',
  'not automatic_options_permission_enabled',
]) assert(migration.includes(contract), `Migration contract missing: ${contract}`)

assert(databaseTest.includes('select plan(82)'), 'Phase 8C PgTAP plan changed unexpectedly')
assert(smoke.includes("to_regclass('public.live_options_orders') is not null"), 'Production smoke omits the live-options absence check')
assert(edgeFunction.includes('requireVerifiedMfaWhenEnrolled: true'), 'Options paper API omits verified-MFA enforcement')
assert(edgeFunction.includes("observeEdgeHandler('options-paper'"), 'Options paper API omits observability')
assert(config.includes('[functions.manage-options-paper]\nverify_jwt = true'), 'Options paper API does not explicitly verify JWTs')
assert(query.includes("from('options_paper_chain_catalog')"), 'Client query omits the educational chain')
assert(query.includes("functions.invoke('manage-options-paper'"), 'Client query omits the protected API')
assert(query.includes('buildOptionsStrategyPreview'), 'Client omits deterministic payoff calculation')

for (const copy of ['Defined-risk options paper lab', 'Options permission is never granted here',
  'Educational strategy builder', 'Maximum loss', 'Option chain scenario', 'Lifecycle rehearsal',
  'Ledger and risk reconciliation']) {
  assert(panel.includes(copy), `Phase 8C UI omits: ${copy}`)
}
assert(panel.includes('<PayoffDiagram'), 'Phase 8C UI omits the payoff diagram')
assert(app.includes("activeHref === '#options-paper'"), 'Application omits the options paper route')
assert(app.includes("import('./components/OptionsPaperTradingPanel')"), 'Options paper route is not deferred')
assert(navigation.includes("href: '#options-paper'"), 'Product navigation omits the options paper route')
assert(header.includes("title: 'Defined-risk options paper lab'"), 'Page header omits Phase 8C copy')
assert(browserTest.includes("page.goto('/#options-paper')"), 'Controlled-beta browser test omits Phase 8C')
assert(productionTest.includes("'#options-paper'"), 'Production browser test omits Phase 8C')

const manifest = JSON.parse(manifestText)
const packageJson = JSON.parse(packageText)
const release = manifest.optionsEducationPaperTrading
assert(manifest.phase === '8C', 'Release manifest is not Phase 8C')
assert(manifest.status === 'options_education_paper_trading_candidate', 'Release status is not the Phase 8C candidate')
assert(manifest.requiredChecks.includes('check:options-paper-trading'), 'Manifest omits the Phase 8C check')
assert(packageJson.scripts?.['check:options-paper-trading'], 'Package scripts omit the Phase 8C check')
assert(release?.chainContractCount === 8 && release?.underlyingCount === 2 && release?.supportedStrategyCount === 4, 'Manifest options scenario counts are incomplete')
for (const lock of ['liveMarketDataConnectivityEnabled', 'liveOptionsRoutingEnabled',
  'brokerConnectivityEnabled', 'customerFundingEnabled', 'realPositionsEnabled',
  'custodyEnabled', 'realSettlementEnabled', 'marginEnabled',
  'uncoveredShortOptionsEnabled', 'automaticOptionsPermissionEnabled']) {
  assert(release?.[lock] === false, `Phase 8C lock is not false: ${lock}`)
}

for (const [workflow, confirmation] of [
  [deployData, 'DEPLOY_DATA_PHASE_8C'], [verifyData, 'VERIFY_DATA_PHASE_8C'],
  [buildWeb, 'BUILD_PHASE_8C'], [deployWeb, 'DEPLOY_PHASE_8C'], [verifyWeb, 'VERIFY_WEB_PHASE_8C'],
]) assert(workflow.includes(confirmation), `Workflow omits ${confirmation}`)
for (const workflow of [ci, buildWeb, deployWeb, verifyWeb]) {
  assert(workflow.includes('check:options-paper-trading'), 'A web gate omits the Phase 8C check')
}
assert(ci.includes('options_education_paper_trading.test.sql'), 'CI omits Phase 8C database tests')
assert(deployData.includes('options_education_paper_trading_smoke.sql'), 'Data deploy omits Phase 8C smoke')
assert(verifyData.includes('options_education_paper_trading_smoke.sql'), 'Data verification omits Phase 8C smoke')
assert(deployData.includes('functions deploy manage-options-paper'), 'Data deploy omits the Phase 8C Edge Function')
assert(publicRead.includes('options_paper_chain_catalog'), 'Public runtime check omits the Phase 8C chain catalog')
assert(deployedVerification.includes('manifest.optionsEducationPaperTrading'), 'Deployed verification omits Phase 8C locks')
assert(roadmap.includes('Phase 8C — options education and paper trading (implemented foundation)'), 'Roadmap omits the Phase 8C foundation')
assert(guide.includes('No live option, broker, margin or real-money system'), 'Phase 8C guide omits the execution boundary')

console.log('Options education and paper trading passed: deterministic chains, protected strategies, bounded loss and isolated virtual lifecycle accounting.')
