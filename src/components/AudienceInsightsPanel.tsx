import { useMemo, useState } from 'react'
import {
  BarChart3,
  CheckCircle2,
  CircleAlert,
  Copy,
  Download,
  FileInput,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'

import {
  buildAudienceInsightExport,
  buildAudienceInsightText,
  MAX_AUDIENCE_EVIDENCE_FILE_BYTES,
  MAX_AUDIENCE_EVIDENCE_FILES,
  parseAudienceFeedbackExport,
  synthesizeAudienceEvidence,
  type AudienceEvidence,
} from '../lib/audienceInsights'
import { buildDemoFeedbackExport, getDemoJourneySnapshot } from '../lib/demoFeedback'
import '../audience-insights.css'

function Distribution({ title, counts }: { title: string; counts: Record<string, number> }) {
  const entries = Object.entries(counts).sort((left, right) => right[1] - left[1])
  const maximum = Math.max(...entries.map(([, count]) => count), 1)

  return (
    <section className="audience-insight-distribution" aria-label={title}>
      <h3>{title}</h3>
      {entries.length ? entries.map(([label, count]) => (
        <div key={label}>
          <span>{label}</span>
          <div aria-hidden="true"><i style={{ width: `${(count / maximum) * 100}%` }} /></div>
          <strong>{count}</strong>
        </div>
      )) : <p>No evidence yet.</p>}
    </section>
  )
}

export function AudienceInsightsPanel() {
  const [evidence, setEvidence] = useState<AudienceEvidence[]>([])
  const [notice, setNotice] = useState<string | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const currentDebriefAvailable = Boolean(getDemoJourneySnapshot().feedback)
  const summary = useMemo(() => synthesizeAudienceEvidence(evidence), [evidence])

  const addEvidence = (records: AudienceEvidence[]) => {
    setEvidence((current) => {
      const known = new Set(current.map((item) => item.fingerprint))
      const unique = records.filter((item) => !known.has(item.fingerprint) && known.add(item.fingerprint))
      return [...current, ...unique].slice(0, MAX_AUDIENCE_EVIDENCE_FILES)
    })
  }

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const accepted: AudienceEvidence[] = []
    const rejected: string[] = []
    const remaining = MAX_AUDIENCE_EVIDENCE_FILES - evidence.length

    for (const file of Array.from(files).slice(0, Math.max(remaining, 0))) {
      try {
        if (file.size > MAX_AUDIENCE_EVIDENCE_FILE_BYTES) {
          throw new Error('File exceeds the 64 KB local-import limit.')
        }
        accepted.push(parseAudienceFeedbackExport(JSON.parse(await file.text())))
      } catch (error) {
        rejected.push(`${file.name}: ${error instanceof Error ? error.message : 'Invalid feedback export.'}`)
      }
    }
    if (files.length > remaining) rejected.push(`Only ${MAX_AUDIENCE_EVIDENCE_FILES} evidence files can be held in one local synthesis.`)
    addEvidence(accepted)
    setErrors(rejected)
    setNotice(accepted.length
      ? `${accepted.length} debrief${accepted.length === 1 ? '' : 's'} processed locally. Files were not uploaded or retained.`
      : null)
  }

  const addCurrentDebrief = () => {
    try {
      addEvidence([parseAudienceFeedbackExport(buildDemoFeedbackExport())])
      setErrors([])
      setNotice('Current session debrief added to this in-memory synthesis.')
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Current debrief could not be added.'])
      setNotice(null)
    }
  }

  const copyAggregate = async () => {
    await navigator.clipboard.writeText(buildAudienceInsightText(evidence))
    setNotice('Aggregate summary copied. Review it before sharing.')
  }

  const downloadAggregate = () => {
    const blob = new Blob([JSON.stringify(buildAudienceInsightExport(evidence), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tradepulse-audience-insights.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Aggregate-only research file prepared. It contains no raw notes or source files.')
  }

  const clear = () => {
    setEvidence([])
    setErrors([])
    setNotice('All imported evidence was cleared from this page memory.')
  }

  return (
    <section id="audience-insights" className="audience-insights product-workspace" aria-labelledby="audience-insights-title">
      <div className="audience-insights-hero">
        <div>
          <span className="audience-insights-status"><BarChart3 size={15} /> Phase 9C research synthesis</span>
          <h2 id="audience-insights-title">Turn debrief files into a research decision.</h2>
          <p>
            Combine privacy-safe Phase 9B exports, see patterns by audience segment and
            test explicit thresholds before deciding whether to collect, iterate, reframe or request a pilot review.
          </p>
        </div>
        <div className="audience-insights-count" aria-label={`${summary.sessionCount} audience sessions loaded`}>
          <UsersRound size={22} />
          <strong>{summary.sessionCount}</strong>
          <span>local sessions</span>
        </div>
      </div>

      <div className="audience-insights-boundary" role="note">
        <ShieldCheck size={20} />
        <div>
          <strong>On-device, aggregate-only analysis</strong>
          <span>Files are read in page memory, never uploaded or stored, and raw facilitator notes are excluded from every calculation and export.</span>
        </div>
      </div>

      <section className="audience-insights-import" aria-labelledby="audience-import-title">
        <div>
          <p className="eyebrow">Evidence intake</p>
          <h3 id="audience-import-title">Add up to {MAX_AUDIENCE_EVIDENCE_FILES} debriefs</h3>
          <p>Only Phase 9B schema-version 1 JSON exports pass. Files with identity or contact fields fail closed.</p>
        </div>
        <div className="audience-insights-actions">
          <label className="primary-button audience-insights-file-button" htmlFor="audience-insight-files">
            <FileInput size={16} /> Import Phase 9B JSON
          </label>
          <input
            id="audience-insight-files"
            type="file"
            accept="application/json,.json"
            multiple
            onChange={(event) => {
              void importFiles(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />
          <button className="secondary-button" type="button" disabled={!currentDebriefAvailable || evidence.length >= MAX_AUDIENCE_EVIDENCE_FILES} onClick={addCurrentDebrief}>
            <CheckCircle2 size={16} /> Add current debrief
          </button>
          <button className="secondary-button" type="button" disabled={!evidence.length} onClick={() => void copyAggregate()}>
            <Copy size={16} /> Copy aggregate
          </button>
          <button className="secondary-button" type="button" disabled={!evidence.length} onClick={downloadAggregate}>
            <Download size={16} /> Download aggregate JSON
          </button>
          <button className="secondary-button" type="button" disabled={!evidence.length} onClick={clear}>
            <RotateCcw size={16} /> Clear evidence
          </button>
        </div>
        {notice ? <p className="audience-insights-notice" role="status">{notice}</p> : null}
        {errors.length ? (
          <div className="audience-insights-errors" role="alert">
            <CircleAlert size={18} />
            <div><strong>Some evidence was rejected</strong>{errors.map((error) => <span key={error}>{error}</span>)}</div>
          </div>
        ) : null}
      </section>

      <div className="audience-insight-metrics" aria-label="Audience evidence scorecard">
        {[
          ['Clarity', `${summary.averageClarity}/5`],
          ['Trust', `${summary.averageTrust}/5`],
          ['Perceived value', `${summary.averageValue}/5`],
          ['Full journey', `${summary.fullJourneyPercent}%`],
          ['Weekly interest', `${summary.weeklyInterestPercent}%`],
        ].map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>

      <section className={`audience-insight-decision ${summary.decision}`} aria-live="polite">
        <div>
          <p className="eyebrow">Research decision signal</p>
          <h3>{summary.decisionLabel}</h3>
          <p>{summary.decisionReason}</p>
        </div>
        <div className="audience-insight-gates">
          {summary.gates.map((gate) => (
            <article className={gate.met ? 'met' : 'unmet'} key={gate.label}>
              {gate.met ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}
              <div><strong>{gate.label}</strong><span>{gate.value} · target {gate.target}</span></div>
            </article>
          ))}
        </div>
      </section>

      <div className="audience-insight-distributions">
        <Distribution title="Audience perspectives" counts={summary.roleCounts} />
        <Distribution title="Most useful" counts={summary.usefulCounts} />
        <Distribution title="Biggest confusion" counts={summary.confusionCounts} />
        <Distribution title="Expected next action" counts={summary.nextActionCounts} />
      </div>

      <p className="audience-insights-lock">
        <LockKeyhole size={15} /> This research signal cannot invite participants, approve a pilot, activate live data, create an account or trigger any financial action.
      </p>
    </section>
  )
}
