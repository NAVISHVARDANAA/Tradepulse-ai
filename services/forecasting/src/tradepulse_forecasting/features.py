from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import cos, exp, log, pi, sin, sqrt
from typing import Sequence

import numpy as np


FEATURE_NAMES = (
    "return_1",
    "return_2",
    "return_5",
    "price_to_ma_5",
    "price_to_ma_10",
    "price_to_ma_20",
    "momentum_5",
    "momentum_10",
    "momentum_20",
    "volatility_5",
    "volatility_10",
    "volatility_20",
    "drawdown_20",
    "relative_strength_14",
    "weekday_sin",
    "weekday_cos",
    "hour_sin",
    "hour_cos",
    "news_weighted_sentiment_7d",
    "news_event_volume_7d",
    "news_negative_shock_7d",
    "news_freshness_7d",
)


@dataclass(frozen=True)
class NewsSignal:
    published_at: datetime
    sentiment_score: float
    relevance_score: float
    novelty_score: float


@dataclass(frozen=True)
class FeatureDataset:
    features: np.ndarray
    targets: np.ndarray
    feature_names: tuple[str, ...]
    latest_features: np.ndarray
    latest_price: float


def _safe_return(current: float, previous: float) -> float:
    return log(current / previous) if current > 0 and previous > 0 else 0.0


def _window(values: np.ndarray, end: int, length: int) -> np.ndarray:
    return values[max(0, end - length + 1) : end + 1]


def _relative_strength(returns: np.ndarray) -> float:
    gains = np.clip(returns, 0, None)
    losses = np.clip(-returns, 0, None)
    average_gain = float(gains.mean()) if gains.size else 0.0
    average_loss = float(losses.mean()) if losses.size else 0.0

    if average_gain == 0 and average_loss == 0:
        return 0.5
    if average_loss == 0:
        return 1.0

    strength = average_gain / average_loss
    return 1 - (1 / (1 + strength))


def _feature_row(
    prices: np.ndarray,
    timestamps: Sequence[datetime],
    index: int,
    news_features: np.ndarray,
) -> list[float]:
    returns = np.array(
        [_safe_return(prices[item], prices[item - 1]) for item in range(1, index + 1)],
        dtype=float,
    )
    current = float(prices[index])

    def lagged_return(periods: int) -> float:
        anchor = max(0, index - periods)
        return _safe_return(current, float(prices[anchor]))

    def price_to_average(periods: int) -> float:
        average = float(_window(prices, index, periods).mean())
        return current / average - 1 if average else 0.0

    def momentum(periods: int) -> float:
        anchor = max(0, index - periods)
        return current / float(prices[anchor]) - 1

    def volatility(periods: int) -> float:
        sample = returns[-periods:]
        return float(sample.std(ddof=1)) if sample.size > 1 else 0.0

    timestamp = timestamps[index].astimezone(timezone.utc)
    weekday_angle = 2 * pi * timestamp.weekday() / 7
    hour_angle = 2 * pi * timestamp.hour / 24

    return [
        lagged_return(1),
        lagged_return(2),
        lagged_return(5),
        price_to_average(5),
        price_to_average(10),
        price_to_average(20),
        momentum(5),
        momentum(10),
        momentum(20),
        volatility(5),
        volatility(10),
        volatility(20),
        current / float(_window(prices, index, 20).max()) - 1,
        _relative_strength(returns[-14:]),
        sin(weekday_angle),
        cos(weekday_angle),
        sin(hour_angle),
        cos(hour_angle),
        *news_features[index].tolist(),
    ]


def build_news_feature_rows(
    timestamps: Sequence[datetime],
    signals: Sequence[NewsSignal],
    lookback_days: int = 7,
) -> np.ndarray:
    if lookback_days < 1 or lookback_days > 90:
        raise ValueError("news lookback must be between 1 and 90 days")
    if any(timestamp.tzinfo is None for timestamp in timestamps):
        raise ValueError("observation timestamps must include a timezone")
    if any(signal.published_at.tzinfo is None for signal in signals):
        raise ValueError("news timestamps must include a timezone")
    if any(
        not -1 <= signal.sentiment_score <= 1
        or not 0 <= signal.relevance_score <= 1
        or not 0 <= signal.novelty_score <= 1
        for signal in signals
    ):
        raise ValueError("news scores are outside the normalized range")

    normalized_signals = sorted(
        (
            NewsSignal(
                published_at=signal.published_at.astimezone(timezone.utc),
                sentiment_score=float(signal.sentiment_score),
                relevance_score=float(signal.relevance_score),
                novelty_score=float(signal.novelty_score),
            )
            for signal in signals
        ),
        key=lambda signal: signal.published_at,
    )
    feature_rows: list[list[float]] = []
    lookback_seconds = lookback_days * 24 * 60 * 60

    for raw_timestamp in timestamps:
        timestamp = raw_timestamp.astimezone(timezone.utc)
        eligible = [
            signal for signal in normalized_signals
            if 0 <= (timestamp - signal.published_at).total_seconds() <= lookback_seconds
        ]
        if not eligible:
            feature_rows.append([0.0, 0.0, 0.0, 0.0])
            continue

        weights = [signal.relevance_score * signal.novelty_score for signal in eligible]
        total_weight = sum(weights)
        weighted_sentiment = (
            sum(signal.sentiment_score * weight for signal, weight in zip(eligible, weights))
            / total_weight
            if total_weight > 0 else 0.0
        )
        negative_shock = max(
            (max(0.0, -signal.sentiment_score) * weight for signal, weight in zip(eligible, weights)),
            default=0.0,
        )
        latest_age_days = min(
            (timestamp - signal.published_at).total_seconds() / 86_400
            for signal in eligible
        )
        feature_rows.append([
            weighted_sentiment,
            float(np.log1p(len(eligible))),
            negative_shock,
            exp(-latest_age_days / max(1.0, lookback_days / 2)),
        ])

    return np.asarray(feature_rows, dtype=float)


def build_feature_dataset(
    prices: Sequence[float],
    timestamps: Sequence[datetime],
    lookback: int = 20,
    news_signals: Sequence[NewsSignal] = (),
) -> FeatureDataset:
    if len(prices) != len(timestamps):
        raise ValueError("prices and timestamps must have identical lengths")
    if len(prices) < lookback + 3:
        raise ValueError("not enough observations to build features")

    price_array = np.asarray(prices, dtype=float)

    if not np.all(np.isfinite(price_array)) or np.any(price_array <= 0):
        raise ValueError("prices must be finite and strictly positive")

    news_features = build_news_feature_rows(timestamps, news_signals)

    rows: list[list[float]] = []
    targets: list[float] = []

    for index in range(lookback, len(price_array) - 1):
        rows.append(_feature_row(price_array, timestamps, index, news_features))
        targets.append(_safe_return(price_array[index + 1], price_array[index]))

    return FeatureDataset(
        features=np.asarray(rows, dtype=float),
        targets=np.asarray(targets, dtype=float),
        feature_names=FEATURE_NAMES,
        latest_features=np.asarray(
            _feature_row(
                price_array,
                timestamps,
                len(price_array) - 1,
                news_features,
            ),
            dtype=float,
        ).reshape(1, -1),
        latest_price=float(price_array[-1]),
    )


def annualized_volatility(targets: np.ndarray, periods_per_year: int = 252) -> float:
    if targets.size < 2:
        return 0.0
    return float(targets.std(ddof=1) * sqrt(periods_per_year))
