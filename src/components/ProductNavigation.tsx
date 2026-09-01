import { ChevronDown, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

export type ProductHref = `#${string}`
type NavItem = { label: string; href: ProductHref }
type NavGroup = { label: string; items: NavItem[] }

export const productNavigation: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', href: '#dashboard' },
      { label: 'System status', href: '#system-status' },
      { label: 'Data trust', href: '#data-trust' },
      { label: 'Trust center', href: '#trust-center' },
    ],
  },
  {
    label: 'Research',
    items: [
      { label: 'Analytics Studio', href: '#analytics-studio' },
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
      { label: 'Regulated preflight', href: '#regulated-preflight' },
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
      { label: 'Beta operations', href: '#beta-operations' },
      { label: 'Approved pilot', href: '#approved-pilot' },
      { label: 'Beta hardening', href: '#beta-hardening' },
      { label: 'Security', href: '#account-security' },
      { label: 'Privacy', href: '#customer-privacy' },
      { label: 'Experience', href: '#customer-experience' },
    ],
  },
]

const productHrefs = new Set(
  productNavigation.flatMap((group) => group.items.map((item) => item.href)),
)

export function productHrefFromHash(hash: string): ProductHref {
  return productHrefs.has(hash as ProductHref)
    ? hash as ProductHref
    : '#dashboard'
}

export function productLabelFromHref(href: ProductHref) {
  return productNavigation
    .flatMap((group) => group.items)
    .find((item) => item.href === href)?.label ?? 'Dashboard'
}

export function ProductNavigation({ activeHref }: { activeHref: ProductHref }) {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileOpen(false)
      document
        .querySelectorAll<HTMLDetailsElement>('.nav-group[open]')
        .forEach((details) => details.removeAttribute('open'))
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const activeGroup =
    productNavigation.find((group) =>
      group.items.some((item) => item.href === activeHref),
    )?.label ?? 'Overview'

  const follow = (event: ReactMouseEvent<HTMLAnchorElement>) => {
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
