import { BrainCircuit, Globe2, Landmark, ShieldCheck, WalletCards } from 'lucide-react'

const capabilities = [
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
    status: 'Authenticated simulator',
    detail: 'Virtual cash, atomic fills, positions and risk checks',
    tone: 'active',
    icon: Landmark,
  },
  {
    label: 'Cross-border payments',
    status: 'Indicative sandbox',
    detail: 'Quotes only; no custody or settlement',
    tone: 'building',
    icon: WalletCards,
  },
  {
    label: 'Live execution',
    status: 'Compliance locked',
    detail: 'Requires jurisdiction, KYC and licensed providers',
    tone: 'locked',
    icon: ShieldCheck,
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
