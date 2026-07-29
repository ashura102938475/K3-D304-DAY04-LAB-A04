from __future__ import annotations

import os
import time
from typing import Any

import requests


DEFAULT_TIMEOUT_SECONDS = 45.0
DEFAULT_MAX_RETRIES = 2
DEFAULT_BACKOFF_SECONDS = 1.0
RETRYABLE_STATUS_CODES = {429, 500, 502, 503, 504}


def _env_float(name: str, default: float, *, minimum: float, maximum: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        return default
    return min(max(value, minimum), maximum)


def _env_int(name: str, default: int, *, minimum: int, maximum: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return min(max(value, minimum), maximum)


def _retry_delay(response: requests.Response | None, attempt: int) -> float:
    if response is not None:
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return min(max(float(retry_after), 0.0), 30.0)
            except ValueError:
                pass
    backoff = _env_float(
        "RAPIDAPI_RETRY_BACKOFF_SECONDS",
        DEFAULT_BACKOFF_SECONDS,
        minimum=0.0,
        maximum=10.0,
    )
    return backoff * (2**attempt)


def twitter_get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    key = os.getenv("RAPIDAPI_KEY")
    host = os.getenv("RAPIDAPI_TWITTER_HOST", "twitter-api45.p.rapidapi.com")
    if not key:
        raise RuntimeError("Missing RAPIDAPI_KEY env var")

    timeout = _env_float(
        "RAPIDAPI_TIMEOUT_SECONDS",
        DEFAULT_TIMEOUT_SECONDS,
        minimum=1.0,
        maximum=120.0,
    )
    max_retries = _env_int(
        "RAPIDAPI_MAX_RETRIES",
        DEFAULT_MAX_RETRIES,
        minimum=0,
        maximum=5,
    )
    headers = {"x-rapidapi-key": key, "x-rapidapi-host": host}

    for attempt in range(max_retries + 1):
        response: requests.Response | None = None
        try:
            response = requests.get(
                f"https://{host}{path}",
                params=params,
                headers=headers,
                timeout=timeout,
            )
            if response.status_code not in RETRYABLE_STATUS_CODES or attempt == max_retries:
                response.raise_for_status()
                return response.json()
        except (requests.Timeout, requests.ConnectionError):
            if attempt == max_retries:
                raise
        time.sleep(_retry_delay(response, attempt))

    raise RuntimeError("RapidAPI request exhausted retries")
