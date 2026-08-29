import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { gzipSync } from 'node:zlib'

const assetDirectory = 'dist/assets'
const indexHtml = readFileSync('dist/index.html', 'utf8')
const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'))
const generatedAssetNames = new Set(
  Object.values(manifest).flatMap((entry) => [
    entry.file,
    ...(entry.css ?? []),
    ...(entry.assets ?? []),
  ]).map((file) => basename(file)),
)
const assetFiles = readdirSync(assetDirectory)
  .filter((file) => generatedAssetNames.has(file))
  .filter((file) => file.endsWith('.js') || file.endsWith('.css'))
  .map((file) => ({
    file,
    gzipBytes: gzipSync(readFileSync(join(assetDirectory, file))).byteLength,
  }))

const initialAssetNames = new Set(
  Array.from(indexHtml.matchAll(/(?:src|href)="\/assets\/([^"]+)"/g))
    .map((match) => basename(match[1])),
)
const deferredChunkPattern = /(Panel|Chart|paperTrading)/
const eagerlyLoadedDeferredChunks = Array.from(initialAssetNames)
  .filter((file) => deferredChunkPattern.test(file))
const initialGzipBytes = assetFiles
  .filter((asset) => initialAssetNames.has(asset.file))
  .reduce((total, asset) => total + asset.gzipBytes, 0)
const totalJavaScriptGzipBytes = assetFiles
  .filter((asset) => asset.file.endsWith('.js'))
  .reduce((total, asset) => total + asset.gzipBytes, 0)
const largestAsset = assetFiles.reduce((largest, asset) => (
  asset.gzipBytes > largest.gzipBytes ? asset : largest
))

const budgets = {
  initialGzipBytes: 160 * 1024,
  // Phase 5B adds a 5.1 KiB gzip Analytics Studio chunk without increasing
  // the initial shell. Keep the reviewed total-growth allowance bounded.
  totalJavaScriptGzipBytes: 288 * 1024,
  largestAssetGzipBytes: 90 * 1024,
}

const measurements = {
  initialGzipBytes,
  totalJavaScriptGzipBytes,
  largestAssetGzipBytes: largestAsset.gzipBytes,
}

for (const [metric, value] of Object.entries(measurements)) {
  const limit = budgets[metric]
  const label = metric.replace(/GzipBytes$/, '')
  console.log(`${label}: ${(value / 1024).toFixed(1)} KiB / ${(limit / 1024).toFixed(0)} KiB`)
  if (value > limit) {
    throw new Error(`${label} exceeds the frontend performance budget`)
  }
}

if (eagerlyLoadedDeferredChunks.length > 0) {
  throw new Error(`deferred product chunks were eagerly loaded: ${eagerlyLoadedDeferredChunks.join(', ')}`)
}

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

const authListenerCount = sourceFiles('src')
  .map((file) => readFileSync(file, 'utf8'))
  .reduce((count, source) => count + (source.match(/\.auth\.onAuthStateChange\(/g)?.length ?? 0), 0)

if (authListenerCount !== 1) {
  throw new Error(`expected one application auth listener, found ${authListenerCount}`)
}

console.log(`largestAsset: ${largestAsset.file}`)
console.log(`authListeners: ${authListenerCount}`)
