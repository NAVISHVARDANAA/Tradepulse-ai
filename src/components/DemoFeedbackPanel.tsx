import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'

import {
  buildDemoFeedbackExport,
  buildDemoFeedbackSummary,
  clearDemoFeedbackSession,
  DEMO_JOURNEY_EVENT,
  DEMO_JOURNEY_ROUTES,
  emptyDemoFeedback,
  getDemoJourneySnapshot,
  saveDemoFeedback,
  type DemoFeedbackDraft,
  type DemoJourneySnapshot,
} from '../lib/demoFeedback'
import '../demo-feedback.css'

const roleOptions = [
  ['investor', 'Investor or active market learner'],
  ['analyst', 'Analyst or research professional'],
  ['operator', 'Operations, data or risk professional'],
  ['product-buyer', 'Product buyer or business leader'],
  ['other', 'Another audience segment'],
] as const

const usefulOptions = [
  'Market context',
  'Evidence lineage',
  'Stock research',
  'Forecast reliability',
]

const confusionOptions = [
  'Nothing was unclear',
  'Data freshness labels',
  'Model confidence',
  'Source lineage',
  'Product boundaries',
]

const nextActionOptions = [
  'Share with a colleague',
  'Join a controlled pilot',
  'Review more research',
  'Need more proof first',
  'Not relevant today',
]

function Rating({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <fieldset className="demo-feedback-rating">
      <legend>{label}</legend>
      <div>
        {[1, 2, 3, 4, 5].map((score) => (
          <label key={score}>
            <input
              type="radio"
              name={label}
              checked={value === score}
              onChange={() => onChange(score)}
            />
            <span>{score}</span>
          </label>
        ))}
      </div>
      <small>1 = low · 5 = high</small>
    </fieldset>
  )
}

export function DemoFeedbackPanel() {
  const [snapshot, setSnapshot] = useState<DemoJourneySnapshot>(() => getDemoJourneySnapshot())
  const [feedback, setFeedback] = useState<DemoFeedbackDraft>(() => snapshot.feedback ?? emptyDemoFeedback)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const follow = (event: Event) => {
      const next = (event as CustomEvent<DemoJourneySnapshot>).detail
      setSnapshot(next)
      if (next.feedback) setFeedback(next.feedback)
    }
    window.addEventListener(DEMO_JOURNEY_EVENT, follow)
    return () => window.removeEventListener(DEMO_JOURNEY_EVENT, follow)
  }, [])

  const complete = snapshot.visitedRoutes.length
  const canSave = Boolean(
    feedback.audienceRole && feedback.clarityScore && feedback.trustScore &&
    feedback.valueScore && feedback.mostUseful && feedback.expectedNextAction,
  )
  const summary = useMemo(() => buildDemoFeedbackSummary(snapshot), [snapshot])

  const update = <K extends keyof DemoFeedbackDraft>(key: K, value: DemoFeedbackDraft[K]) => {
    setFeedback((current) => ({ ...current, [key]: value }))
    setNotice(null)
  }

  const save = () => {
    const next = saveDemoFeedback(feedback)
    setSnapshot(next)
    setNotice('Feedback saved only in this browser session. Nothing was submitted.')
  }

  const copySummary = async () => {
    await navigator.clipboard.writeText(buildDemoFeedbackSummary(snapshot))
    setNotice('Facilitator summary copied. Review it before sharing.')
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(buildDemoFeedbackExport(snapshot), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tradepulse-demo-feedback.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Local feedback file prepared. Review it before sharing.')
  }

  const reset = () => {
    setSnapshot(clearDemoFeedbackSession())
    setFeedback(emptyDemoFeedback)
    setNotice('The local demo journey and feedback were cleared.')
  }

  return (
    <section id="demo-feedback" className="demo-feedback product-workspace" aria-labelledby="demo-feedback-title">
      <div className="demo-feedback-summary">
        <div>
          <span className="demo-feedback-status"><ClipboardCheck size={15} /> Phase 9B audience learning</span>
          <h2 id="demo-feedback-title">Turn a live demo into evidence.</h2>
          <p>
            Capture a structured debrief without asking for a name, email, phone number,
            financial account or brokerage detail. Nothing is transmitted automatically.
          </p>
        </div>
        <div className="demo-feedback-progress" aria-label={`${complete} of ${DEMO_JOURNEY_ROUTES.length} demo stops completed`}>
          <strong>{complete}/{DEMO_JOURNEY_ROUTES.length}</strong>
          <span>guided stops visited</span>
          <progress max={DEMO_JOURNEY_ROUTES.length} value={complete} />
        </div>
      </div>

      <div className="demo-feedback-boundary" role="note">
        <ShieldCheck size={19} />
        <div>
          <strong>Local-only facilitator evidence</strong>
          <span>Stored in session storage until the tab session ends or you clear it. Export is manual and user controlled.</span>
        </div>
      </div>

      <form className="demo-feedback-form" onSubmit={(event) => { event.preventDefault(); save() }}>
        <label>
          <span>Audience perspective</span>
          <select value={feedback.audienceRole} onChange={(event) => update('audienceRole', event.target.value as DemoFeedbackDraft['audienceRole'])}>
            <option value="">Select one</option>
            {roleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <div className="demo-feedback-ratings">
          <Rating label="Clarity rating" value={feedback.clarityScore} onChange={(value) => update('clarityScore', value)} />
          <Rating label="Trust rating" value={feedback.trustScore} onChange={(value) => update('trustScore', value)} />
          <Rating label="Value rating" value={feedback.valueScore} onChange={(value) => update('valueScore', value)} />
        </div>

        <div className="demo-feedback-selects">
          <label>
            <span>Most useful part</span>
            <select value={feedback.mostUseful} onChange={(event) => update('mostUseful', event.target.value)}>
              <option value="">Select one</option>
              {usefulOptions.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Biggest confusion</span>
            <select value={feedback.confusionArea} onChange={(event) => update('confusionArea', event.target.value)}>
              <option value="">Select one</option>
              {confusionOptions.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Expected next action</span>
            <select value={feedback.expectedNextAction} onChange={(event) => update('expectedNextAction', event.target.value)}>
              <option value="">Select one</option>
              {nextActionOptions.map((value) => <option key={value}>{value}</option>)}
            </select>
          </label>
          <label>
            <span>Would use weekly</span>
            <select value={feedback.weeklyUse} onChange={(event) => update('weeklyUse', event.target.value as DemoFeedbackDraft['weeklyUse'])}>
              <option value="">Optional</option>
              <option value="yes">Yes</option>
              <option value="maybe">Maybe</option>
              <option value="no">No</option>
            </select>
          </label>
        </div>

        <label className="demo-feedback-observation">
          <span>Facilitator observation <small>Optional · do not enter names or contact details</small></span>
          <textarea
            rows={4}
            maxLength={500}
            value={feedback.facilitatorObservation}
            onChange={(event) => update('facilitatorObservation', event.target.value)}
            placeholder="Record an observed hesitation, question or moment of value—not participant identity."
          />
        </label>

        <div className="demo-feedback-actions">
          <button className="primary-button" type="submit" disabled={!canSave}>
            <CheckCircle2 size={16} /> Save local debrief
          </button>
          <button className="secondary-button" type="button" disabled={!snapshot.feedback} onClick={() => void copySummary()}>
            <Copy size={16} /> Copy summary
          </button>
          <button className="secondary-button" type="button" disabled={!snapshot.feedback} onClick={download}>
            <Download size={16} /> Download JSON
          </button>
          <button className="secondary-button" type="button" onClick={reset}>
            <RotateCcw size={16} /> Clear session
          </button>
        </div>
        {notice ? <p className="demo-feedback-notice" role="status">{notice}</p> : null}
      </form>

      <div className="demo-feedback-export">
        <div>
          <p className="eyebrow">Facilitator preview</p>
          <h3>Review before sharing</h3>
        </div>
        <pre>{summary}</pre>
        <p><LockKeyhole size={14} /> No API call, account creation, invitation, analytics tracker or operational approval is triggered here.</p>
      </div>
    </section>
  )
}
