import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  GraduationCap,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { saveCustomerOnboarding } from '../lib/queries/customerExperience'

const TOUR_KEY = 'tradepulse-product-tour-v3'

const steps = [
  {
    selector: '#stock-research',
    eyebrow: 'Step 1 · Research',
    title: 'Start with verified stock evidence',
    body: 'Search covered securities, then check the source, timestamp, forecast uncertainty, component scores and risk flags.',
  },
  {
    selector: '#research-copilot',
    eyebrow: 'Step 2 · Routine',
    title: 'Build a private research routine',
    body: 'Create a focused watchlist, evidence-linked alerts and a daily brief. Alerts prompt review; they are not trade instructions.',
  },
  {
    selector: '#academy',
    eyebrow: 'Step 3 · Learn',
    title: 'Use TradePulse Academy anytime',
    body: 'Take short courses and knowledge checks. Contextual “Learn this” links bring you directly to the relevant lesson.',
  },
  {
    selector: '#paper-investing',
    eyebrow: 'Step 4 · Practise',
    title: 'Journal and test each decision',
    body: 'Record your thesis, conviction and horizon. TradePulse preserves the point-in-time forecast context and later scores the simulated outcome; nothing can reach a live broker.',
  },
  {
    selector: '#risk-command-center',
    eyebrow: 'Step 5 · Protect',
    title: 'Measure risk before return',
    body: 'Review concentration, drawdown, exposure, scenarios, reconciliation and the paper-trading kill switch.',
  },
  {
    selector: '#brokerage-readiness',
    eyebrow: 'Step 6 · Prepare',
    title: 'See the regulated-trading launch gates',
    body: 'Review jurisdiction, identity, suitability, broker and disclosure requirements through order previews that cannot create a live trade.',
  },
]

export function GuidedOnboarding() {
  const [mode, setMode] = useState<'welcome' | 'tour' | null>(null)
  const [step, setStep] = useState(0)
  const launcherRef = useRef<HTMLButtonElement>(null)
  const welcomeRef = useRef<HTMLElement>(null)
  const tourRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const authenticationReturn =
      window.location.hash === '#paper-investing' ||
      window.location.hash === '#account-security'

    if (!authenticationReturn && !localStorage.getItem(TOUR_KEY)) {
      setMode('welcome')
    }
  }, [])

  useEffect(() => {
    if (mode !== 'tour') return
    document.querySelector(steps[step].selector)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
    void saveCustomerOnboarding(step, 'in_progress')
    tourRef.current?.focus()
  }, [mode, step])

  useEffect(() => {
    if (mode !== 'welcome') return
    welcomeRef.current?.focus()
  }, [mode])

  const close = useCallback(() => {
    setMode(null)
    requestAnimationFrame(() => launcherRef.current?.focus())
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mode) close()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [close, mode])

  const start = () => {
    setStep(0)
    setMode('tour')
  }

  const skip = () => {
    localStorage.setItem(TOUR_KEY, 'skipped')
    close()
    void saveCustomerOnboarding(step, 'skipped')
  }

  const complete = () => {
    localStorage.setItem(TOUR_KEY, 'completed')
    setMode(null)
    void saveCustomerOnboarding(steps.length, 'completed')
    requestAnimationFrame(() => {
      document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' })
      document.getElementById('main-content')?.focus()
    })
  }

  return (
    <>
      <button ref={launcherRef} className="tour-launcher" type="button" onClick={() => setMode('welcome')}>
        <Compass size={16} /> Guide
      </button>

      {mode === 'welcome' ? (
        <div className="tour-overlay" role="presentation">
          <section
            ref={welcomeRef}
            className="tour-welcome"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-welcome-title"
            aria-describedby="tour-welcome-description"
            tabIndex={-1}
            onKeyDown={(event) => {
              if (event.key !== 'Tab') return
              const controls = welcomeRef.current?.querySelectorAll<HTMLElement>(
                'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
              )
              if (!controls?.length) return
              const first = controls[0]
              const last = controls[controls.length - 1]
              if (event.shiftKey && (document.activeElement === first || document.activeElement === welcomeRef.current)) {
                event.preventDefault()
                last.focus()
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
              }
            }}
          >
            <button className="tour-close" type="button" aria-label="Close guide" onClick={close}>
              <X size={18} />
            </button>
            <div className="tour-welcome-icon"><GraduationCap size={28} /></div>
            <p className="eyebrow">Welcome to TradePulse AI</p>
            <h2 id="tour-welcome-title">Learn before you invest</h2>
            <p id="tour-welcome-description">
              Take a six-step product tour, then continue with free Academy
              lessons on forecasts, evidence, paper trading and risk.
            </p>
            <div className="tour-principles">
              <span><ShieldCheck size={14} /> Research is not advice</span>
              <span><BookOpen size={14} /> Essential learning is free</span>
            </div>
            <div className="tour-welcome-actions">
              <button className="primary-button" type="button" onClick={start}>
                Start guided tour <ChevronRight size={14} />
              </button>
              <button className="text-button" type="button" onClick={skip}>Explore on my own</button>
            </div>
          </section>
        </div>
      ) : null}

      {mode === 'tour' ? (
        <aside ref={tourRef} className="tour-step-card" role="dialog" aria-modal="false" aria-live="polite" aria-labelledby="tour-step-title" tabIndex={-1}>
          <div className="tour-step-head">
            <span>{steps[step].eyebrow}</span>
            <button type="button" aria-label="Close tour" onClick={close}><X size={16} /></button>
          </div>
          <h3 id="tour-step-title">{steps[step].title}</h3>
          <p>{steps[step].body}</p>
          <div className="tour-step-dots" aria-label={`Step ${step + 1} of ${steps.length}`}>
            {steps.map((item, index) => <span key={item.selector} className={index === step ? 'active' : ''} />)}
          </div>
          <div className="tour-step-actions">
            <button className="secondary-button" type="button" disabled={step === 0} onClick={() => setStep((current) => current - 1)}>
              <ChevronLeft size={14} /> Back
            </button>
            {step === steps.length - 1 ? (
              <button className="primary-button" type="button" onClick={complete}>
                Finish tour <ShieldCheck size={14} />
              </button>
            ) : (
              <button className="primary-button" type="button" onClick={() => setStep((current) => current + 1)}>
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </aside>
      ) : null}
    </>
  )
}
