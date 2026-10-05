export type RealtimeActivationControl = {
  label: string
  status: 'implemented' | 'external-evidence-required' | 'not-run'
  detail: string
}

export type LicensedRealtimeDataActivation = {
  candidateProvider: 'Twelve Data'
  transport: 'server-side WebSocket'
  delivery: 'Supabase Realtime database changes'
  streamWindowSeconds: 100
  symbolCeiling: 30
  controls: RealtimeActivationControl[]
  implementedControlCount: number
  productionFeedActivated: false
  browserCredentialsExposed: false
  realTimeDisplayEnabled: false
}

const controls: RealtimeActivationControl[] = [
  {
    label: 'Server-side price-stream adapter',
    status: 'implemented',
    detail: 'Strictly parses allow-listed price events and rejects malformed, stale, future, unknown or non-positive observations.',
  },
  {
    label: 'Database-to-browser real-time delivery',
    status: 'implemented',
    detail: 'Validated observations use the existing market_observations publication and route-scoped Supabase Realtime subscription.',
  },
  {
    label: 'Credential and activation isolation',
    status: 'implemented',
    detail: 'The API key remains in server secrets; four independent environment gates and an internal confirmation fail closed.',
  },
  {
    label: 'Executed external-display rights',
    status: 'external-evidence-required',
    detail: 'A business contract, covered instruments, audience rights and applicable exchange terms must be approved outside the application.',
  },
  {
    label: 'Redistribution entitlement',
    status: 'external-evidence-required',
    detail: 'Customer-facing redistribution permission and any exchange add-on must be evidenced before credentials are enabled.',
  },
  {
    label: 'Zero-customer production canary',
    status: 'not-run',
    detail: 'A bounded stream must prove mapping, freshness, storage, observability and rollback before any real user sees a live label.',
  },
]

export async function getLicensedRealtimeDataActivation(): Promise<LicensedRealtimeDataActivation> {
  return {
    candidateProvider: 'Twelve Data',
    transport: 'server-side WebSocket',
    delivery: 'Supabase Realtime database changes',
    streamWindowSeconds: 100,
    symbolCeiling: 30,
    controls,
    implementedControlCount: controls.filter((control) => control.status === 'implemented').length,
    productionFeedActivated: false,
    browserCredentialsExposed: false,
    realTimeDisplayEnabled: false,
  }
}

