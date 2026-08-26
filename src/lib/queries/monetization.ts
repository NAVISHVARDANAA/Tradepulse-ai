import { supabase } from '../supabase/client'

export type CommercialPlan = {
  code: 'free' | 'pro' | 'business'
  name: string
  description: string
  monthlyPriceUsd: number
  monthlyPriceGbp: number
  trialDays: number
  selfServe: boolean
}

export type Entitlement = { planCode: string; code: string; allowance: number; name: string; unit: string }
export type CommercialSummary = {
  subscription: { planCode: string; status: string; trialEndsAt: string | null; periodEndsAt: string | null; cancelAtPeriodEnd: boolean }
  usage: Record<string, number>
  checkoutEnabled: boolean
  chargeCollectionEnabled: boolean
  providerCode: string
}

export async function getCommercialCatalog() {
  const [plans, entitlements] = await Promise.all([
    supabase.from('commercial_plans').select('code, name, description, monthly_price_usd, monthly_price_gbp, trial_days, self_serve').order('display_order'),
    supabase.from('plan_entitlements').select('plan_code, entitlement_code, allowance, entitlement_definitions(name, unit)').order('plan_code'),
  ])
  if (plans.error) throw plans.error
  if (entitlements.error) throw entitlements.error
  return {
    plans: (plans.data ?? []).map((plan) => ({ code: plan.code, name: plan.name, description: plan.description,
      monthlyPriceUsd: Number(plan.monthly_price_usd), monthlyPriceGbp: Number(plan.monthly_price_gbp),
      trialDays: plan.trial_days, selfServe: plan.self_serve })) as CommercialPlan[],
    entitlements: (entitlements.data ?? []).map((item) => {
      const definition = item.entitlement_definitions as unknown as { name: string; unit: string } | null
      return { planCode: item.plan_code, code: item.entitlement_code, allowance: item.allowance,
        name: definition?.name ?? item.entitlement_code, unit: definition?.unit ?? 'count' }
    }) as Entitlement[],
  }
}

export async function getCommercialSummary(): Promise<CommercialSummary> {
  const { data, error } = await supabase.rpc('customer_commercial_summary')
  if (error) throw error
  return data as CommercialSummary
}

export async function startProTrial() {
  const { error } = await supabase.rpc('start_pro_trial')
  if (error) throw error
}
