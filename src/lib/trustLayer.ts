import type { ProductHref } from '../components/ProductNavigation'

export type TrustExperienceMode = 'guided' | 'professional'

export type LocalTrustActivity = {
  id: string
  href: ProductHref
  label: string
  occurredAt: string
}

export type TrustReceiptStandard = {
  id: 'forecast' | 'brokerage-preview' | 'cross-border-quote'
  title: string
  description: string
  evidence: readonly string[]
  boundary: string
}

const activityKey = 'tradepulse-trust-activity-v1'
const modeKey = 'tradepulse-trust-mode-v1'
const activityEvent = 'tradepulse:trust-activity'
const maximumActivityEntries = 20

export const trustReceiptStandards: readonly TrustReceiptStandard[] = [
  {
    id: 'forecast',
    title: 'Forecast receipt',
    description: 'The evidence required before a probabilistic forecast can be reviewed.',
    evidence: [
      'Source and observation freshness',
      'Model and evidence version',
      'Uncertainty interval and reliability state',
      'Known limitations and research-only boundary',
    ],
    boundary: 'Decision support only',
  },
  {
    id: 'brokerage-preview',
    title: 'Brokerage preview receipt',
    description: 'The preflight evidence required before any future regulated order flow.',
    evidence: [
      'Instrument, quote source and timestamp',
      'Estimated price, fees and slippage',
      'Risk checks and provider readiness',
      'Non-executable controlled-beta state',
    ],
    boundary: 'Live orders hard locked',
  },
  {
    id: 'cross-border-quote',
    title: 'Cross-border quote receipt',
    description: 'The cost and delivery evidence required before any future transfer flow.',
    evidence: [
      'Reference rate, provider rate and spread',
      'Fees, taxes and total recipient amount',
      'Estimated delivery time and route status',
      'Provider identity and non-executable state',
    ],
    boundary: 'No money movement',
  },
]

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readLocalTrustActivity(): LocalTrustActivity[] {
  if (!storageAvailable()) return []

  try {
    const parsed = JSON.parse(window.localStorage.getItem(activityKey) ?? '[]')
    if (!Array.isArray(parsed)) return []

    return parsed.filter((entry): entry is LocalTrustActivity => (
      typeof entry?.id === 'string'
      && typeof entry?.href === 'string'
      && entry.href.startsWith('#')
      && typeof entry?.label === 'string'
      && typeof entry?.occurredAt === 'string'
    )).slice(0, maximumActivityEntries)
  } catch {
    return []
  }
}

export function recordLocalWorkspaceVisit(href: ProductHref, label: string) {
  if (!storageAvailable()) return

  const occurredAt = new Date().toISOString()
  const previous = readLocalTrustActivity()
  const next: LocalTrustActivity[] = [
    {
      id: `${occurredAt}-${href}`,
      href,
      label,
      occurredAt,
    },
    ...previous,
  ].slice(0, maximumActivityEntries)

  try {
    window.localStorage.setItem(activityKey, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent(activityEvent))
  } catch {
    // Local activity is optional and must never block the product experience.
  }
}

export function clearLocalTrustActivity() {
  if (!storageAvailable()) return

  try {
    window.localStorage.removeItem(activityKey)
    window.dispatchEvent(new CustomEvent(activityEvent))
  } catch {
    // Local activity is optional and must never block the product experience.
  }
}

export function subscribeToLocalTrustActivity(listener: () => void) {
  if (typeof window === 'undefined') return () => undefined

  window.addEventListener(activityEvent, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(activityEvent, listener)
    window.removeEventListener('storage', listener)
  }
}

export function getTrustExperienceMode(): TrustExperienceMode {
  if (!storageAvailable()) return 'guided'
  return window.localStorage.getItem(modeKey) === 'professional'
    ? 'professional'
    : 'guided'
}

export function setTrustExperienceMode(mode: TrustExperienceMode) {
  if (typeof document !== 'undefined') document.documentElement.dataset.productMode = mode
  if (!storageAvailable()) return

  try {
    window.localStorage.setItem(modeKey, mode)
  } catch {
    // The selected mode still applies to the current page when storage is unavailable.
  }
}

export function createSafeSupportContext(
  href: ProductHref,
  reliabilityState: string,
) {
  return [
    'TradePulse AI safe support context',
    'Release: Phase 5G controlled beta',
    `Workspace: ${href}`,
    `Reliability: ${reliabilityState}`,
    `Captured: ${new Date().toISOString()}`,
    'Sensitive data: omitted (no email, token, account, portfolio or payment details)',
  ].join('\n')
}

