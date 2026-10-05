import '../demo-mode.css'

export function DemoModeBanner({ onExit }: { onExit: () => void }) {
  return (
    <aside className="demo-mode-banner" aria-label="Demo data is active">
      <div>
        <strong>Demo mode</strong>
        <span>Curated sample and reference data · no live prices · no real transactions</span>
      </div>
      <div>
        <a href="#live-demo">Demo guide</a>
        <button type="button" onClick={onExit}>Exit demo</button>
      </div>
    </aside>
  )
}
