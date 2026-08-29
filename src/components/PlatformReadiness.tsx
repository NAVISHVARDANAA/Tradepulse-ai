import {
  BarChart3,
  BrainCircuit,
  ArrowUpRight,
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
    href: '#stock-research',
    icon: BarChart3,
  },
  {
    label: 'Global intelligence',
    status: 'Foundation active',
    detail: 'Markets, trade, countries and source provenance',
    tone: 'active',
    href: '#markets',
    icon: Globe2,
  },
  {
    label: 'ML forecasting',
    status: 'Phase 4G reliability governed',
    detail: 'Walk-forward, cost and production drift gates control display eligibility',
    tone: 'active',
    href: '#forecasts',
    icon: BrainCircuit,
  },
  {
    label: 'Paper investing',
    status: 'Phase 4F decision intelligence',
    detail: 'Virtual cash, private theses, AI evidence snapshots and outcome scoring',
    tone: 'active',
    href: '#paper-investing',
    icon: Landmark,
  },
  {
    label: 'Portfolio risk',
    status: 'Command center active',
    detail: 'NAV, scenarios, limits, reconciliation and kill switch',
    tone: 'active',
    href: '#risk-command-center',
    icon: Gauge,
  },
  {
    label: 'TradePulse Academy',
    status: 'Guided learning active',
    detail: 'Courses, product tour, quizzes and private progress',
    tone: 'active',
    href: '#academy',
    icon: GraduationCap,
  },
  {
    label: 'Live execution',
    status: 'Phase 4E operations monitoring',
    detail: 'Alpaca read-only freshness, reconciliation alerts and certification evidence are visible; routing remains hard locked',
    tone: 'locked',
    href: '#brokerage-readiness',
    icon: ShieldCheck,
  },
  {
    label: 'Cross-border payments',
    status: 'Deferred to final phase',
    detail: 'Indicative quotes only; custody and settlement remain disabled',
    tone: 'locked',
    href: '#payments',
    icon: WalletCards,
  },
]

export function PlatformReadiness() {
  return (
    <section className="readiness-grid" aria-label="Platform capability status">
      {capabilities.map((capability) => {
        const Icon = capability.icon

        return (
          <a key={capability.label} className="readiness-card" href={capability.href}>
            <div className={`readiness-icon ${capability.tone}`}>
              <Icon size={16} />
            </div>
            <div>
              <strong>{capability.label}</strong>
              <span className={`readiness-status ${capability.tone}`}>
                {capability.status}
              </span>
              <p>{capability.detail}</p>
              <span className="readiness-action">Open workspace <ArrowUpRight size={14} /></span>
            </div>
          </a>
        )
      })}
    </section>
  )
}
