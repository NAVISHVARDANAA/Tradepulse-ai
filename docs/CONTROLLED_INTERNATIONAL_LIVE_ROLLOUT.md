# Controlled international live-rollout control plane

Phase 8G models the exact evidence needed before any international live-trading
cohort could be approved. It does not activate live trading.

Three independently blocked cash-equity candidates are catalogued: India/XNSE
(INR, maximum 20 candidates), United Kingdom/XLON (GBP, maximum 20), and United
States/XNAS (USD, maximum 25). These are review scopes, not market availability
or customer eligibility.

Each cohort has ten separately versioned decisions covering residency,
jurisdiction, venue, currency, customer and investor type, account, asset class,
market orders and limit orders. Approval never propagates. Eighteen independent
gates cover legal, broker, exchange, KYC/AML/sanctions, disclosures, market-data
rights, custody, clearing, best execution, surveillance, limits,
reconciliation, statements, complaints, tax, security, incidents and rollback.

Conservative notional, concentration, velocity and open-order limits are
rehearsal-only. Funding credit is zero. Four templates cover kill switch,
rollback, five-ledger reconciliation and incident response; no operational drill
is marked observed.

No Phase 8G code path can activate a cohort. There is no activation RPC, live
order table, routing function, funding path or custody-account surface. Broker,
exchange, live market data, routing, funding, custody, settlement, margin,
options and automatic activation are database-constrained off.

After merge and green `main` CI, run GitHub Actions in order:

1. **Deploy Supabase production** — `DEPLOY_DATA_PHASE_8G`
2. **Verify Supabase production** — `VERIFY_DATA_PHASE_8G`
3. **Build production web release** — `BUILD_PHASE_8G`
4. **Deploy controlled beta web** — `DEPLOY_PHASE_8G`
5. **Verify web production** — `VERIFY_WEB_PHASE_8G`
