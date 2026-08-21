import { supabase } from '../supabase/client'

export async function getCountries() {
  const { data, error } = await supabase
    .from('countries')
    .select('id, iso_code, name, region')
    .order('name')

  if (error) {
    throw error
  }

  return data
}

export async function getMarketAssets() {
  const { data, error } = await supabase
    .from('market_assets')
    .select(`
      id,
      symbol,
      name,
      asset_type,
      currency,
      market_observations (
        observed_at,
        price,
        change_percent,
        source
      )
    `)
    .order('symbol')

  if (error) {
    throw error
  }

  return data.map((asset) => {
    const observations = [...(asset.market_observations ?? [])].sort(
      (a, b) =>
        new Date(b.observed_at).getTime() -
        new Date(a.observed_at).getTime(),
    )

    const latest = observations[0]

    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      asset_type: asset.asset_type,
      currency: asset.currency,
      price: latest?.price ?? null,
      change_percent: latest?.change_percent ?? null,
      source: latest?.source ?? null,
      observed_at: latest?.observed_at ?? null,
    }
  })
}

