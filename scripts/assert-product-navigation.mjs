import { readdir, readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const navigationPath = new URL('../src/components/ProductNavigation.tsx', import.meta.url)
const srcPath = fileURLToPath(new URL('../src', import.meta.url))

async function readSourceTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) return readSourceTree(path)
      if (!['.ts', '.tsx'].includes(extname(path))) return ''
      return readFile(path, 'utf8')
    }),
  )
  return contents.join('\n')
}

const [navigation, applicationSource] = await Promise.all([
  readFile(navigationPath, 'utf8'),
  readSourceTree(srcPath),
])

const expectedGroups = ['Overview', 'Research', 'Investing', 'Business', 'Account']
for (const group of expectedGroups) {
  if (!navigation.includes(`label: '${group}'`)) {
    throw new Error(`Missing required product-navigation group: ${group}`)
  }
}

const hrefs = [...navigation.matchAll(/href: '(#[a-z0-9-]+)'/g)].map(
  (match) => match[1],
)
if (hrefs.length !== 24) {
  throw new Error(`Expected 24 product destinations, found ${hrefs.length}`)
}
if (new Set(hrefs).size !== hrefs.length) {
  throw new Error('Product navigation contains a duplicate destination')
}

for (const href of hrefs) {
  const id = href.slice(1)
  if (!applicationSource.includes(`id="${id}"`)) {
    throw new Error(`Navigation destination does not exist in the application: ${href}`)
  }
}

for (const contract of [
  'aria-current=',
  'aria-expanded=',
  'aria-controls=',
  "event.key !== 'Escape'",
  'productHrefFromHash',
]) {
  if (!navigation.includes(contract)) {
    throw new Error(`Missing navigation accessibility contract: ${contract}`)
  }
}

if (!applicationSource.includes("addEventListener('hashchange'")) {
  throw new Error('Application does not react to hash-route changes')
}

console.log('Product navigation contract passed: 5 groups, 24 valid destinations.')
