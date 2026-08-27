import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

type NavItem = { label: string; href: `#${string}` }
type NavGroup = { label: string; items: NavItem[] }

export const productNavigation: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '#dashboard' },
      { label: 'System status', href: '#system-status' },
      { label: 'Data trust', href: '#data-trust' },
    ],
  },
  {
    label: 'Research',
    items: [
      { label: 'Stock research', href: '#stock-research' },
      { label: 'AI Copilot', href: '#research-copilot' },
      { label: 'Team research', href: '#business-research' },
      { label: 'Academy', href: '#academy' },
      { label: 'Markets', href: '#markets' },
      { label: 'Forecasts', href: '#forecasts' },
      { label: 'Trade data', href: '#trade-data' },
    ],
  },
  {
    label: 'Investing',
    items: [
      { label: 'Paper investing', href: '#paper-investing' },
      { label: 'Risk center', href: '#risk-command-center' },
      { label: 'Brokerage readiness', href: '#brokerage-readiness' },
      { label: 'Payments', href: '#payments' },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Workspace', href: '#business-workspace' },
      { label: 'Plans', href: '#plans' },
      { label: 'Support', href: '#customer-support' },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'Security', href: '#account-security' },
      { label: 'Privacy', href: '#customer-privacy' },
      { label: 'Experience', href: '#customer-experience' },
    ],
  },
]

export function ProductNavigation() {
  const [activeHref, setActiveHref] = useState<string>('#dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const allItems = useMemo(
    () => productNavigation.flatMap((group) => group.items),
    [],
  )

  useEffect(() => {
    const targets = allItems
      .filter((item) => item.href !== '#dashboard')
      .map((item) => document.querySelector(item.href))
      .filter((value): value is Element => Boolean(value))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          )
        if (visible[0]) setActiveHref(`#${visible[0].target.id}`)
      },
      { rootMargin: '-18% 0px -68% 0px', threshold: [0, 0.01] },
    )
    targets.forEach((target) => observer.observe(target))

    const onScroll = () => {
      if (window.scrollY < 260) setActiveHref('#dashboard')
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileOpen(false)
      document
        .querySelectorAll<HTMLDetailsElement>('.nav-group[open]')
        .forEach((details) => details.removeAttribute('open'))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('keydown', onKey)
    onScroll()

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('keydown', onKey)
    }
  }, [allItems])

  const activeGroup =
    productNavigation.find((group) =>
      group.items.some((item) => item.href === activeHref),
    )?.label ?? 'Overview'

  const follow = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    setActiveHref(event.currentTarget.hash)
    setMobileOpen(false)
    event.currentTarget.closest('details')?.removeAttribute('open')
  }

  return (
    <>
      <nav className="product-nav-desktop" aria-label="Product navigation">
        {productNavigation.map((group) => (
          <details
            className={group.label === activeGroup ? 'nav-group active' : 'nav-group'}
            key={group.label}
          >
            <summary>
              {group.label}
              <ChevronDown size={14} />
            </summary>
            <div className="nav-menu">
              {group.items.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={item.href === activeHref ? 'page' : undefined}
                  onClick={follow}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </details>
        ))}
      </nav>

      <button
        className="mobile-nav-toggle"
        type="button"
        aria-label={mobileOpen ? 'Close product navigation' : 'Open product navigation'}
        aria-expanded={mobileOpen}
        aria-controls="mobile-product-navigation"
        onClick={() => setMobileOpen((value) => !value)}
      >
        {mobileOpen ? <X size={19} /> : <Menu size={19} />}
        <span>{activeGroup}</span>
      </button>

      <nav
        id="mobile-product-navigation"
        className={mobileOpen ? 'mobile-product-nav open' : 'mobile-product-nav'}
        aria-label="Mobile product navigation"
        aria-hidden={!mobileOpen}
      >
        {productNavigation.map((group) => (
          <section key={group.label}>
            <h2>{group.label}</h2>
            {group.items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                aria-current={item.href === activeHref ? 'page' : undefined}
                onClick={follow}
              >
                {item.label}
              </a>
            ))}
          </section>
        ))}
      </nav>
    </>
  )
}
