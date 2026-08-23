import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

import { corsHeaders, jsonResponse } from '../_shared/http.ts'

type SyncRequest = { symbols?: string[] }
type SecTicker = { cik_str: number; ticker: string; title: string }
type SecFactUnit = {
  end: string
  filed: string
  form?: string
  fp?: string
  fy?: number
  val: number
}
type SecConcept = { units?: Record<string, SecFactUnit[]> }
type CompanyFacts = { facts?: Record<string, Record<string, SecConcept>> }

const conceptCandidates = {
  revenue: [
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'Revenues',
    'SalesRevenueNet',
  ],
  netIncome: ['NetIncomeLoss', 'ProfitLoss'],
  dilutedEps: ['EarningsPerShareDiluted'],
  totalAssets: ['Assets'],
  totalLiabilities: ['Liabilities'],
  operatingCashFlow: ['NetCashProvidedByUsedInOperatingActivities'],
  capitalExpenditure: ['PaymentsToAcquirePropertyPlantAndEquipment'],
  sharesOutstanding: ['CommonStockSharesOutstanding'],
} as const

function normalizeSymbols(values: string[]) {
  return Array.from(new Set(values
    .map((value) => value.trim().toUpperCase())
    .filter((value) => /^[A-Z0-9.-]{1,15}$/.test(value))))
    .slice(0, 20)
}

function secHeaders(userAgent: string) {
  return {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'User-Agent': userAgent,
  }
}

function validFact(item: SecFactUnit) {
  return (
    ['10-K', '10-Q', '20-F', '40-F'].includes(item.form ?? '') &&
    Boolean(item.end) &&
    Boolean(item.filed) &&
    Number.isFinite(Number(item.val))
  )
}

function factSeries(
  facts: CompanyFacts,
  candidates: readonly string[],
  preferredUnits: string[],
) {
  const usGaap = facts.facts?.['us-gaap'] ?? {}

  for (const candidate of candidates) {
    const units = usGaap[candidate]?.units ?? {}

    for (const unit of preferredUnits) {
      const series = (units[unit] ?? []).filter(validFact)

      if (series.length > 0) {
        return series
      }
    }
  }

  return []
}

function latestFact(series: SecFactUnit[]) {
  return [...series].sort((a, b) =>
    b.end.localeCompare(a.end) || b.filed.localeCompare(a.filed)
  )[0] ?? null
}

function factForPeriod(series: SecFactUnit[], periodEnd: string) {
  return [...series]
    .filter((item) => item.end === periodEnd)
    .sort((a, b) => b.filed.localeCompare(a.filed))[0] ?? null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const expectedSecret = Deno.env.get('SYNC_SECRET')

  if (!expectedSecret || request.headers.get('x-sync-secret') !== expectedSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const secUserAgent = Deno.env.get('SEC_USER_AGENT')

  if (!supabaseUrl || !serviceRoleKey || !secUserAgent) {
    return jsonResponse({ error: 'Server configuration is incomplete' }, 500)
  }

  let body: SyncRequest = {}

  try {
    body = (await request.json()) as SyncRequest
  } catch {
    body = {}
  }

  const requestedSymbols = Array.isArray(body.symbols)
    ? normalizeSymbols(body.symbols)
    : []
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })
  let securityQuery = admin
    .from('equity_securities')
    .select('id, display_symbol, cik')
    .eq('country_code', 'US')
    .eq('active', true)
    .eq('research_enabled', true)
    .limit(20)

  if (requestedSymbols.length > 0) {
    securityQuery = securityQuery.in('display_symbol', requestedSymbols)
  }

  const { data: securities, error: securitiesError } = await securityQuery

  if (securitiesError) {
    return jsonResponse({ error: 'Unable to load configured US equities' }, 500)
  }

  if (!securities || securities.length === 0) {
    return jsonResponse({ error: 'No approved US equities are configured' }, 422)
  }

  const { data: syncRun, error: syncRunError } = await admin
    .from('data_sync_runs')
    .insert({
      source_name: 'SEC EDGAR',
      dataset: 'company_facts',
      status: 'running',
      metadata: { requested_securities: securities.length },
    })
    .select('id')
    .single()

  if (syncRunError || !syncRun) {
    return jsonResponse({ error: 'Unable to start sync audit record' }, 500)
  }

  let recordsRead = 0
  let recordsWritten = 0

  try {
    const headers = secHeaders(secUserAgent)
    const tickerResponse = await fetch(
      'https://www.sec.gov/files/company_tickers.json',
      { headers },
    )

    if (!tickerResponse.ok) {
      throw new Error(`SEC ticker registry returned ${tickerResponse.status}`)
    }

    const tickerPayload = await tickerResponse.json() as Record<string, SecTicker>
    const tickerMap = new Map(
      Object.values(tickerPayload).map((item) => [
        item.ticker.toUpperCase(),
        item,
      ]),
    )
    recordsRead += Object.keys(tickerPayload).length

    for (const security of securities) {
      const registryItem = tickerMap.get(security.display_symbol.toUpperCase())
      const cik = security.cik ?? (registryItem
        ? String(registryItem.cik_str).padStart(10, '0')
        : null)

      if (!cik) {
        continue
      }

      const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`
      const factsResponse = await fetch(factsUrl, { headers })

      if (!factsResponse.ok) {
        throw new Error(
          `SEC CompanyFacts returned ${factsResponse.status} for ${security.display_symbol}`,
        )
      }

      const facts = await factsResponse.json() as CompanyFacts
      const revenueSeries = factSeries(facts, conceptCandidates.revenue, ['USD'])
      const anchor = latestFact(revenueSeries)
      recordsRead += 1

      if (!anchor) {
        continue
      }

      const value = (
        candidates: readonly string[],
        units: string[],
      ) => factForPeriod(factSeries(facts, candidates, units), anchor.end)?.val ?? null
      const fiscalPeriod = [anchor.form, anchor.fy, anchor.fp]
        .filter((item) => item !== undefined && item !== null && item !== '')
        .join(':')

      const { error: securityUpdateError } = await admin
        .from('equity_securities')
        .update({ cik })
        .eq('id', security.id)

      if (securityUpdateError) {
        throw securityUpdateError
      }

      const { error: fundamentalError } = await admin
        .from('equity_fundamental_snapshots')
        .upsert(
          {
            security_id: security.id,
            period_end: anchor.end,
            filing_date: anchor.filed,
            fiscal_period: fiscalPeriod || anchor.form || 'reported',
            currency: 'USD',
            revenue: anchor.val,
            net_income: value(conceptCandidates.netIncome, ['USD']),
            diluted_eps: value(conceptCandidates.dilutedEps, ['USD/shares']),
            total_assets: value(conceptCandidates.totalAssets, ['USD']),
            total_liabilities: value(conceptCandidates.totalLiabilities, ['USD']),
            operating_cash_flow: value(conceptCandidates.operatingCashFlow, ['USD']),
            capital_expenditure: value(conceptCandidates.capitalExpenditure, ['USD']),
            shares_outstanding: value(conceptCandidates.sharesOutstanding, ['shares']),
            source: 'sec-edgar-companyfacts',
            source_url: factsUrl,
            display_allowed: true,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: 'security_id,period_end,fiscal_period,source' },
        )

      if (fundamentalError) {
        throw fundamentalError
      }

      const { error: coverageError } = await admin
        .from('equity_data_coverage')
        .upsert(
          {
            security_id: security.id,
            provider_name: 'sec-edgar',
            dataset: 'fundamentals',
            coverage_status: 'reference',
            delay_minutes: null,
            license_status: 'public_domain',
            last_synchronized_at: new Date().toISOString(),
            last_observed_at: `${anchor.end}T00:00:00.000Z`,
            error_summary: null,
            metadata: {
              filing_date: anchor.filed,
              form: anchor.form ?? null,
              fiscal_period: anchor.fp ?? null,
            },
          },
          { onConflict: 'security_id,provider_name,dataset' },
        )

      if (coverageError) {
        throw coverageError
      }

      recordsWritten += 1
    }

    await admin
      .from('data_sync_runs')
      .update({
        status: 'completed',
        records_read: recordsRead,
        records_written: recordsWritten,
        completed_at: new Date().toISOString(),
      })
      .eq('id', syncRun.id)

    return jsonResponse({
      status: 'completed',
      securities: securities.length,
      recordsWritten,
      source: 'SEC EDGAR CompanyFacts',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown sync error'

    await admin
      .from('data_sync_runs')
      .update({
        status: recordsWritten > 0 ? 'partial' : 'failed',
        records_read: recordsRead,
        records_written: recordsWritten,
        completed_at: new Date().toISOString(),
        error_summary: message.slice(0, 1000),
      })
      .eq('id', syncRun.id)

    return jsonResponse({ error: 'SEC fundamentals synchronization failed' }, 502)
  }
})
