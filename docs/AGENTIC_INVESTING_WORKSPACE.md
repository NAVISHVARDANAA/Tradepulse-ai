# Personalized agentic investing workspace

Phase 8E adds an account-scoped TradePulse Agent for grounded research,
custom analysis and reusable reports. It coordinates deterministic market,
news, forecast, risk, report and safety roles. It is not an autonomous trader,
financial adviser or general-purpose external-LLM integration.

## Customer experience

- A top-level account menu makes sign-in, account security and the private AI
  workspace reachable from every route.
- Signed-in users can keep private conversation history and choose concise,
  balanced or detailed answers; conservative, balanced or growth risk lenses;
  a forecast horizon; and a reporting currency.
- Custom report definitions are stored server-side. Each account can keep up to
  eight active reports with selected sections, scope, cadence and output format.
- Agent answers use display-qualified equity research, governed forecasts,
  account watchlists and normalized news signals. Each response records a data
  cutoff, evidence references, participating roles and a safety status.

## News-aware forecasting

The forecasting worker can construct four time-bounded news features: weighted
sentiment, event volume, negative shock and freshness. It reads only signals
that are licensed for training, non-synthetic and published no later than the
market-observation cutoff. Future news cannot alter historical feature rows.

The repository includes four clearly labeled synthetic scenarios so reviewers
can inspect the user experience. Those scenarios are display-only and are
database-constrained out of training. A production news provider is not
connected in this phase; provider approval and content rights are manual launch
prerequisites.

## Continuous learning boundary

“Continuous learning” means creating and evaluating new model candidates from
approved time-bounded data. It does not mean changing the active production
model without review. Every candidate requires:

1. an explicit training-data cutoff and feature-schema version;
2. a leakage gap and expanding walk-forward evaluation;
3. a cost-aware backtest and uncertainty evidence;
4. recorded evaluation results; and
5. human promotion review.

No silent self-promotion exists. User prompts are excluded from training by
default, and the account preference is an explicit opt-in rather than consent
to promote a model.

## Security and execution boundary

- The agent endpoint requires an authenticated account and verified MFA when
  the account has enrolled a factor.
- Row-level security isolates preferences, reports, conversations, runs and
  messages. Browser users cannot forge assistant messages or run evidence.
- Client run identifiers are idempotent, report writes use transaction locks,
  and report count is enforced in the database.
- Raw news articles are not stored. Only bounded normalized summaries, source
  references, rights state, timestamps and one-way input digests are retained.
- Requests to place or route trades or move money are refused and audited.
- External LLM connectivity, unlicensed news ingestion, automatic model
  promotion, live order routing, customer funding, custody and settlement stay
  disabled.

## Release order

After the Phase 8E pull request is merged and `main` CI passes, run these GitHub
Actions workflows sequentially, always on `main`:

1. **Deploy Supabase production** — `DEPLOY_DATA_PHASE_8E`
2. **Verify Supabase production** — `VERIFY_DATA_PHASE_8E`
3. **Build production web release** — `BUILD_PHASE_8E`
4. **Deploy controlled beta web** — `DEPLOY_PHASE_8E`
5. **Verify web production** — `VERIFY_WEB_PHASE_8E`

Wait for each workflow to pass before starting the next one. The production
verification SQL is query-only, and all protected agent requests must return
HTTP 401 without an authenticated session.
