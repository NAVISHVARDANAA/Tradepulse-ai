from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import exp
from typing import Iterator, Sequence

import numpy as np
from sklearn.base import RegressorMixin, clone
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from .features import annualized_volatility, build_feature_dataset


MODEL_NAME = "ridge-histgb-ensemble"
MODEL_VERSION = "1.0.0"


@dataclass(frozen=True)
class Observation:
    observed_at: datetime
    price: float


@dataclass(frozen=True)
class ForecastResult:
    reference_price: float
    predicted_price: float
    lower_bound: float
    upper_bound: float
    confidence_score: float
    direction: str
    validation_status: str
    baseline_mae: float
    model_mae: float
    directional_accuracy: float
    interval_coverage: float
    cost_adjusted_return: float
    cost_adjusted_max_drawdown: float
    estimated_turnover: float
    model_name: str
    model_version: str
    feature_snapshot: dict[str, object]


@dataclass(frozen=True)
class CostAwareBacktest:
    net_return: float
    max_drawdown: float
    turnover: float


def cost_aware_backtest(
    actual_returns: np.ndarray,
    predicted_returns: np.ndarray,
    transaction_cost_bps: float = 10.0,
) -> CostAwareBacktest:
    if actual_returns.shape != predicted_returns.shape:
        raise ValueError("actual and predicted returns must have the same shape")
    if actual_returns.size == 0:
        raise ValueError("cost-aware backtest requires at least one prediction")
    if transaction_cost_bps < 0:
        raise ValueError("transaction_cost_bps cannot be negative")

    positions = np.sign(predicted_returns)
    previous_positions = np.concatenate(([0.0], positions[:-1]))
    turnover = np.abs(positions - previous_positions)
    net_log_returns = (
        positions * actual_returns
        - turnover * (transaction_cost_bps / 10_000)
    )
    equity_curve = np.exp(np.cumsum(net_log_returns))
    running_peak = np.maximum.accumulate(np.concatenate(([1.0], equity_curve)))
    drawdown = 1 - np.concatenate(([1.0], equity_curve)) / running_peak

    return CostAwareBacktest(
        net_return=float(equity_curve[-1] - 1),
        max_drawdown=float(np.max(drawdown)),
        turnover=float(np.sum(turnover)),
    )


def expanding_window_splits(
    sample_count: int,
    folds: int = 4,
    minimum_train_size: int = 50,
    gap: int = 1,
) -> Iterator[tuple[np.ndarray, np.ndarray]]:
    if sample_count <= minimum_train_size + gap:
        raise ValueError("not enough feature rows for walk-forward validation")

    available = sample_count - minimum_train_size - gap
    test_size = max(1, available // folds)

    for fold in range(folds):
        train_end = minimum_train_size + fold * test_size
        test_start = train_end + gap
        test_end = sample_count if fold == folds - 1 else min(
            sample_count,
            test_start + test_size,
        )

        if test_start >= test_end:
            continue

        yield np.arange(0, train_end), np.arange(test_start, test_end)


class ForecastEngine:
    def __init__(
        self,
        minimum_observations: int = 120,
        horizon_hours: int = 24,
    ) -> None:
        if minimum_observations < 80:
            raise ValueError("minimum_observations must be at least 80")
        if horizon_hours <= 0:
            raise ValueError("horizon_hours must be positive")
        self.minimum_observations = minimum_observations
        self.horizon_hours = horizon_hours
        self._models: dict[str, RegressorMixin] = {
            "ridge": make_pipeline(StandardScaler(), Ridge(alpha=1.0)),
            "histgb": HistGradientBoostingRegressor(
                learning_rate=0.05,
                max_iter=160,
                max_leaf_nodes=15,
                l2_regularization=0.25,
                min_samples_leaf=12,
                random_state=42,
            ),
        }

    def forecast(self, observations: Sequence[Observation]) -> ForecastResult:
        if any(item.observed_at.tzinfo is None for item in observations):
            raise ValueError("observation timestamps must include a timezone")

        latest_by_timestamp = {
            item.observed_at.astimezone(timezone.utc): item for item in observations
        }
        cleaned = [latest_by_timestamp[key] for key in sorted(latest_by_timestamp)]

        if len(cleaned) < self.minimum_observations:
            raise ValueError(
                f"at least {self.minimum_observations} observations are required",
            )

        timestamps = [item.observed_at.astimezone(timezone.utc) for item in cleaned]
        prices = [float(item.price) for item in cleaned]
        interval_hours = np.asarray(
            [
                (timestamps[index] - timestamps[index - 1]).total_seconds() / 3600
                for index in range(1, len(timestamps))
            ],
            dtype=float,
        )
        median_interval_hours = float(np.median(interval_hours))

        if not 0.5 * self.horizon_hours <= median_interval_hours <= 2 * self.horizon_hours:
            raise ValueError(
                "observation frequency does not match the configured forecast horizon",
            )

        dataset = build_feature_dataset(prices, timestamps)
        predictions: dict[str, np.ndarray] = {
            name: np.full(dataset.targets.shape, np.nan, dtype=float)
            for name in self._models
        }
        evaluated_indices: list[int] = []

        minimum_train_size = max(50, dataset.features.shape[0] // 2)
        for train_indices, test_indices in expanding_window_splits(
            dataset.features.shape[0],
            minimum_train_size=minimum_train_size,
        ):
            evaluated_indices.extend(test_indices.tolist())
            for name, prototype in self._models.items():
                model = clone(prototype)
                model.fit(dataset.features[train_indices], dataset.targets[train_indices])
                predictions[name][test_indices] = model.predict(
                    dataset.features[test_indices],
                )

        validation_indices = np.asarray(sorted(set(evaluated_indices)), dtype=int)
        actual = dataset.targets[validation_indices]

        if actual.size < 12:
            raise ValueError("walk-forward validation produced too few predictions")

        model_maes: dict[str, float] = {}
        for name, values in predictions.items():
            model_values = values[validation_indices]
            if np.any(np.isnan(model_values)):
                raise ValueError(f"model {name} has incomplete validation output")
            model_maes[name] = float(mean_absolute_error(actual, model_values))

        inverse_errors = {
            name: 1 / max(error, 1e-12) for name, error in model_maes.items()
        }
        weight_total = sum(inverse_errors.values())
        weights = {name: value / weight_total for name, value in inverse_errors.items()}
        ensemble_validation = sum(
            predictions[name][validation_indices] * weights[name]
            for name in self._models
        )
        model_mae = float(mean_absolute_error(actual, ensemble_validation))
        baseline_predictions = np.zeros_like(actual)
        baseline_mae = float(mean_absolute_error(actual, baseline_predictions))
        directional_accuracy = float(
            np.mean(np.sign(ensemble_validation) == np.sign(actual)),
        )
        residuals = actual - ensemble_validation
        calibration_size = max(6, int(actual.size * 0.6))
        calibration_residuals = residuals[:calibration_size]
        coverage_residuals = residuals[calibration_size:]
        if coverage_residuals.size < 4:
            raise ValueError("walk-forward validation produced too few calibration outcomes")
        calibration_lower = float(np.quantile(calibration_residuals, 0.05))
        calibration_upper = float(np.quantile(calibration_residuals, 0.95))
        interval_coverage = float(
            np.mean(
                (coverage_residuals >= calibration_lower)
                & (coverage_residuals <= calibration_upper),
            ),
        )
        lower_residual = float(np.quantile(residuals, 0.05))
        upper_residual = float(np.quantile(residuals, 0.95))
        backtest = cost_aware_backtest(actual, ensemble_validation)

        next_returns: dict[str, float] = {}
        for name, prototype in self._models.items():
            fitted = clone(prototype)
            fitted.fit(dataset.features, dataset.targets)
            next_returns[name] = float(fitted.predict(dataset.latest_features)[0])

        predicted_return = sum(
            next_returns[name] * weights[name] for name in self._models
        )
        predicted_price = dataset.latest_price * exp(predicted_return)
        lower_bound = dataset.latest_price * exp(predicted_return + lower_residual)
        upper_bound = dataset.latest_price * exp(predicted_return + upper_residual)
        relative_improvement = (
            (baseline_mae - model_mae) / baseline_mae if baseline_mae > 0 else 0.0
        )
        validation_status = (
            "passed"
            if model_mae <= baseline_mae * 0.98 and directional_accuracy >= 0.52
            else "rejected"
        )
        confidence = float(
            np.clip(
                0.35 + 0.35 * max(0.0, relative_improvement)
                + 0.30 * max(0.0, directional_accuracy - 0.5) * 2,
                0.1,
                0.9,
            ),
        )
        move_percent = (predicted_price / dataset.latest_price - 1) * 100
        direction = "up" if move_percent > 0.15 else "down" if move_percent < -0.15 else "flat"

        return ForecastResult(
            reference_price=dataset.latest_price,
            predicted_price=predicted_price,
            lower_bound=min(lower_bound, predicted_price),
            upper_bound=max(upper_bound, predicted_price),
            confidence_score=confidence,
            direction=direction,
            validation_status=validation_status,
            baseline_mae=baseline_mae,
            model_mae=model_mae,
            directional_accuracy=directional_accuracy,
            interval_coverage=interval_coverage,
            cost_adjusted_return=backtest.net_return,
            cost_adjusted_max_drawdown=backtest.max_drawdown,
            estimated_turnover=backtest.turnover,
            model_name=MODEL_NAME,
            model_version=MODEL_VERSION,
            feature_snapshot={
                "observations": len(cleaned),
                "feature_names": list(dataset.feature_names),
                "model_weights": weights,
                "component_mae": model_maes,
                "predicted_log_return": predicted_return,
                "reference_price": dataset.latest_price,
                "annualized_volatility": annualized_volatility(dataset.targets),
                "validation_samples": int(actual.size),
                "validation_gap": 1,
                "median_interval_hours": median_interval_hours,
                "horizon_hours": self.horizon_hours,
                "validation_interval_coverage": interval_coverage,
                "cost_adjusted_return": backtest.net_return,
                "cost_adjusted_max_drawdown": backtest.max_drawdown,
                "estimated_turnover": backtest.turnover,
                "transaction_cost_bps": 10.0,
                "qualified_for_display": validation_status == "passed",
            },
        )
