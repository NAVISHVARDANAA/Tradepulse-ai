# TradePulse AI forecasting worker

This service trains a small, explainable ensemble on time-ordered market
observations and publishes versioned forecasts into the existing Supabase model
registry.

## Model contract

- Forecast target: next-observation log return.
- Features: lagged returns, price-to-moving-average gaps, momentum, rolling
  volatility, drawdown, RSI-style strength and UTC calendar cycles.
- Models: standardized Ridge regression and histogram gradient boosting.
- Validation: expanding-window folds with a one-observation gap.
- Baseline: zero-return forecast.
- Promotion rule: a forecast is `passed` only when its out-of-sample MAE beats
  the baseline by at least 2% and directional accuracy is at least 52%.
- Uncertainty: empirical out-of-sample residual quantiles.

Failed and unqualified runs remain in the database for auditability. The web
application only displays forecasts that pass the validation gate.

## Runtime

The worker expects server-side environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FORECAST_MIN_OBSERVATIONS=120
FORECAST_HORIZON_HOURS=24
```

Run locally with the package installed:

```bash
tradepulse-forecast
```

The container is intended for a scheduled job. It is not a public HTTP API and
must never receive a browser-facing service-role credential.
