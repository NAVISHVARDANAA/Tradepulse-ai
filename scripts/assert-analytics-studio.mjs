import { readFile } from 'node:fs/promises'

const root = new URL('../', import.meta.url)
const read = (path) => readFile(new URL(path, root), 'utf8')
const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const [studio, app, navigation, styles, documentation] = await Promise.all([
  read('src/components/AnalyticsStudioPanel.tsx'),
  read('src/App.tsx'),
  read('src/components/ProductNavigation.tsx'),
  read('src/index.css'),
  read('docs/ENTERPRISE_ANALYTICS.md'),
])

for (const subject of ['markets', 'forecasts', 'equities', 'trade']) {
  assert(studio.includes(`${subject}: {`), `Analytics Studio omits subject area: ${subject}`)
}

for (const contract of [
  'Semantic metric dictionary',
  'Source to insight',
  'Save view',
  'Saved views',
  'Export CSV',
  'Drill through',
  'URL.createObjectURL',
  'localStorage.setItem',
  'Snowflake adapter: not connected',
  'Current governed runtime: Supabase Postgres',
]) {
  assert(studio.includes(contract), `Analytics Studio contract missing: ${contract}`)
}

assert(!studio.includes('Snowflake connected'), 'Analytics Studio overstates Snowflake connectivity')
assert(navigation.includes("href: '#analytics-studio'"), 'Analytics Studio is absent from product navigation')
assert(app.includes("activeHref === '#analytics-studio'"), 'Analytics Studio route is not rendered')
assert(app.includes('marketAssets={marketAssets}'), 'Analytics Studio omits governed market data')
assert(app.includes('forecasts={forecasts}'), 'Analytics Studio omits governed forecast data')
assert(app.includes('equityResearch={equityResearch}'), 'Analytics Studio omits governed equity data')
assert(app.includes('tradeDashboard={tradeDashboard}'), 'Analytics Studio omits governed trade data')
assert(styles.includes('.analytics-control-grid'), 'Analytics Studio responsive controls are unstyled')
assert(styles.includes('.analytics-drillthrough'), 'Analytics Studio drill-through is unstyled')
assert(documentation.includes('Snowflake is not connected'), 'Analytics documentation overstates warehouse activation')
assert(documentation.includes('Power BI bookmarks and exports'), 'Analytics reference mapping omits Power BI')
assert(documentation.includes('OAC subject areas'), 'Analytics reference mapping omits OAC')

console.log('Analytics Studio contract passed: 4 governed subjects, semantic metrics, drill-through, saved views, CSV and lineage.')
