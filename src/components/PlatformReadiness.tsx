import {
  BarChart3,
  BrainCircuit,
  Gauge,
  Globe2,
  GraduationCap,
  Landmark,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

const capabilities = [
  {
    label: 'Global stock research',
    status: 'Coverage registry active',
    detail: 'Search, evidence, risk flags and per-stock forecast states',
    tone: 'active',
    icon: BarChart3,
  },
  {
    label: 'Global intelligence',
    status: 'Foundation active',
    detail: 'Markets, trade, countries and source provenance',
    tone: 'active',
    icon: Globe2,
  },
  {
    label: 'ML forecasting',
    status: 'Validation gated',
    detail: 'Only models that beat the baseline are displayed',
    tone: 'active',
    icon: BrainCircuit,
  },
  {
    label: 'Paper investing',
    status: 'Phase 4F decision intelligence',
    detail: 'Virtual cash, private theses, AI evidence snapshots and outcome scoring',
    tone: 'active',
    icon: Landmark,
  },
  {
    label: 'Portfolio risk',
    status: 'Command center active',
    detail: 'NAV, scenarios, limits, reconciliation and kill switch',
    tone: 'active',
    icon: Gauge,
  },
  {
    label: 'TradePulse Academy',
    status: 'Guided learning active',
    detail: 'Courses, product tour, quizzes and private progress',
    tone: 'active',
    icon: GraduationCap,
  },
  {
    label: 'Live execution',
    status: 'Phase 4E operations monitoring',
    detail: 'Alpaca read-only freshness, reconciliation alerts and certification evidence are visible; routing remains hard locked',
    tone: 'locked',
    icon: ShieldCheck,
  },
  {
    label: 'Cross-border payments',
    status: 'Deferred to final phase',
    detail: 'Indicative quotes only; custody and settlement remain disabled',
    tone: 'locked',
    icon: WalletCards,
  },
]

export function PlatformReadiness() {
  return (
    <section className="readiness-grid" aria-label="Platform capability status">
      {capabilities.map((capability) => {
        const Icon = capability.icon

        return (
          <article key={capability.label} className="readiness-card">
            <div className={`readiness-icon ${capability.tone}`}>
              <Icon size={16} />
            </div>
            <div>
              <strong>{capability.label}</strong>
              <span className={`readiness-status ${capability.tone}`}>
                {capability.status}
              </span>
              <p>{capability.detail}</p>
            </div>
          </article>
        )
      })}
    </section>
  )
}
