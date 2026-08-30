import type { ProductHref } from '../components/ProductNavigation'

export type ProductDataDomain = 'markets' | 'trade' | 'forecasts' | 'equity'

const routeDataRequirements: Partial<
  Record<ProductHref, readonly ProductDataDomain[]>
> = {
  '#analytics-studio': ['markets', 'trade', 'forecasts', 'equity'],
  '#markets': ['markets', 'trade'],
  '#trade-data': ['trade'],
  '#forecasts': ['forecasts'],
  '#stock-research': ['equity'],
  '#research-copilot': ['equity'],
  '#paper-investing': ['markets'],
  '#payments': ['markets'],
}

const noDataRequirements: readonly ProductDataDomain[] = []

export function productDataRequirements(
  href: ProductHref,
): readonly ProductDataDomain[] {
  return routeDataRequirements[href] ?? noDataRequirements
}
