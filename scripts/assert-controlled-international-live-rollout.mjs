import { readFile } from 'node:fs/promises'
const root=new URL('../',import.meta.url); const read=(path)=>readFile(new URL(path,root),'utf8')
const assert=(value,message)=>{if(!value) throw new Error(message)}
const [migration,test,smoke,query,panel,app,navigation,header,browser,production,manifestText,packageText,ci,deployData,verifyData,buildWeb,deployWeb,verifyWeb,publicRead,deployed,roadmap,guide]=await Promise.all([
  'supabase/migrations/051_controlled_international_live_rollout.sql',
  'supabase/tests/database/controlled_international_live_rollout.test.sql',
  'supabase/tests/production/controlled_international_live_rollout_smoke.sql',
  'src/lib/queries/controlledLiveRollout.ts','src/components/ControlledLiveRolloutPanel.tsx','src/App.tsx',
  'src/components/ProductNavigation.tsx','src/components/ProductPageHeader.tsx','tests/e2e/controlled-beta.spec.ts',
  'tests/e2e/production-smoke.spec.ts','public/beta-release.json','package.json','.github/workflows/ci.yml',
  '.github/workflows/deploy-supabase.yml','.github/workflows/verify-supabase-production.yml',
  '.github/workflows/build-web-release.yml','.github/workflows/deploy-web-production.yml',
  '.github/workflows/verify-web-production.yml','scripts/verify-public-runtime-read.sh',
  'scripts/verify-web-deployment.mjs','docs/PRODUCT_ROADMAP.md','docs/CONTROLLED_INTERNATIONAL_LIVE_ROLLOUT.md',
].map(read))
for(const table of ['controls','cohorts','limit_policies','scope_decisions','requirements','gate_reviews','drill_templates','drill_observations','decision_ledger'])
  assert(migration.includes(`create table public.controlled_live_rollout_${table}`),`Missing rollout ${table}`)
for(const view of ['status','cohort_catalog','limit_catalog','gate_catalog','drill_catalog'])
  assert(migration.includes(`create view public.controlled_live_rollout_${view}`),`Missing rollout ${view}`)
for(const lock of ['live_cohort_count = 0','not broker_connectivity_enabled','not exchange_connectivity_enabled','not live_market_data_enabled','not live_order_routing_enabled','not customer_funding_enabled','not custody_enabled','not settlement_enabled','not margin_enabled','not options_enabled','not automatic_activation_enabled','not approval_inherited',"enforcement_mode = 'rehearsal_only'",'maximum_funding_credit = 0','Controlled live rollout evidence is append-only'])
  assert(migration.includes(lock),`Missing fail-closed contract: ${lock}`)
assert(test.includes('select plan(50)'),'PgTAP plan changed')
assert(smoke.includes("activate_controlled_live_rollout(jsonb)') is not null"),'Smoke omits activation absence')
assert(query.includes("from('controlled_live_rollout_cohort_catalog')"),'Client omits cohorts')
assert(query.includes("from('controlled_live_rollout_drill_catalog')"),'Client omits drills')
for(const copy of ['Live rollout control plane','No live order endpoint exists in Phase 8G','Exact cohort eligibility ledger','Approval for one row never propagates','Conservative limit rehearsal','Operational exit gates','Operational drills','Exit gate remains closed'])
  assert(panel.includes(copy),`UI omits ${copy}`)
assert(app.includes("activeHref === '#live-rollout'"),'App omits route')
assert(app.includes("import('./components/ControlledLiveRolloutPanel')"),'Route is not lazy')
assert(navigation.includes("href: '#live-rollout'"),'Navigation omits route')
assert(header.includes("title: 'Controlled live rollout'"),'Header omits route')
assert(browser.includes("page.goto('/#live-rollout')"),'E2E omits route')
assert(production.includes("'#live-rollout'"),'Production test omits route')
const manifest=JSON.parse(manifestText); const packageJson=JSON.parse(packageText); const release=manifest.controlledLiveRollout
assert(manifest.phase==='8H'&&manifest.status==='global_evidence_corroboration_candidate','Manifest is not Phase 8G')
assert(packageJson.scripts?.['check:controlled-live-rollout'],'Package omits Phase 8G check')
assert(manifest.requiredChecks.includes('check:controlled-live-rollout'),'Manifest omits Phase 8G check')
for(const key of ['workspaceEnabled','cashEquitiesOnly','exactCohortDecisionsRequired','conservativeLimitRehearsalEnabled','appendOnlyDecisionEvidence','appendOnlyDrillEvidence','manualSignedActivationRequired']) assert(release?.[key]===true,`${key} is not true`)
for(const key of ['approvalInheritanceEnabled','limitsProductionEffect','browserActivationEnabled','brokerConnectivityEnabled','exchangeConnectivityEnabled','liveMarketDataEnabled','liveOrderRoutingEnabled','customerFundingEnabled','custodyEnabled','settlementEnabled','marginEnabled','optionsEnabled','automaticActivationEnabled']) assert(release?.[key]===false,`${key} is not false`)
assert(release.candidateCohortCount===3&&release.liveCohortCount===0,'Cohort counts changed')
assert(release.scopeDecisionsPerCohort===10&&release.requirementCount===18&&release.drillTemplateCount===4,'Control counts changed')
for(const [workflow,token] of [[deployData,'DEPLOY_DATA_PHASE_8H'],[verifyData,'VERIFY_DATA_PHASE_8H'],[buildWeb,'BUILD_PHASE_8H'],[deployWeb,'DEPLOY_PHASE_8H'],[verifyWeb,'VERIFY_WEB_PHASE_8H']]) assert(workflow.includes(token),`Workflow omits ${token}`)
for(const workflow of [ci,buildWeb,deployWeb,verifyWeb]) assert(workflow.includes('check:controlled-live-rollout'),'Web gate omits rollout check')
assert(ci.includes('controlled_international_live_rollout.test.sql'),'CI omits DB tests')
assert(deployData.includes('controlled_international_live_rollout_smoke.sql')&&verifyData.includes('controlled_international_live_rollout_smoke.sql'),'Data workflows omit smoke')
assert(publicRead.includes('controlled_live_rollout_cohort_catalog'),'Public verifier omits rollout')
assert(deployed.includes('manifest.controlledLiveRollout'),'Web verifier omits rollout')
assert(roadmap.includes('Phase 8G — controlled international live rollout (implemented control plane)'),'Roadmap omits Phase 8G')
assert(guide.includes('No Phase 8G code path can activate a cohort'),'Guide omits activation boundary')
console.log('Controlled international rollout passed: exact cohorts, limits, gates and rollback remain fail-closed.')
