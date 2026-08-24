from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .engine import MODEL_NAME, MODEL_VERSION, ForecastEngine, Observation


class SupabaseRestClient:
    def __init__(self, url: str, service_role_key: str) -> None:
        self.base_url = f"{url.rstrip('/')}/rest/v1"
        self.headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    def request(
        self,
        table: str,
        *,
        method: str = "GET",
        query: dict[str, str] | None = None,
        body: object | None = None,
        return_representation: bool = False,
    ) -> Any:
        query_string = f"?{urlencode(query)}" if query else ""
        headers = dict(self.headers)
        if return_representation:
            headers["Prefer"] = "return=representation"
        payload = json.dumps(body).encode("utf-8") if body is not None else None
        request = Request(
            f"{self.base_url}/{table}{query_string}",
            data=payload,
            headers=headers,
            method=method,
        )

        try:
            with urlopen(request, timeout=45) as response:
                content = response.read()
        except HTTPError as error:
            safe_body = error.read().decode("utf-8", errors="replace")[:500]
            raise RuntimeError(
                f"Supabase request failed with HTTP {error.code}: {safe_body}",
            ) from error
        except URLError as error:
            raise RuntimeError("Supabase request could not be reached") from error

        return json.loads(content) if content else None


def _required_environment(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _parse_observations(rows: list[dict[str, Any]]) -> list[Observation]:
    observations: list[Observation] = []

    for row in rows:
        timestamp = datetime.fromisoformat(row["observed_at"].replace("Z", "+00:00"))
        observations.append(Observation(observed_at=timestamp, price=float(row["price"])))

    return observations


def run() -> dict[str, object]:
    minimum_observations = int(os.environ.get("FORECAST_MIN_OBSERVATIONS", "120"))
    horizon_hours = int(os.environ.get("FORECAST_HORIZON_HOURS", "24"))

    if horizon_hours <= 0:
        raise RuntimeError("FORECAST_HORIZON_HOURS must be positive")

    client = SupabaseRestClient(
        _required_environment("SUPABASE_URL"),
        _required_environment("SUPABASE_SERVICE_ROLE_KEY"),
    )
    engine = ForecastEngine(
        minimum_observations=minimum_observations,
        horizon_hours=horizon_hours,
    )
    started_at = datetime.now(timezone.utc)
    run_rows = client.request(
        "forecast_runs",
        method="POST",
        body={
            "model_name": MODEL_NAME,
            "model_version": MODEL_VERSION,
            "status": "running",
            "training_window": 2000,
            "started_at": started_at.isoformat(),
        },
        return_representation=True,
    )
    run_id = run_rows[0]["id"]
    generated = 0
    passed = 0
    rejected = 0
    skipped: dict[str, str] = {}

    try:
        assets = client.request(
            "market_assets",
            query={"select": "id,symbol", "order": "symbol.asc"},
        )

        for asset in assets:
            rows = client.request(
                "market_observations",
                query={
                    "select": "observed_at,price",
                    "asset_id": f"eq.{asset['id']}",
                    "price": "not.is.null",
                    "order": "observed_at.asc",
                    "limit": "2000",
                },
            )

            try:
                result = engine.forecast(_parse_observations(rows))
            except ValueError as error:
                skipped[asset["symbol"]] = str(error)
                continue

            now = datetime.now(timezone.utc)
            client.request(
                "market_forecasts",
                method="PATCH",
                query={
                    "asset_id": f"eq.{asset['id']}",
                    "horizon_hours": f"eq.{horizon_hours}",
                    "is_latest": "eq.true",
                },
                body={"is_latest": False},
            )
            client.request(
                "market_forecasts",
                method="POST",
                body={
                    "forecast_run_id": run_id,
                    "asset_id": asset["id"],
                    "model_name": result.model_name,
                    "model_version": result.model_version,
                    "horizon_hours": horizon_hours,
                    "generated_at": now.isoformat(),
                    "target_at": (now + timedelta(hours=horizon_hours)).isoformat(),
                    "reference_price": result.reference_price,
                    "predicted_price": result.predicted_price,
                    "lower_bound": result.lower_bound,
                    "upper_bound": result.upper_bound,
                    "confidence_score": result.confidence_score,
                    "direction": result.direction,
                    "validation_status": result.validation_status,
                    "baseline_mae": result.baseline_mae,
                    "model_mae": result.model_mae,
                    "directional_accuracy": result.directional_accuracy,
                    "validation_interval_coverage": result.interval_coverage,
                    "cost_adjusted_return": result.cost_adjusted_return,
                    "cost_adjusted_max_drawdown": result.cost_adjusted_max_drawdown,
                    "estimated_turnover": result.estimated_turnover,
                    "is_latest": True,
                    "feature_snapshot": {
                        **result.feature_snapshot,
                        "symbol": asset["symbol"],
                    },
                },
            )
            generated += 1
            if result.validation_status == "passed":
                passed += 1
            else:
                rejected += 1

        completed_at = datetime.now(timezone.utc)
        metrics = {
            "generated": generated,
            "passed": passed,
            "rejected": rejected,
            "skipped": skipped,
            "duration_seconds": (completed_at - started_at).total_seconds(),
        }
        client.request(
            "forecast_runs",
            method="PATCH",
            query={"id": f"eq.{run_id}"},
            body={
                "status": "completed",
                "completed_at": completed_at.isoformat(),
                "metrics": metrics,
            },
        )
        governance = client.request(
            "rpc/evaluate_forecast_governance",
            method="POST",
            body={},
        )
        metrics["governance"] = governance
        client.request(
            "forecast_runs",
            method="PATCH",
            query={"id": f"eq.{run_id}"},
            body={"metrics": metrics},
        )
        return metrics
    except Exception as error:
        client.request(
            "forecast_runs",
            method="PATCH",
            query={"id": f"eq.{run_id}"},
            body={
                "status": "failed",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "error_summary": str(error)[:1000],
            },
        )
        raise


def main() -> None:
    try:
        print(json.dumps(run(), sort_keys=True))
    except Exception as error:
        print(json.dumps({"error": str(error)}), file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
