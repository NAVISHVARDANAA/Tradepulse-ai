import { Layers3, ShieldCheck } from 'lucide-react'

import type { ProductHref } from './ProductNavigation'

type PageCopy = [eyebrow: string, title: string, description: string, boundary: string]

const pageCopy: Record<string, PageCopy> = {
  '#dashboard': ['Executive dashboard', 'One platform. Focused workspaces.', 'Start with a concise operating view, then open the dedicated research, forecasting, simulation, risk or account workspace you need.', 'Evidence-led decisions'],
  '#system-status': ['Platform operations', 'Production reliability', 'Inspect customer-facing service health, reliability evidence and the current operational state without mixing it into research reports.', 'Safeguards remain active'],
  '#data-trust': ['Data governance', 'Data trust and notifications', 'Review freshness, completeness and duplicate checks, then manage private notification preferences.', 'Evidence before alerts'],
  '#trust-center': ['Customer trust layer', 'Trust and activity center', 'Verify decision evidence, review reliability alerts and inspect a private local activity trail before taking the next step.', 'Verify before acting'],
  '#analytics-studio': ['Enterprise decision intelligence', 'Governed Analytics Studio', 'Explore reusable semantic KPIs with slicers, cross-filtering, drill-through, saved views, export and visible source lineage.', 'Certified metrics'],
  '#agentic-ai': ['Personal agentic intelligence', 'TradePulse Agent workspace', 'Coordinate grounded market, news, forecast and risk agents, then save account-level analysis and reusable report designs.', 'Human-governed · no execution'],
  '#global-events': ['Global event intelligence', 'Global event impact engine', 'Trace authenticated country, commodity, currency and logistics events through probabilistic causal paths with explicit evidence gaps.', 'Scenarios—not predictions of certainty'],
  '#evidence-operations': ['Global evidence governance', 'Evidence operations', 'Inspect how candidate source lanes, claim-specific corroboration and human review would protect the event engine before any external feed is connected.', 'No connected sources · no publication'],
  '#country-coverage': ['World intelligence coverage', 'Global country coverage fabric', 'Inspect one consistent evidence checklist across 195 sovereign-state references and eight intelligence domains without hiding missing facts.', 'Reference identity · evidence gaps visible'],
  '#dependency-intelligence': ['Global dependency intelligence', 'Global dependency and transmission fabric', 'Inspect the evidence contracts and mechanism templates required before country, commodity, logistics, currency or policy relationships can support an impact scenario.', 'No inferred links · no impact score'],
  '#observation-intake': ['Global observation provenance', 'Observation intake and quarantine', 'Inspect the source, normalization, temporal, rights and human-review contracts required before a future observation may leave quarantine.', 'No connected providers · no released data'],
  '#provider-certification': ['Provider certification readiness', 'Provider certification and isolation', 'Inspect the legal, rights, privacy, security, schema and failure-drill evidence required before a future provider may enter a bounded test environment.', 'No selected provider · no endpoint test'],
  '#provider-contract-tests': ['Provider contract readiness', 'Provider contract test laboratory', 'Inspect provider-neutral conformance assertions and deterministic synthetic fixture specifications before any provider-specific adapter may be tested.', 'Specifications only · no provider payload'],
  '#provider-candidate-review': ['Provider evidence governance', 'Provider candidate evidence review', 'Inspect the legal, rights, privacy, security, schema, test and operational evidence required before a provider-specific conformance review may be opened.', 'No selected candidate · no evidence submission'],
  '#provider-review-governance': ['Provider review governance', 'Provider review authority and evidence custody', 'Inspect the independent roles, separation of duties and sealed-evidence lifecycle required before a real provider candidate can be evaluated.', 'No assigned reviewer · no evidence custody'],
  '#provider-review-decisions': ['Provider decision governance', 'Provider review decisions and audit controls', 'Inspect the human-only decision states, mandatory gates and immutable audit requirements needed before a bounded provider review could be authorized.', 'No decision · no approval · no activation'],
  '#provider-decision-recovery': ['Provider recovery governance', 'Provider decision recovery and revocation controls', 'Inspect the fail-closed triggers, manual recovery states and rollback requirements needed before a future provider decision could be challenged or withdrawn.', 'No event · no freeze · no rollback'],
  '#provider-activation-readiness': ['Provider activation governance', 'Provider activation authorization and change controls', 'Inspect the human authorization, bounded change window, restoration and verification requirements needed before a future provider could be activated.', 'No provider · no endpoint · no activation'],
  '#provider-activation-rehearsal': ['Provider rehearsal governance', 'Provider activation rehearsal and rollback verification', 'Inspect the isolation, synthetic-input, observability, abort, restoration and closeout controls required before a provider-specific rehearsal could be authorized.', 'No egress · no credentials · no rehearsal'],
  '#audience-launch-readiness': ['Production launch foundation', 'External audience launch readiness', 'Inspect the domain, identity, legal, support, monitoring, data-rights, capacity and rollback evidence required before a bounded real-user beta.', 'No public signup · no audience activation · no financial execution'],
  '#licensed-live-data': ['Live data', 'Licensed live-data integration', 'Review integration evidence before connecting market data.', 'No provider or payload'],
  '#global-access': ['Global market intelligence', 'Venue and instrument access map', 'Compare canonical venue identities, reference listings, market-data rights, calendar evidence and hypothetical residency outcomes.', 'Research only · no routing'],
  '#stock-research': ['Global equity research', 'Interactive stock intelligence', 'Filter licensed coverage, compare research scores, inspect price history and drill into the evidence behind each classification.', 'Research—not advice'],
  '#research-copilot': ['AI research workflow', 'Private research copilot', 'Build evidence-linked watchlists, research alerts and daily briefs in a dedicated customer workspace.', 'Private and evidence linked'],
  '#business-research': ['Team intelligence', 'Shared research library', 'Organize team research, evidence and reviewable viewpoints without creating an execution instruction.', 'Role protected'],
  '#academy': ['TradePulse Academy', 'Learn the product and its risks', 'Follow guided lessons, knowledge checks and contextual learning without leaving the education workspace.', 'Education—not advice'],
  '#markets': ['Market intelligence', 'Synchronized markets dashboard', 'Explore current market snapshots and interactive global trade trends on one reporting canvas.', 'Source timestamps visible'],
  '#forecasts': ['Machine-learning intelligence', 'Forecast governance dashboard', 'Filter qualified probabilistic forecasts, compare model reliability and inspect uncertainty separately from the main dashboard.', 'Decision support only'],
  '#trade-data': ['Country intelligence', 'Cross-border trade report', 'Compare exports, imports, trade balance and growth across synchronized country observations.', 'Verified periods only'],
  '#paper-investing': ['Simulation workspace', 'Paper investing lab', 'Create private virtual portfolios, record theses and test risk-controlled decisions without reaching a broker.', 'No real funds'],
  '#international-paper': ['International simulation', 'International paper trading lab', 'Rehearse multi-currency, venue-aware equity and ETF orders with deterministic prices, explicit costs, settlement dates and balanced journals.', 'Simulation only · no broker'],
  '#options-paper': ['Options education', 'Defined-risk options paper lab', 'Learn long options and protected debit spreads through deterministic chains, payoff diagrams, Greeks and lifecycle simulations.', 'Education only · no options permission'],
  '#brokerage-custody': ['Global regulated orchestration', 'Brokerage and custody control plane', 'Review exact launch matrices, identity-bound onboarding requirements, transparent cost rehearsals and independent reconciliation gaps.', 'Activation blocked · no partners'],
  '#risk-command-center': ['Portfolio controls', 'Risk command center', 'Analyze exposure, concentration, drawdown, scenarios and reconciliation in a dedicated risk workspace.', 'Monitoring—not permission'],
  '#brokerage-readiness': ['Regulated execution runway', 'Brokerage readiness', 'Review provider health, certification evidence and non-executable readiness previews while routing remains locked.', 'Live orders hard locked'],
  '#regulated-preflight': ['Regulated trading preflight', 'Preflight evidence review', 'Review eligibility, disclosures, suitability, market/reference state, cost availability and bounded risk evidence before any future regulated order flow.', 'No order submission'],
  '#sandbox-orders': ['Partner sandbox operations', 'Sandbox order lifecycle', 'Inspect customer-scoped, append-only evidence for protected partner-sandbox submit, cancel, replace and reconciliation activity.', 'No browser or live route'],
  '#live-readiness': ['Regulated activation governance', 'Live trading readiness', 'Track sanitized written-approval evidence across jurisdiction, broker, compliance, money, risk, operations and customer-protection gates.', 'Activation remains blocked'],
  '#live-rollout': ['Controlled international rollout', 'Controlled live rollout', 'Inspect exact cash-equity candidates, conservative limits, independent approval gaps and rollback evidence.', 'Zero live cohorts · approval required'],
  '#payments': ['Cross-border payment operations', 'Money movement readiness', 'Inspect corridor-specific legal, partner, safeguarding, compliance, security and operating requirements before reviewing synthetic transfer controls.', 'Activation blocked · no transfers'],
  '#business-workspace': ['Business administration', 'Team workspace', 'Manage bounded organization access, roles and invitations inside TradePulse AI.', 'Exact-email invitations'],
  '#plans': ['Plans and capacity', 'Product entitlements', 'Compare transparent product limits and capacity without activating checkout or charging a customer.', 'Checkout locked'],
  '#customer-support': ['Customer success', 'Support and feedback', 'Submit private product feedback and support requests, then track their references and status.', 'Private customer record'],
  '#account-security': ['Account protection', 'Security center', 'Manage passwordless access, authenticator verification, protected sessions and private security history.', 'Identity required'],
  '#beta-operations': ['Controlled-beta operations', 'Beta launch center', 'Follow approved onboarding, private account checks, customer-controlled notifications and evidence-linked support from one focused workspace.', 'Invite-only access'],
  '#approved-pilot': ['Approved tester pilot', 'Private pilot workspace', 'Accept the current pilot agreement, follow bounded evaluation missions and use staffed feedback or incident escalation.', 'Manual approval required'],
  '#beta-hardening': ['Controlled-beta closure', 'Beta hardening center', 'Exercise customer-safe recovery, accessibility and performance checks before recording release-readiness evidence.', 'Review only · no activation'],
  '#customer-privacy': ['Privacy controls', 'Data control center', 'Choose optional data uses and exercise account rights through an auditable, identity-bound workflow.', 'Private by default'],
  '#customer-experience': ['Personal settings', 'Experience preferences', 'Configure theme, density, accessibility and installation preferences for this device and account.', 'Customer controlled'],
}

export function ProductPageHeader({ activeHref }: { activeHref: ProductHref }) {
  const copy = pageCopy[activeHref] ?? pageCopy['#dashboard']

  return (
    <section className="product-page-header" aria-labelledby="product-page-title">
      <div>
        <p className="eyebrow"><Layers3 size={14} /> {copy[0]}</p>
        <h1 id="product-page-title">{copy[1]}</h1>
        <p className="subtitle">{copy[2]}</p>
      </div>
      <div className="product-page-boundary">
        <ShieldCheck size={18} />
        <div>
          <strong>{copy[3]}</strong>
          <span>Truth before prediction</span>
        </div>
      </div>
    </section>
  )
}
