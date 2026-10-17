import { useMemo, useState } from 'react'
import {
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Copy,
  Download,
  FileInput,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

import {
  buildPilotDecisionBrief,
  buildPilotDecisionExport,
  buildPilotDecisionText,
  MAX_AUDIENCE_INSIGHT_FILE_BYTES,
  parseAudienceInsightExport,
  type AudienceInsightEvidence,
} from '../lib/audiencePilotDecision'
import '../audience-pilot-decision.css'

const reviewRequirements = [
  'Accountable product owner',
  'Participant consent and privacy review',
  'Support and incident owner',
  'Privacy-safe measurement approval',
  'Cost ceiling approval',
  'Rollback owner',
  'Documented go or no-go decision',
]

export function AudiencePilotDecisionPanel() {
  const [evidence, setEvidence] = useState<AudienceInsightEvidence | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const brief = useMemo(() => evidence ? buildPilotDecisionBrief(evidence) : null, [evidence])

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > MAX_AUDIENCE_INSIGHT_FILE_BYTES) {
        throw new Error('File exceeds the 96 KB local-import limit.')
      }
      const parsed = parseAudienceInsightExport(JSON.parse(await file.text()))
      setEvidence(parsed)
      setError(null)
      setNotice('Aggregate evidence reviewed locally. The file was not uploaded or retained.')
    } catch (reason) {
      setEvidence(null)
      setNotice(null)
      setError(reason instanceof Error ? reason.message : 'The aggregate decision evidence is invalid.')
    }
  }

  const copyBrief = async () => {
    if (!evidence) return
    await navigator.clipboard.writeText(buildPilotDecisionText(evidence))
    setNotice('Draft decision brief copied. It remains unsigned and non-authorizing.')
  }

  const downloadBrief = () => {
    if (!evidence) return
    const blob = new Blob([JSON.stringify(buildPilotDecisionExport(evidence), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tradepulse-audience-pilot-decision-draft.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Aggregate-only draft prepared. It contains no participant identity, contact details or raw notes.')
  }

  const clear = () => {
    setEvidence(null)
    setError(null)
    setNotice('The imported aggregate was cleared from page memory.')
  }

  return (
    <section id="audience-pilot-decision" className="audience-pilot-decision product-workspace" aria-labelledby="audience-pilot-decision-title">
      <div className="pilot-decision-hero">
        <div>
          <span className="pilot-decision-status"><ClipboardCheck size={15} /> Phase 9D decision governance</span>
          <h2 id="audience-pilot-decision-title">Turn aggregate evidence into a bounded pilot brief.</h2>
          <p>
            Review one privacy-safe Phase 9C aggregate, reconcile its decision signal and
            produce an experiment backlog for an accountable human go or no-go review.
          </p>
        </div>
        <div className="pilot-decision-badge">
          <ShieldCheck size={22} />
          <strong>Draft only</strong>
          <span>not authorization</span>
        </div>
      </div>

      <div className="pilot-decision-boundary" role="note">
        <LockKeyhole size={20} />
        <div>
          <strong>Local review with fail-closed evidence checks</strong>
          <span>The aggregate stays in page memory. Identity fields, contact details, raw text, inconsistent gates and activation authority are rejected.</span>
        </div>
      </div>

      <section className="pilot-decision-import" aria-labelledby="pilot-decision-import-title">
        <div>
          <p className="eyebrow">Decision evidence</p>
          <h3 id="pilot-decision-import-title">Import one Phase 9C aggregate</h3>
          <p>Only a reconciled, aggregate-only schema-version 1 export is accepted.</p>
        </div>
        <div className="pilot-decision-actions">
          <label className="primary-button pilot-decision-file-button" htmlFor="pilot-decision-file">
            <FileInput size={16} /> Import Phase 9C aggregate
          </label>
          <input
            id="pilot-decision-file"
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              void importFile(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
          <button className="secondary-button" type="button" disabled={!evidence} onClick={() => void copyBrief()}>
            <Copy size={16} /> Copy decision brief
          </button>
          <button className="secondary-button" type="button" disabled={!evidence} onClick={downloadBrief}>
            <Download size={16} /> Download draft brief
          </button>
          <button className="secondary-button" type="button" disabled={!evidence} onClick={clear}>
            <RotateCcw size={16} /> Clear aggregate
          </button>
        </div>
        {notice ? <p className="pilot-decision-notice" role="status">{notice}</p> : null}
        {error ? <p className="pilot-decision-error" role="alert"><CircleAlert size={17} /> {error}</p> : null}
      </section>

      {evidence && brief ? (
        <>
          <section className={`pilot-decision-recommendation ${brief.recommendation}`} aria-live="polite">
            <div>
              <p className="eyebrow">Decision recommendation</p>
              <h3>{brief.recommendationLabel}</h3>
              <p>{brief.recommendationReason}</p>
            </div>
            <div className="pilot-decision-score" aria-label={`${evidence.sessionCount} aggregate audience sessions reviewed`}>
              <UsersRound size={20} />
              <strong>{evidence.sessionCount}</strong>
              <span>aggregate sessions</span>
            </div>
          </section>

          <section className="pilot-decision-signals" aria-label="Audience decision signals">
            {[
              ['Top perspective', brief.topSignals.audiencePerspective],
              ['Most useful', brief.topSignals.mostUseful],
              ['Biggest confusion', brief.topSignals.biggestConfusion],
              ['Expected next action', brief.topSignals.expectedNextAction],
            ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
          </section>

          <section className="pilot-decision-backlog" aria-labelledby="pilot-backlog-title">
            <div>
              <p className="eyebrow">Prioritized learning</p>
              <h3 id="pilot-backlog-title">Experiment backlog</h3>
            </div>
            <div>
              {brief.experimentBacklog.map((item) => (
                <article key={item.priority}>
                  <span>{item.priority}</span>
                  <div><strong>{item.title}</strong><p>{item.outcome}</p></div>
                </article>
              ))}
            </div>
          </section>

          <div className="pilot-decision-columns">
            <section aria-labelledby="pilot-envelope-title">
              <p className="eyebrow">Fixed envelope</p>
              <h3 id="pilot-envelope-title">Bounded research pilot</h3>
              <ul>
                <li>Maximum 30 participants</li>
                <li>Maximum four weeks</li>
                <li>Free of charge</li>
                <li>Reference, delayed or curated demo data only</li>
                <li>Real-time data is not required</li>
              </ul>
            </section>
            <section aria-labelledby="pilot-review-title">
              <p className="eyebrow">External evidence</p>
              <h3 id="pilot-review-title">Human review still required</h3>
              <ul>
                {reviewRequirements.map((requirement) => <li key={requirement}><CheckCircle2 size={15} /> {requirement}</li>)}
              </ul>
            </section>
          </div>
        </>
      ) : (
        <div className="pilot-decision-empty">
          <ClipboardCheck size={26} />
          <strong>No aggregate loaded</strong>
          <span>Export aggregate evidence from Audience insights, then review it here.</span>
        </div>
      )}

      <p className="pilot-decision-lock">
        <LockKeyhole size={15} /> This draft cannot send invitations, create accounts, approve a pilot, activate live data or trigger any financial action.
      </p>
    </section>
  )
}
