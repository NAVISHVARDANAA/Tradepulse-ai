#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_PROJECT_REF:?SUPABASE_PROJECT_REF is required}"
: "${WEB_SUPABASE_ANON_KEY:?WEB_SUPABASE_ANON_KEY is required}"

base_url="https://${SUPABASE_PROJECT_REF}.supabase.co/rest/v1"
endpoints=(
  'trade_observations?select=period_date&limit=1'
  'display_qualified_market_forecasts?select=id&limit=1'
  'equity_research_dashboard?select=security_id&limit=1'
  'academy_catalog?select=slug&limit=1'
  'investment_instruments?select=id&paper_trading_enabled=eq.true&limit=1'
  'payment_corridors?select=id&enabled=eq.true&limit=1'
  'payment_corridor_intelligence?select=route_code&limit=1'
  'payment_beneficiary_protection_reference?select=rule_code&limit=1'
)

for endpoint in "${endpoints[@]}"; do
  curl \
    --fail-with-body \
    --silent \
    --show-error \
    --output /dev/null \
    --header "apikey: ${WEB_SUPABASE_ANON_KEY}" \
    --header "Authorization: Bearer ${WEB_SUPABASE_ANON_KEY}" \
    "${base_url}/${endpoint}"
done

echo "All public runtime reads returned HTTP 2xx."
