import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  FlaskConical,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  Users,
} from 'lucide-react'

import '../live-demo.css'

type LiveDemoPanelProps = {
  demoMode: boolean
  onStartDemo: () => void
  onExitDemo: () => void
}

const demoStops = [
  {
    step: '01',
    title: 'Frame the market',
    description: 'Explore curated market and cross-border trade observations with source and timestamp context.',
    href: '#markets',
    label: 'Open markets',
    Icon: LineChart,
  },
  {
    step: '02',
    title: 'Interrogate the evidence',
    description: 'Slice governed market, forecast, equity and trade measures, then drill through to their lineage.',
    href: '#analytics-studio',
    label: 'Open Analytics Studio',
    Icon: BarChart3,
  },
  {
    step: '03',
    title: 'Compare research',
    description: 'Filter a curated equity universe and inspect transparent scores, uncertainty, reasons and risk flags.',
    href: '#stock-research',
    label: 'Open stock research',
    Icon: BrainCircuit,
  },
  {
    step: '04',
    title: 'Challenge the forecast',
    description: 'Review intervals, baseline lift and reliability evidence without turning a model output into advice.',
    href: '#forecasts',
    label: 'Open forecasts',
    Icon: FlaskConical,
  },
]

export function LiveDemoPanel({
  demoMode,
  onStartDemo,
  onExitDemo,
}: LiveDemoPanelProps) {
  return (
    <section id="live-demo" className="live-demo product-workspace" aria-labelledby="live-demo-title">
      <div className="live-demo-hero">
        <div className="live-demo-copy">
          <span className="live-demo-status"><CheckCircle2 size={15} /> Phase 9A demo-ready workspace</span>
          <h2 id="live-demo-title">Show the product value in ten minutes.</h2>
          <p>
            Use a deterministic demonstration dataset to tell one clear story:
            observe markets, investigate evidence, compare research and challenge
            a forecast. Nothing in this mode is live market data or financial advice.
          </p>
          <div className="live-demo-actions">
            <button className="primary-button" type="button" onClick={onStartDemo}>
              {demoMode ? 'Restart guided demo' : 'Start guided demo'} <ArrowRight size={15} />
            </button>
            {demoMode ? (
              <button className="secondary-button" type="button" onClick={onExitDemo}>
                Exit demo mode
              </button>
            ) : null}
          </div>
          <div className="live-demo-trust-row" aria-label="Demo safeguards">
            <span><ShieldCheck size={14} /> Clearly labelled sample data</span>
            <span><LockKeyhole size={14} /> No orders, payments or real funds</span>
            <span><Users size={14} /> Designed for audience feedback</span>
          </div>
        </div>

        <aside className="live-demo-brief" aria-label="Presenter brief">
          <span>Presenter brief</span>
          <strong>Lead with the decision, not the feature list.</strong>
          <ol>
            <li>What changed?</li>
            <li>What evidence supports it?</li>
            <li>What is uncertain or missing?</li>
            <li>What safe next action follows?</li>
          </ol>
          <p>Recommended audience: 5–8 investors, analysts, operators or product buyers.</p>
        </aside>
      </div>

      <div className="live-demo-disclosure" role="note">
        <ShieldCheck size={18} />
        <div>
          <strong>Curated demo data—not a live feed</strong>
          <span>
            Values are stable reference scenarios dated 30 September 2026 so every demonstration is reproducible.
            Licensed real-time feeds remain gated until commercial rights, entitlements and canary evidence are approved.
          </span>
        </div>
      </div>

      <div className="live-demo-grid">
        {demoStops.map(({ step, title, description, href, label, Icon }) => (
          <article key={href} className="live-demo-stop">
            <div className="live-demo-stop-head">
              <Icon size={19} />
              <span>{step}</span>
            </div>
            <h3>{title}</h3>
            <p>{description}</p>
            <a href={href} onClick={() => { if (!demoMode) onStartDemo() }}>
              {label} <ArrowRight size={14} />
            </a>
          </article>
        ))}
      </div>

      <div className="live-demo-boundaries">
        <div>
          <p className="eyebrow">What is ready now</p>
          <h3>Audience-safe discovery</h3>
          <ul>
            <li>Public guided showcase with deterministic sample data</li>
            <li>Interactive analytics, market, research and forecast views</li>
            <li>Visible evidence, uncertainty and source labels</li>
            <li>Feedback and support paths for invited participants</li>
          </ul>
        </div>
        <div>
          <p className="eyebrow">What stays intentionally gated</p>
          <h3>Regulated and commercial activation</h3>
          <ul>
            <li>Live or redistributed provider feeds</li>
            <li>Public account provisioning and checkout</li>
            <li>Broker routing, custody and real-money orders</li>
            <li>Payment execution and funds movement</li>
          </ul>
          <a href="#audience-pilot-plan">Review the controlled audience plan <ArrowRight size={14} /></a>
        </div>
      </div>
    </section>
  )
}
