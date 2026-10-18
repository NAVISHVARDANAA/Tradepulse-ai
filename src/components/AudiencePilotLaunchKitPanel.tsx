import { useMemo, useState } from 'react'
import {
  Ban,
  CheckCircle2,
  CircleAlert,
  ClipboardCopy,
  Download,
  FileInput,
  LineChart,
  LockKeyhole,
  Megaphone,
  MessageSquareText,
  RotateCcw,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react'

import {
  buildPilotInterviewText,
  buildPilotLaunchExport,
  buildPilotLaunchKit,
  MAX_PILOT_DECISION_FILE_BYTES,
  parsePilotDecisionExport,
  type PilotDecisionEvidence,
} from '../lib/audiencePilotLaunchKit'
import '../audience-pilot-launch-kit.css'

export function AudiencePilotLaunchKitPanel() {
  const [evidence, setEvidence] = useState<PilotDecisionEvidence | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const kit = useMemo(() => evidence ? buildPilotLaunchKit(evidence) : null, [evidence])

  const importFile = async (file: File | undefined) => {
    if (!file) return
    try {
      if (file.size > MAX_PILOT_DECISION_FILE_BYTES) throw new Error('File exceeds the 96 KB local-import limit.')
      const parsed = parsePilotDecisionExport(JSON.parse(await file.text()))
      setEvidence(parsed)
      setError(null)
      setNotice('Decision draft reviewed locally. It was not uploaded, retained or used to contact anyone.')
    } catch (reason) {
      setEvidence(null)
      setNotice(null)
      setError(reason instanceof Error ? reason.message : 'The pilot decision draft is invalid.')
    }
  }

  const copyOutreach = async () => {
    if (!kit) return
    await navigator.clipboard.writeText(kit.outreachDraft)
    setNotice('Outreach wording copied as an unsigned draft. No message was sent.')
  }

  const copyInterviewGuide = async () => {
    if (!evidence) return
    await navigator.clipboard.writeText(buildPilotInterviewText(evidence))
    setNotice('Interview guide copied. Keep participant notes outside TradePulse and aggregate them before import.')
  }

  const downloadKit = () => {
    if (!evidence) return
    const blob = new Blob([JSON.stringify(buildPilotLaunchExport(evidence), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tradepulse-audience-pilot-launch-kit-draft.json'
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Aggregate-only Phase 9E draft downloaded. It contains no participant identity or contact data.')
  }

  const clear = () => {
    setEvidence(null)
    setError(null)
    setNotice('The imported decision draft was cleared from page memory.')
  }

  return (
    <section id="audience-pilot-launch-kit" className="audience-pilot-launch-kit product-workspace" aria-labelledby="pilot-launch-title">
      <div className="pilot-launch-hero">
        <div>
          <span className="pilot-launch-status"><Megaphone size={15} /> Phase 9E audience and marketing readiness</span>
          <h2 id="pilot-launch-title">Prepare the first real-audience research wave.</h2>
          <p>
            Convert one Phase 9D decision draft into target cohorts, neutral interview questions,
            a founder-led marketing plan and measurable pilot checkpoints.
          </p>
        </div>
        <div className="pilot-launch-badge"><ShieldCheck size={22} /><strong>Preparation only</strong><span>no outreach authority</span></div>
      </div>

      <div className="pilot-launch-boundary" role="note">
        <LockKeyhole size={20} />
        <div><strong>Local, aggregate and fail-closed</strong><span>The decision file stays in page memory. Identity, contact data, inconsistent evidence and changed pilot limits are rejected.</span></div>
      </div>

      <section className="pilot-launch-import" aria-labelledby="pilot-launch-import-title">
        <div><p className="eyebrow">Source decision</p><h3 id="pilot-launch-import-title">Import one Phase 9D draft</h3><p>The kit adapts to the evidence state and tells you whether outreach must remain on hold.</p></div>
        <div className="pilot-launch-actions">
          <label className="primary-button pilot-launch-file-button" htmlFor="pilot-launch-file"><FileInput size={16} /> Import Phase 9D decision</label>
          <input id="pilot-launch-file" type="file" accept="application/json,.json" onChange={(event) => { void importFile(event.currentTarget.files?.[0]); event.currentTarget.value = '' }} />
          <button className="secondary-button" type="button" disabled={!evidence} onClick={() => void copyInterviewGuide()}><ClipboardCopy size={16} /> Copy interview guide</button>
          <button className="secondary-button" type="button" disabled={!kit} onClick={() => void copyOutreach()}><MessageSquareText size={16} /> Copy outreach draft</button>
          <button className="secondary-button" type="button" disabled={!evidence} onClick={downloadKit}><Download size={16} /> Download launch kit</button>
          <button className="secondary-button" type="button" disabled={!evidence} onClick={clear}><RotateCcw size={16} /> Clear decision</button>
        </div>
        {notice ? <p className="pilot-launch-notice" role="status">{notice}</p> : null}
        {error ? <p className="pilot-launch-error" role="alert"><CircleAlert size={17} /> {error}</p> : null}
      </section>

      {evidence && kit ? (
        <>
          <section className={`pilot-launch-readiness ${kit.readiness}`} aria-live="polite">
            <div><p className="eyebrow">Outreach gate</p><h3>{kit.readinessLabel}</h3><p>{kit.readinessReason}</p></div>
            <div><UsersRound size={20} /><strong>{evidence.sessionCount}</strong><span>aggregate discovery sessions</span></div>
          </section>

          <section className="pilot-launch-positioning" aria-labelledby="positioning-title">
            <div><p className="eyebrow">Market position</p><h3 id="positioning-title">A clear promise without investment hype</h3></div>
            <article><span>Headline</span><strong>{kit.positioning.headline}</strong></article>
            <article><span>Promise</span><strong>{kit.positioning.promise}</strong></article>
            <article><span>Proof</span><strong>{kit.positioning.proof}</strong></article>
            <article className="boundary"><span>Never promise</span><strong>{kit.positioning.boundary}</strong></article>
          </section>

          <section className="pilot-launch-section" aria-labelledby="cohort-title">
            <div className="pilot-launch-heading"><div><Target size={19} /><div><p className="eyebrow">Who to ask</p><h3 id="cohort-title">Five balanced audience cohorts</h3></div></div><small>6 people each · 30 maximum</small></div>
            <div className="pilot-launch-cohorts">
              {kit.cohorts.map((cohort) => <article key={cohort.key}><span>{cohort.participantTarget}</span><div><strong>{cohort.label}</strong><p>{cohort.learningGoal}</p><small>{cohort.recruitmentRoute}</small></div></article>)}
            </div>
          </section>

          <section className="pilot-launch-section" aria-labelledby="questions-title">
            <div className="pilot-launch-heading"><div><MessageSquareText size={19} /><div><p className="eyebrow">What to ask</p><h3 id="questions-title">Eleven neutral research questions</h3></div></div><small>20–25 minutes</small></div>
            <ol className="pilot-launch-questions">
              {kit.interviewGuide.map((item) => <li key={item.sequence}><span>{item.sequence}</span><div><em>{item.stage}</em><strong>{item.question}</strong><small>{item.facilitatorNote}</small></div></li>)}
            </ol>
          </section>

          <div className="pilot-launch-columns">
            <section className="pilot-launch-section" aria-labelledby="channels-title">
              <div className="pilot-launch-heading"><div><Megaphone size={19} /><div><p className="eyebrow">How to reach them</p><h3 id="channels-title">Founder-led channel mix</h3></div></div></div>
              <div className="pilot-launch-channel-list">{kit.channels.map((channel) => <article key={channel.priority}><span>{channel.priority}</span><div><strong>{channel.channel} · {channel.participantTarget}</strong><p>{channel.method}</p><small>{channel.guardrail}</small></div></article>)}</div>
            </section>
            <section className="pilot-launch-section" aria-labelledby="scorecard-title">
              <div className="pilot-launch-heading"><div><LineChart size={19} /><div><p className="eyebrow">How to decide</p><h3 id="scorecard-title">Pilot scorecard</h3></div></div></div>
              <div className="pilot-launch-scorecard">{kit.scorecard.map((item) => <article key={item.metric}><strong>{item.metric}</strong><span>{item.target}</span><small>Stop: {item.stopSignal}</small></article>)}</div>
            </section>
          </div>

          <section className="pilot-launch-section" aria-labelledby="weekly-plan-title">
            <div className="pilot-launch-heading"><div><CheckCircle2 size={19} /><div><p className="eyebrow">Four-week operating rhythm</p><h3 id="weekly-plan-title">Approve, learn, iterate and decide</h3></div></div></div>
            <div className="pilot-launch-weeks">{kit.weeklyPlan.map((item) => <article key={item.week}><span>Week {item.week}</span><strong>{item.focus}</strong><p>{item.output}</p></article>)}</div>
          </section>

          <section className="pilot-launch-draft" aria-labelledby="outreach-draft-title">
            <div><p className="eyebrow">Reviewable copy</p><h3 id="outreach-draft-title">First outreach message</h3></div>
            <p>{kit.outreachDraft}</p>
            <small><Ban size={14} /> Copy only. TradePulse cannot send, track or record this message.</small>
          </section>
        </>
      ) : (
        <div className="pilot-launch-empty"><Megaphone size={27} /><strong>No decision draft loaded</strong><span>Export an unsigned Phase 9D decision brief, then review the audience and marketing plan here.</span></div>
      )}

      <p className="pilot-launch-lock"><LockKeyhole size={15} /> No invitation, message, signup, contact collection, analytics, payment, live feed, personalised advice or financial execution is enabled.</p>
    </section>
  )
}
