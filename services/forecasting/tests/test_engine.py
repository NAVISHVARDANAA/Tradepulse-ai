from __future__ import annotations

import math
import unittest
from datetime import datetime, timedelta, timezone

import numpy as np

from tradepulse_forecasting import ForecastEngine, Observation
from tradepulse_forecasting.engine import expanding_window_splits
from tradepulse_forecasting.features import build_feature_dataset


def synthetic_observations(count: int = 260) -> list[Observation]:
    timestamp = datetime(2025, 1, 1, tzinfo=timezone.utc)
    price = 100.0
    previous_return = 0.001
    observations: list[Observation] = []

    for index in range(count):
        cycle = 0.0018 * math.sin(index / 8)
        next_return = 0.62 * previous_return + cycle
        price *= math.exp(next_return)
        observations.append(
            Observation(
                observed_at=timestamp + timedelta(days=index),
                price=price,
            ),
        )
        previous_return = next_return

    return observations


class FeatureTests(unittest.TestCase):
    def test_feature_dataset_is_finite(self) -> None:
        observations = synthetic_observations(100)
        dataset = build_feature_dataset(
            [item.price for item in observations],
            [item.observed_at for item in observations],
        )

        self.assertEqual(dataset.features.shape[1], len(dataset.feature_names))
        self.assertTrue(np.all(np.isfinite(dataset.features)))
        self.assertTrue(np.all(np.isfinite(dataset.targets)))

    def test_feature_builder_rejects_non_positive_prices(self) -> None:
        observations = synthetic_observations(40)
        prices = [item.price for item in observations]
        prices[25] = 0

        with self.assertRaisesRegex(ValueError, "strictly positive"):
            build_feature_dataset(
                prices,
                [item.observed_at for item in observations],
            )


class ValidationTests(unittest.TestCase):
    def test_expanding_windows_have_a_leakage_gap(self) -> None:
        splits = list(
            expanding_window_splits(
                sample_count=180,
                folds=4,
                minimum_train_size=80,
                gap=1,
            ),
        )

        self.assertEqual(len(splits), 4)
        for train_indices, test_indices in splits:
            self.assertLess(train_indices.max(), test_indices.min())
            self.assertGreaterEqual(test_indices.min() - train_indices.max(), 2)


class ForecastEngineTests(unittest.TestCase):
    def test_engine_returns_auditable_ensemble_forecast(self) -> None:
        result = ForecastEngine(minimum_observations=120).forecast(
            synthetic_observations(),
        )

        self.assertGreater(result.predicted_price, 0)
        self.assertLessEqual(result.lower_bound, result.predicted_price)
        self.assertGreaterEqual(result.upper_bound, result.predicted_price)
        self.assertGreaterEqual(result.confidence_score, 0.1)
        self.assertLessEqual(result.confidence_score, 0.9)
        self.assertIn(result.direction, {"up", "down", "flat"})
        self.assertIn(result.validation_status, {"passed", "rejected"})
        self.assertEqual(result.validation_status, "passed")
        self.assertLess(result.model_mae, result.baseline_mae)
        self.assertGreater(result.feature_snapshot["validation_samples"], 0)
        self.assertEqual(result.feature_snapshot["validation_gap"], 1)

    def test_engine_rejects_short_history(self) -> None:
        engine = ForecastEngine(minimum_observations=120)

        with self.assertRaisesRegex(ValueError, "at least 120"):
            engine.forecast(synthetic_observations(80))

    def test_engine_rejects_mismatched_frequency(self) -> None:
        observations = synthetic_observations()
        hourly = [
            Observation(
                observed_at=observations[0].observed_at + timedelta(hours=index),
                price=item.price,
            )
            for index, item in enumerate(observations)
        ]

        with self.assertRaisesRegex(ValueError, "frequency"):
            ForecastEngine(horizon_hours=24).forecast(hourly)


if __name__ == "__main__":
    unittest.main()
