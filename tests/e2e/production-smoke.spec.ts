import { expect, test, type Page } from '@playwright/test'

const baseURL = new URL(process.env.WEB_PRODUCTION_URL ?? 'https://invalid.example')

const publicWorkspaces = [
  ['#dashboard', 'One platform. Focused workspaces.'],
  ['#analytics-studio', 'Governed Analytics Studio'],
  ['#stock-research', 'Interactive stock intelligence'],
  ['#research-copilot', 'Private research copilot'],
  ['#forecasts', 'Forecast governance dashboard'],
  ['#markets', 'Synchronized markets dashboard'],
  ['#academy', 'Learn the product and its risks'],
  ['#paper-investing', 'Paper investing lab'],
  ['#risk-command-center', 'Risk command center'],
  ['#data-trust', 'Data trust and notifications'],
  ['#payments', 'Indicative payment corridors'],
  ['#system-status', 'Production reliability'],
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

  await page.goto('/#paper-investing', { waitUntil: 'domcontentloaded' })
  await dismissWelcome(page)
  await expect(page.getByText('Sign in to create a private paper portfolio')).toBeVisible()

  await page.goto('/#brokerage-readiness', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/create a non-executable preview/i)).toBeVisible()

  await page.goto('/#payments', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('Sandbox · no money movement')).toBeVisible()
  await expect(page.getByRole('button', { name: /execute|place live|submit live/i })).toHaveCount(0)

  expect(failures, failures.join('\n')).toEqual([])
})
