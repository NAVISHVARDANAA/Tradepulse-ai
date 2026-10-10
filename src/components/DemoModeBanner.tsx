import { useEffect, useState } from 'react'

import {
  DEMO_JOURNEY_EVENT,
  DEMO_JOURNEY_ROUTES,
  getDemoJourneySnapshot,
  type DemoJourneySnapshot,
} from '../lib/demoFeedback'
import '../demo-mode.css'

export function DemoModeBanner({ onExit }: { onExit: () => void }) {
  const [journey, setJourney] = useState<DemoJourneySnapshot>(() => getDemoJourneySnapshot())

  useEffect(() => {
    const follow = (event: Event) => {
      setJourney((event as CustomEvent<DemoJourneySnapshot>).detail)
    }
    window.addEventListener(DEMO_JOURNEY_EVENT, follow)
    return () => window.removeEventListener(DEMO_JOURNEY_EVENT, follow)
  }, [])

  return (
    <aside className="demo-mode-banner" aria-label="Demo data is active">
      <div>
        <strong>Demo mode</strong>
        <span>Curated sample and reference data · no live prices · no real transactions</span>
        <span className="demo-mode-progress">{journey.visitedRoutes.length}/{DEMO_JOURNEY_ROUTES.length} guided stops</span>
      </div>
      <div>
        <a href="#live-demo">Demo guide</a>
        <a href="#demo-feedback">Audience debrief</a>
        <button type="button" onClick={onExit}>Exit demo</button>
      </div>
    </aside>
  )
}
