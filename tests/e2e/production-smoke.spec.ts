import { expect, test, type Page } from '@playwright/test'

const baseURL = new URL(process.env.WEB_PRODUCTION_URL ?? 'https://invalid.example')

const publicWorkspaces = [
  ['#live-demo', 'A clear, safe TradePulse live demo'],
  ['#demo-feedback', 'Live-demo audience debrief'],
  ['#dashboard', 'One platform. Focused workspaces.'],
  ['#analytics-studio', 'Governed Analytics Studio'],
  ['#global-access', 'Venue and instrument access map'],
  ['#stock-research', 'Interactive stock intelligence'],
  ['#research-copilot', 'Private research copilot'],
  ['#forecasts', 'Forecast governance dashboard'],
  ['#markets', 'Synchronized markets dashboard'],
  ['#academy', 'Learn the product and its risks'],
  ['#paper-investing', 'Paper investing lab'],
  ['#international-paper', 'International paper trading lab'],
  ['#options-paper', 'Defined-risk options paper lab'],
  ['#brokerage-custody', 'Brokerage and custody control plane'],
  ['#agentic-ai', 'TradePulse Agent workspace'],
  ['#global-events', 'Global event impact engine'],
  ['#evidence-operations', 'Evidence operations'],
  ['#country-coverage', 'Global country coverage fabric'],
  ['#dependency-intelligence', 'Global dependency and transmission fabric'],
  ['#observation-intake', 'Observation intake and quarantine'],
  ['#provider-certification', 'Provider certification and isolation'],
  ['#provider-contract-tests', 'Provider contract test laboratory'],
  ['#provider-candidate-review', 'Provider candidate evidence review'],
  ['#provider-review-governance', 'Provider review authority and evidence custody'],
  ['#provider-review-decisions', 'Provider review decisions and audit controls'],
  ['#provider-decision-recovery', 'Provider decision recovery and revocation controls'],
  ['#provider-activation-readiness', 'Provider activation authorization and change controls'],
  ['#provider-activation-rehearsal', 'Provider activation rehearsal and rollback verification'],
  ['#audience-launch-readiness', 'External audience launch readiness'],
  ['#licensed-live-data', 'Licensed live-data integration'],
  ['#provider-commercial-readiness', 'Licensed-provider commercial readiness'],
  ['#audience-pilot-plan', 'Controlled-audience pilot operating model'],
  ['#pilot-activation', 'Controlled pilot activation cockpit'],
  ['#realtime-data-activation', 'Real-time data activation'],
  ['#risk-command-center', 'Risk command center'],
  ['#regulated-preflight', 'Preflight evidence review'],
  ['#sandbox-orders', 'Sandbox order lifecycle'],
  ['#live-readiness', 'Live trading readiness'],
  ['#live-rollout', 'Controlled live rollout'],
  ['#data-trust', 'Data trust and notifications'],
  ['#trust-center', 'Trust and activity center'],
  ['#payments', 'Money movement readiness'],
  ['#system-status', 'Production reliability'],
  ['#beta-operations', 'Beta launch center'],
  ['#approved-pilot', 'Private pilot workspace'],
  ['#beta-hardening', 'Beta hardening center'],
] as const

const failureCopy = /unable to load|could not load|server request could not be completed|temporarily unavailable|configuration is unavailable/i

function observeRuntimeFailures(page: Page) {
  const failures: string[] = []

  page.on('console', (message) => {
    if (message.type() === 'error') failures.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => failures.push(`page: ${error.message}`))
  page.on('response', (response) => {
    const url = new URL(response.url())
    const governedOrigin = url.origin === baseURL.origin || url.hostname.endsWith('.supabase.co')
    if (governedOrigin && response.status() >= 400) {
      failures.push(`HTTP ${response.status()}: ${url.origin}${url.pathname}`)
    }
  })

  return failures
}

async function dismissWelcome(page: Page) {
  const welcome = page.getByRole('dialog', { name: 'Learn before you invest' })
  if (await welcome.isVisible()) {
    await welcome.getByRole('button', { name: 'Explore on my own' }).click()
  }
}

test('every public workspace loads without customer-facing or runtime failures', async ({ page }) => {
  const failures = observeRuntimeFailures(page)

  for (const [hash, heading] of publicWorkspaces) {
    await page.goto(`/${hash}`, { waitUntil: 'domcontentloaded' })
    await dismissWelcome(page)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(page.getByText(failureCopy)).toHaveCount(0)
  }

  expect(failures, failures.join('\n')).toEqual([])
})

test('live demo is explicit, useful and cannot be mistaken for live execution', async ({ page }) => {
  const failures = observeRuntimeFailures(page)
  await page.goto('/#live-demo', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Show the product value in ten minutes.' })).toBeVisible()
  await expect(page.getByText('Curated demo data—not a live feed')).toBeVisible()
  await expect(page.getByText('No orders, payments or real funds')).toBeVisible()

  await page.getByRole('button', { name: /Start guided demo/i }).click()
  await expect(page).toHaveURL(/#analytics-studio$/)
  await expect(page.getByLabel('Demo data is active')).toContainText('no live prices')
  await expect(page.locator('.analytics-table-panel tbody tr').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /buy|sell|trade|pay|transfer|deposit/i })).toHaveCount(0)

  expect(failures, failures.join('\n')).toEqual([])
})

test('audience debrief records structured local evidence without identity or submission', async ({ page }) => {
  const failures = observeRuntimeFailures(page)
  await page.goto('/#live-demo', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Start guided demo/i }).click()

  for (const route of ['#markets', '#stock-research', '#forecasts']) {
    await page.goto(`/${route}`, { waitUntil: 'domcontentloaded' })
  }
  await page.goto('/#demo-feedback', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Turn a live demo into evidence.' })).toBeVisible()
  await expect(page.getByLabel('4 of 4 demo stops completed')).toBeVisible()
  await page.getByLabel('Audience perspective').selectOption('analyst')
  await page.getByRole('group', { name: 'Clarity rating' }).getByLabel('5').check()
  await page.getByRole('group', { name: 'Trust rating' }).getByLabel('4').check()
  await page.getByRole('group', { name: 'Value rating' }).getByLabel('5').check()
  await page.getByLabel('Most useful part').selectOption({ label: 'Evidence lineage' })
  await page.getByLabel('Expected next action').selectOption({ label: 'Join a controlled pilot' })
  await page.getByRole('button', { name: 'Save local debrief' }).click()

  await expect(page.getByRole('status')).toContainText('Nothing was submitted')
  await expect(page.getByRole('button', { name: 'Copy summary' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Download JSON' })).toBeEnabled()
  await expect(page.locator('input[type="email"], input[type="tel"]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /buy|sell|trade|pay|transfer|deposit|invite|sign up/i })).toHaveCount(0)

  const localEvidence = await page.evaluate(() => sessionStorage.getItem('tradepulse-demo-journey-v1'))
  expect(localEvidence).toContain('"audienceRole":"analyst"')
  expect(failures, failures.join('\n')).toEqual([])
})

test('production Analytics Studio filters, saves and drills into governed evidence', async ({ page }) => {
  const failures = observeRuntimeFailures(page)
  await page.goto('/#analytics-studio', { waitUntil: 'domcontentloaded' })
  await dismissWelcome(page)

  const subject = page.getByLabel('Subject area')
  await subject.selectOption({ label: 'Forecast governance' })
  await expect(page.getByLabel('Governance state')).toBeVisible()
  await subject.selectOption({ label: 'Market observations' })

  const reportRows = page.locator('.analytics-table-panel tbody tr')
  await expect(reportRows.first()).toBeVisible()
  const initialRows = await reportRows.count()
  expect(initialRows).toBeGreaterThan(0)

  const distribution = page.locator('.analytics-bars button')
  const firstSegment = distribution.first()
  await expect(firstSegment).toBeVisible()
  await firstSegment.dispatchEvent('click')
  await expect(firstSegment).toHaveAttribute('aria-pressed', 'true')
  await expect(reportRows.first()).toBeVisible()
  const filteredRows = await reportRows.count()
  expect(filteredRows).toBeGreaterThan(0)
  expect(filteredRows).toBeLessThanOrEqual(initialRows)

  const drillThroughButton = reportRows.first().getByRole('button', { name: 'Drill through' })
  await expect(drillThroughButton).toBeVisible()
  await drillThroughButton.dispatchEvent('click')
  const drillThrough = page.locator('.analytics-drillthrough')
  await expect(drillThrough).toBeVisible()
  await expect(drillThrough).toContainText('Evidence source')
  await drillThrough.getByRole('button', { name: 'Close drill-through' }).dispatchEvent('click')
  await expect(drillThrough).toBeHidden()

  const saveView = page.getByRole('button', { name: 'Save view' })
  await expect(saveView).toBeEnabled()
  await saveView.dispatchEvent('click')
  await expect(page.getByRole('status')).toContainText('Saved')
  expect(await page.evaluate(() => localStorage.getItem('tradepulse-analytics-views-v1'))).toBeTruthy()

  expect(failures, failures.join('\n')).toEqual([])
})

test('production execution boundaries remain closed to guests', async ({ page }) => {
  const failures = observeRuntimeFailures(page)

  await page.goto('/#beta-operations', { waitUntil: 'domcontentloaded' })
  await dismissWelcome(page)
  await expect(page.getByText(/never approves or creates users/)).toBeVisible()

  await page.goto('/#approved-pilot', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/cannot approve, enroll or create a tester/)).toBeVisible()

  await page.goto('/#paper-investing', { waitUntil: 'domcontentloaded' })
  await dismissWelcome(page)
  await expect(page.getByText('Sign in to create a private paper portfolio')).toBeVisible()
  await expect(page.getByText(/Approved beta testers receive/)).toBeVisible()

  await page.goto('/#international-paper', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No broker or real-money path exists')).toBeVisible()
  await expect(page.getByText('Private simulation account required')).toBeVisible()
  await expect(page.getByRole('button', { name: /convert|simulate|reconcile|create simulation/i })).toHaveCount(0)

  await page.goto('/#options-paper', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Options permission is never granted here')).toBeVisible()
  await expect(page.getByText('Private options simulation account required')).toBeVisible()
  await expect(page.getByRole('button', { name: /save defined-risk|record lifecycle|reconcile options|create education/i })).toHaveCount(0)

  await page.goto('/#brokerage-custody', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Production credentials cannot activate a market')).toBeVisible()
  await expect(page.getByText(/A payment quote cannot become brokerage cash/)).toBeVisible()
  await expect(page.getByText('Your onboarding and preview rehearsals are private')).toBeVisible()
  await expect(page.getByRole('button', { name: /create review|record evidence|generate blocked|rehearse reconciliation|activate|route|fund|execute/i })).toHaveCount(0)

  await page.goto('/#agentic-ai', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Account required')).toBeVisible()
  await expect(page.getByText(/conversations, report designs and preferences are private/)).toBeVisible()
  await expect(page.getByRole('button', { name: /run grounded agents|save preferences|save reusable report/i })).toHaveCount(0)

  await page.goto('/#global-events', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/current event set is synthetic and cannot train a model/i)).toBeVisible()
  await expect(page.getByText('Rumor promotion off')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save private in-app alert' })).toHaveCount(0)

  await page.goto('/#evidence-operations', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No external source is connected in Phase 8H')).toBeVisible()
  await expect(page.getByText(/workflow fixture, not a real-world claim/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /publish|verify|ingest|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#country-coverage', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No country fact is generated or inferred in Phase 8I')).toBeVisible()
  await expect(page.getByText(/reference checklist, not real-world coverage/i)).toBeVisible()
  await expect(page.getByRole('button', { name: /publish|generate|infer|score|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#dependency-intelligence', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No dependency relationship is inferred in Phase 8J')).toBeVisible()
  await expect(page.getByText('Evidence-empty templates, not market predictions')).toBeVisible()
  await expect(page.getByRole('button', { name: /publish|infer|score|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#observation-intake', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No provider or observation is connected in Phase 8K')).toBeVisible()
  await expect(page.getByText('Nine canonical normalization contracts')).toBeVisible()
  await expect(page.getByRole('button', { name: /ingest|normalize|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-certification', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No provider is selected or connected in Phase 8L')).toBeVisible()
  await expect(page.getByText('Ten gates before an endpoint test')).toBeVisible()
  await expect(page.getByRole('button', { name: /connect|test endpoint|provision|ingest|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-contract-tests', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No provider payload is tested in Phase 8M')).toBeVisible()
  await expect(page.getByText('Ten fail-closed conformance assertions')).toBeVisible()
  await expect(page.getByText(/Synthetic fixtures are specifications, not observations/)).toBeVisible()
  await expect(page.getByRole('button', { name: /connect|run test|ingest|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-candidate-review', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No provider candidate is selected in Phase 8N')).toBeVisible()
  await expect(page.getByText('Twelve evidence gates before conformance testing')).toBeVisible()
  await expect(page.getByText(/Phase 8N is an evidence checklist, not a provider onboarding or activation/)).toBeVisible()
  await expect(page.getByRole('button', { name: /open review|submit|approve|connect|run test|ingest|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-review-governance', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No reviewer or evidence custodian is assigned in Phase 8P')).toBeVisible()
  await expect(page.getByText('Seven-stage sealed-evidence lifecycle')).toBeVisible()
  await expect(page.getByText(/Phase 8P is governance scaffolding, not provider onboarding/)).toBeVisible()
  await expect(page.getByRole('button', { name: /assign|receive|open review|submit|approve|connect|run test|ingest|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-review-decisions', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No provider review decision exists in Phase 8Q')).toBeVisible()
  await expect(page.getByText('Seven human-only decision states')).toBeVisible()
  await expect(page.getByText(/Phase 8Q is decision scaffolding, not provider approval/)).toBeVisible()
  await expect(page.getByRole('button', { name: /record|sign|authorize|approve|connect|run test|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-decision-recovery', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No recovery event exists in Phase 8R')).toBeVisible()
  await expect(page.getByText('Seven manual recovery states')).toBeVisible()
  await expect(page.getByText(/Phase 8R is recovery scaffolding, not incident handling or provider activation/)).toBeVisible()
  await expect(page.getByRole('button', { name: /record|challenge|freeze|rollback|revoke|approve|connect|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-activation-readiness', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No provider activation exists in Phase 8S')).toBeVisible()
  await expect(page.getByText('Seven manual change-control states')).toBeVisible()
  await expect(page.getByText(/Phase 8S is activation-readiness scaffolding, not provider onboarding or production change execution/)).toBeVisible()
  await expect(page.getByRole('button', { name: /request|authorize|schedule|connect|activate|write|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#provider-activation-rehearsal', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No provider rehearsal exists in Phase 8T')).toBeVisible()
  await expect(page.getByText('Seven manual rehearsal states')).toBeVisible()
  await expect(page.getByText(/Phase 8T is rehearsal-readiness scaffolding, not provider testing or activation/)).toBeVisible()
  await expect(page.getByRole('button', { name: /request|schedule|connect|bind|run|rehearse|abort|restore|activate|write|release|publish|train|execute|trade/i })).toHaveCount(0)

  await page.goto('/#audience-launch-readiness', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No external audience is activated in Phase 8U')).toBeVisible()
  await expect(page.getByText('Seven manual launch states')).toBeVisible()
  await expect(page.getByText(/Phase 8U is production launch-readiness scaffolding, not public launch authorization/)).toBeVisible()
  await expect(page.getByRole('button', { name: /launch|activate|approve|provision|signup|connect|publish|train|trade|pay|move|settle/i })).toHaveCount(0)

  await page.goto('/#licensed-live-data', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No licensed live-data provider is connected in Phase 8V')).toBeVisible()
  await expect(page.getByText('Seven manual integration states')).toBeVisible()
  await expect(page.getByText(/Phase 8V is licensed live-data integration scaffolding, not a provider connection or real-user beta/)).toBeVisible()
  await expect(page.getByRole('button', { name: /connect|credential|intake|display|publish|activate|approve|trade|pay|move|settle/i })).toHaveCount(0)

  await page.goto('/#provider-commercial-readiness', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No provider is shortlisted or contracted in Phase 8W')).toBeVisible()
  await expect(page.getByText('Seven manual commercial states')).toBeVisible()
  await expect(page.getByText(/Phase 8W is commercial-review scaffolding, not vendor selection, contract execution, procurement approval or provider activation/)).toBeVisible()
  await expect(page.getByRole('button', { name: /shortlist|quote|accept|sign|purchase|contract|connect|activate|deploy|pay|trade/i })).toHaveCount(0)

  await page.goto('/#audience-pilot-plan', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No participant invitations or public signup are enabled in Phase 8X')).toBeVisible()
  await expect(page.getByText('Five learning cohorts')).toBeVisible()
  await expect(page.getByText('Eight operating workstreams')).toBeVisible()
  await expect(page.getByText(/Phase 8X separates a controlled research\/paper pilot from the real-time-data path/)).toBeVisible()
  await expect(page.getByRole('button', { name: /invite|provision|signup|pay|connect|display|route|trade|move|settle|authorize/i })).toHaveCount(0)

  await page.goto('/#pilot-activation', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('No participant invitation or pilot access is authorized in Phase 8Y')).toBeVisible()
  await expect(page.getByText('Real-time market data is not active')).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Eight activation gates' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Three progressive pilot waves' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Eight immediate stop conditions' })).toBeVisible()
  await expect(page.getByRole('button', { name: /invite|provision|signup|connect|activate|display|route|trade|pay|move|settle|authorize/i })).toHaveCount(0)

  await page.goto('/#realtime-data-activation', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('The real-time adapter is implemented; customer display is not active')).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Six activation controls' })).toBeVisible()
  await expect(page.getByText('No direct browser feed')).toBeVisible()
  await expect(page.getByRole('button', { name: /connect|credential|stream|canary|activate|display|deploy|approve|trade|pay|move|settle/i })).toHaveCount(0)

  await page.goto('/#account-security', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Controlled-beta access is limited to approved email addresses/)).toBeVisible()

  await page.goto('/#brokerage-readiness', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/create a non-executable preview/i)).toBeVisible()

  await page.goto('/#global-access', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Global execution remains unavailable')).toBeVisible()
  await expect(page.getByText(/No order routing, broker connection, funding, custody or settlement/)).toBeVisible()
  await expect(page.getByRole('button', { name: /preview|route|trade|buy|sell|fund|execute|submit/i })).toHaveCount(0)

  await page.goto('/#regulated-preflight', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Your preflight evidence is private.')).toBeVisible()
  await expect(page.getByText(/database-constrained to blocked/)).toBeVisible()
  await expect(page.getByRole('button', { name: /submit order|place order|execute/i })).toHaveCount(0)

  await page.goto('/#sandbox-orders', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Your sandbox receipts are private.')).toBeVisible()
  await expect(page.getByText(/browser has no order endpoint/)).toBeVisible()
  await expect(page.getByRole('button', { name: /submit|cancel|replace|place|execute/i })).toHaveCount(0)

  await page.goto('/#live-readiness', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Even complete evidence cannot activate trading.')).toBeVisible()
  await expect(page.getByText(/No live order endpoint exists in this phase/)).toBeVisible()
  await expect(page.getByRole('button', { name: /activate|submit|route|fund|execute/i })).toHaveCount(0)

  await page.goto('/#payments', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Production money movement is blocked—even when every approval is current.')).toBeVisible()
  await expect(page.getByText(/No transfer, webhook, ledger posting, dispute or refund can be created from this workspace/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Production money movement remains blocked' })).toBeVisible()
  await expect(page.getByText(/Approval evidence is informational and append-only/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Rehearse the transfer lifecycle without moving money' })).toBeVisible()
  await expect(page.getByText('Licensed-partner sandbox reference')).toBeVisible()
  await expect(page.getByText(/Sandbox provider calls, transfer writes, webhook ingestion/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 3, name: 'Map compliance gates before any payment' })).toBeVisible()
  await expect(page.getByText('No documents, identities or live screening')).toBeVisible()
  await expect(page.getByText('Compliance activation blocked', { exact: true })).toBeVisible()
  await expect(page.getByText('No names, accounts or addresses')).toBeVisible()
  await expect(page.getByRole('button', { name: /select|accept|transfer|pay|execute|submit|clear|approve/i })).toHaveCount(0)

  expect(failures, failures.join('\n')).toEqual([])
})
