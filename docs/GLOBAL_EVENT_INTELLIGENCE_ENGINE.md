# Global event intelligence engine

Phase 8F introduces the evidence model for turning approved global events into
reviewable country, commodity, currency and logistics scenarios. It is the
foundation for TradePulse AI to detect relationships that are difficult to
track manually without presenting uncertain information as fact.

## What the engine does

- Registers each source with its rights state, authenticity tier, review state
  and connectivity status before any event can be displayed.
- Stores bounded normalized summaries, source references, timestamps and
  one-way digests. Raw articles, leaked credentials and scraped page content are
  not stored.
- Links an event to countries, commodities, currencies, logistics nodes and
  tracked market assets through an explicit knowledge graph.
- Represents transmission as ordered causal edges such as discovery → expected
  supply → global price, or shipping delay → route capacity → energy risk
  premium.
- Keeps probability separate from confidence. Probability describes the
  scenario outcome; confidence describes evidence quality.
- Lets signed-in customers save private in-app alert policies by country, event
  category, asset, severity, authenticity and confidence thresholds.
- Adds event-impact evidence to the existing TradePulse Agent while preserving
  citations, data cutoffs, human review and refusal of execution requests.

## Country coverage

The policy target is 195 sovereign-state records: the 193 United Nations member
states plus the Holy See and the State of Palestine. The application reports
the current catalogued count from the database and shows missing evidence
explicitly. Phase 8F does not fabricate economic, resource or event data for a
country that lacks an approved source.

The initial migration creates a coverage row for every country already in the
TradePulse country catalogue. Expanding the catalogue and connecting reviewed
country sources are separate data-governance releases.

## Authenticity and leak handling

Unverified claims, anonymous leaks and social posts cannot become verified
events automatically. A future provider adapter must retain the source class,
rights decision, publication and observation times, evidence digest and
corroboration count. An event may be marked verified only when it is
non-synthetic, has at least two corroborating sources and meets the minimum
authenticity threshold. Human review remains required before publication or
model use.

Synthetic scenarios are useful for product testing, but have authenticity zero,
are visibly labelled and are database-constrained out of model training.

## Scenario boundaries

Impact ranges are conditional estimates, not guaranteed price targets. Every
edge records its mechanism, direction, probability, confidence, horizon, lag,
assumptions and rationale. The graph can express competing paths and mixed
effects rather than forcing one answer.

Every Phase 8F scenario has `production_effect = false`. It cannot publish
itself, change a production model, place an order, fund an account, hold assets
or settle a transaction. Existing brokerage and money-movement locks remain
independent and closed.

## Initial deterministic scenarios

The controlled-beta experience contains five synthetic scenarios:

1. an Indian gold discovery and its possible long-term supply, import and FX
   paths;
2. a coordinated crude supply reduction;
3. a maritime chokepoint delay;
4. United Kingdom rate-path repricing; and
5. China port congestion.

These examples prove the graph and interface. They are not current news and are
not forecasts generated from live web data.

## Release order

After the Phase 8F pull request is merged and the new `main` CI passes, run the
following GitHub Actions workflows sequentially on `main`:

1. **Deploy Supabase production** — `DEPLOY_DATA_PHASE_8F`
2. **Verify Supabase production** — `VERIFY_DATA_PHASE_8F`
3. **Build production web release** — `BUILD_PHASE_8F`
4. **Deploy controlled beta web** — `DEPLOY_PHASE_8F`
5. **Verify web production** — `VERIFY_WEB_PHASE_8F`

Wait for each workflow to pass before starting the next. Production smoke SQL
is query-only. Phase 8G remains the separately approved controlled
international live-rollout phase.
