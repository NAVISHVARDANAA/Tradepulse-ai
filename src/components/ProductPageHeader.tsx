import { Layers3, ShieldCheck } from 'lucide-react'

import type { ProductHref } from './ProductNavigation'

type PageCopy = {
  eyebrow: string
  title: string
  description: string
  boundary: string
}

const pageCopy: Record<string, PageCopy> = {
  '#dashboard': {
    eyebrow: 'Executive dashboard',
    title: 'One platform. Focused workspaces.',
    description: 'Start with a concise operating view, then open the dedicated research, forecasting, simulation, risk or account workspace you need.',
    boundary: 'Evidence-led decisions',
  },
  '#system-status': {
    eyebrow: 'Platform operations',
    title: 'Production reliability',
    description: 'Inspect customer-facing service health, reliability evidence and the current operational state without mixing it into research reports.',
    boundary: 'Safeguards remain active',
  },
  '#data-trust': {
    eyebrow: 'Data governance',
    title: 'Data trust and notifications',
    description: 'Review freshness, completeness and duplicate checks, then manage private notification preferences.',
    boundary: 'Evidence before alerts',
  },
  '#trust-center': {
    eyebrow: 'Customer trust layer',
    title: 'Trust and activity center',
    description: 'Verify decision evidence, review reliability alerts and inspect a private local activity trail before taking the next step.',
    boundary: 'Verify before acting',
  },
  '#analytics-studio': {
    eyebrow: 'Enterprise decision intelligence',
    title: 'Governed Analytics Studio',
    description: 'Explore reusable semantic KPIs with slicers, cross-filtering, drill-through, saved views, export and visible source lineage.',
    boundary: 'Certified metrics',
  },
  '#stock-research': {
    eyebrow: 'Global equity research',
    title: 'Interactive stock intelligence',
    description: 'Filter licensed coverage, compare research scores, inspect price history and drill into the evidence behind each classification.',
    boundary: 'Research—not advice',
  },
  '#research-copilot': {
    eyebrow: 'AI research workflow',
    title: 'Private research copilot',
    description: 'Build evidence-linked watchlists, research alerts and daily briefs in a dedicated customer workspace.',
    boundary: 'Private and evidence linked',
  },
  '#business-research': {
    eyebrow: 'Team intelligence',
    title: 'Shared research library',
    description: 'Organize team research, evidence and reviewable viewpoints without creating an execution instruction.',
    boundary: 'Role protected',
  },
  '#academy': {
    eyebrow: 'TradePulse Academy',
    title: 'Learn the product and its risks',
    description: 'Follow guided lessons, knowledge checks and contextual learning without leaving the education workspace.',
    boundary: 'Education—not advice',
  },
  '#markets': {
    eyebrow: 'Market intelligence',
    title: 'Synchronized markets dashboard',
    description: 'Explore current market snapshots and interactive global trade trends on one reporting canvas.',
    boundary: 'Source timestamps visible',
  },
  '#forecasts': {
    eyebrow: 'Machine-learning intelligence',
    title: 'Forecast governance dashboard',
    description: 'Filter qualified probabilistic forecasts, compare model reliability and inspect uncertainty separately from the main dashboard.',
    boundary: 'Decision support only',
  },
  '#trade-data': {
    eyebrow: 'Country intelligence',
    title: 'Cross-border trade report',
    description: 'Compare exports, imports, trade balance and growth across synchronized country observations.',
    boundary: 'Verified periods only',
  },
  '#paper-investing': {
    eyebrow: 'Simulation workspace',
    title: 'Paper investing lab',
    description: 'Create private virtual portfolios, record theses and test risk-controlled decisions without reaching a broker.',
    boundary: 'No real funds',
  },
  '#risk-command-center': {
    eyebrow: 'Portfolio controls',
    title: 'Risk command center',
    description: 'Analyze exposure, concentration, drawdown, scenarios and reconciliation in a dedicated risk workspace.',
    boundary: 'Monitoring—not permission',
  },
  '#brokerage-readiness': {
    eyebrow: 'Regulated execution runway',
    title: 'Brokerage readiness',
    description: 'Review provider health, certification evidence and non-executable readiness previews while routing remains locked.',
    boundary: 'Live orders hard locked',
  },
  '#payments': {
    eyebrow: 'Cross-border foundation',
    title: 'Indicative payment corridors',
    description: 'Explore sandbox corridor quotes while custody, settlement and money movement remain disabled.',
    boundary: 'No money movement',
  },
  '#business-workspace': {
    eyebrow: 'Business administration',
    title: 'Team workspace',
    description: 'Manage bounded organization access, roles and invitations inside TradePulse AI.',
    boundary: 'Exact-email invitations',
  },
  '#plans': {
    eyebrow: 'Plans and capacity',
    title: 'Product entitlements',
    description: 'Compare transparent product limits and capacity without activating checkout or charging a customer.',
    boundary: 'Checkout locked',
  },
  '#customer-support': {
    eyebrow: 'Customer success',
    title: 'Support and feedback',
    description: 'Submit private product feedback and support requests, then track their references and status.',
    boundary: 'Private customer record',
  },
  '#account-security': {
    eyebrow: 'Account protection',
    title: 'Security center',
    description: 'Manage passwordless access, authenticator verification, protected sessions and private security history.',
    boundary: 'Identity required',
  },
  '#beta-operations': {
    eyebrow: 'Controlled-beta operations',
    title: 'Beta launch center',
    description: 'Follow approved onboarding, private account checks, customer-controlled notifications and evidence-linked support from one focused workspace.',
    boundary: 'Invite-only access',
  },
  '#approved-pilot': {
    eyebrow: 'Approved tester pilot',
    title: 'Private pilot workspace',
    description: 'Accept the current pilot agreement, follow bounded evaluation missions and use staffed feedback or incident escalation.',
    boundary: 'Manual approval required',
  },
  '#beta-hardening': {
    eyebrow: 'Controlled-beta closure',
    title: 'Beta hardening center',
    description: 'Exercise customer-safe recovery, accessibility and performance checks before recording release-readiness evidence.',
    boundary: 'Review only · no activation',
  },
  '#customer-privacy': {
    eyebrow: 'Privacy controls',
    title: 'Data control center',
    description: 'Choose optional data uses and exercise account rights through an auditable, identity-bound workflow.',
    boundary: 'Private by default',
  },
  '#customer-experience': {
    eyebrow: 'Personal settings',
    title: 'Experience preferences',
    description: 'Configure theme, density, accessibility and installation preferences for this device and account.',
    boundary: 'Customer controlled',
  },
}

export function ProductPageHeader({ activeHref }: { activeHref: ProductHref }) {
  const copy = pageCopy[activeHref] ?? pageCopy['#dashboard']

  return (
    <section className="product-page-header" aria-labelledby="product-page-title">
      <div>
        <p className="eyebrow"><Layers3 size={14} /> {copy.eyebrow}</p>
        <h1 id="product-page-title">{copy.title}</h1>
        <p className="subtitle">{copy.description}</p>
      </div>
      <div className="product-page-boundary">
        <ShieldCheck size={18} />
        <div>
          <strong>{copy.boundary}</strong>
          <span>Truth before prediction</span>
        </div>
      </div>
    </section>
  )
}
