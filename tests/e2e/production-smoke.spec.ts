import { expect, test, type Page } from '@playwright/test'

const baseURL = new URL(process.env.WEB_PRODUCTION_URL ?? 'https://invalid.example')

const publicWorkspaces = [
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
  ['#risk-command-center', 'Risk command center'],
  ['#regulated-preflight', 'Preflight evidence review'],
  ['#sandbox-orders', 'Sandbox order lifecycle'],
  ['#live-readiness', 'Live trading readiness'],
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
