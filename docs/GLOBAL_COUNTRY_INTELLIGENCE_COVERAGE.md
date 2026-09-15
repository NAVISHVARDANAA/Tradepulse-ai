# Global country intelligence coverage fabric

Phase 8I establishes a deterministic reference ledger for 193 United Nations
members plus the Holy See and State of Palestine. The 195 rows are country
identity targets, not a claim that TradePulse has evidence about current
conditions in every country.

## Coverage model

Each country receives the same eight intelligence-domain checks:

1. macro economy;
2. currency and monetary policy;
3. resources and commodities;
4. trade flows;
5. logistics and supply chain;
6. markets and corporates;
7. climate and weather; and
8. geopolitics and regulation.

The migration creates 1,560 country-domain cells. Every cell starts as
`evidence_missing`, with zero approved sources and zero approved observations.
This is intentional: reference identity is not evidence, and a generated value
must never hide a country data gap.

## Evidence and release gates

A later release may attach an observation only after exact source rights,
country identity, temporal freshness, cross-source reconciliation, dependency
validation, uncertainty calibration and accountable human release review are
complete. Domain policies require two or three independent sources and at least
one primary source.

The browser receives the sanitized country catalogue, domain requirements and
gap counts. It receives no private source material, reviewer identity, raw
article, leaked information or generated country fact.

## Hard boundary

Phase 8I connects no live provider and adds no ingestion or publication RPC.
Automatic gap filling, country scoring, model training, autonomous publication
and trade execution are database-constrained off. The existing Phase 8H
corroboration gates and all brokerage, funding, custody and settlement locks
remain independent and closed.

## Release order

After merge and green `main` CI, run GitHub Actions sequentially:

1. **Deploy Supabase production** — `DEPLOY_DATA_PHASE_8I`
2. **Verify Supabase production** — `VERIFY_DATA_PHASE_8I`
3. **Build production web release** — `BUILD_PHASE_8I`
4. **Deploy controlled beta web** — `DEPLOY_PHASE_8I`
5. **Verify web production** — `VERIFY_WEB_PHASE_8I`

Production verification is query-only. Connecting a country or domain source
requires a later reviewed migration with contractual rights, security, privacy,
retention, freshness, corroboration and named operating ownership.
