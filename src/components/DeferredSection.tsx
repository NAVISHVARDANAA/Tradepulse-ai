import { useEffect, useRef, useState, type ReactNode } from 'react'

type DeferredSectionProps = {
  id?: string
  label: string
  children: ReactNode
  onVisible?: () => void
  minimumHeight?: number
}

export function DeferredSection({
  id,
  label,
  children,
  onVisible,
  minimumHeight = 240,
}: DeferredSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const notifiedRef = useRef(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    if (!('IntersectionObserver' in window)) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: '900px 0px' },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || notifiedRef.current) return
    notifiedRef.current = true
    onVisible?.()
  }, [onVisible, visible])

  return (
    <div
      id={id}
      ref={containerRef}
      className="deferred-section"
      aria-busy={!visible}
      style={{ minHeight: visible ? undefined : minimumHeight }}
    >
      {visible ? children : (
        <div className="deferred-section-placeholder" role="status">
          <span className="deferred-section-pulse" />
          <strong>{label}</strong>
          <small>Loads as you approach this section</small>
        </div>
      )}
    </div>
  )
}
