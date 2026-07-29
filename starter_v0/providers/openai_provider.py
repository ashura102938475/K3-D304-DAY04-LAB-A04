from __future__ import annotations

import json
import os
import re
from typing import Any

from providers.base import ModelResponse, ToolCall


def _env_number(name: str, default: float, *, minimum: float, maximum: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        return default
    return min(max(value, minimum), maximum)


def _is_tool_call_generation_error(exc: Exception) -> bool:
    return getattr(exc, "status_code", None) == 400 and "tool_use_failed" in str(exc)


def _coerce_schema_value(value: Any, schema: dict[str, Any]) -> Any:
    value_type = schema.get("type")
    if value_type == "integer" and isinstance(value, str) and re.fullmatch(r"[+-]?\d+", value.strip()):
        return int(value)
    if value_type == "number" and isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return value
    if value_type == "boolean" and isinstance(value, str):
        folded = value.strip().lower()
        if folded in {"true", "false"}:
            return folded == "true"
    if value_type == "object" and isinstance(value, dict):
        properties = schema.get("properties", {})
        return {
            key: _coerce_schema_value(item, properties.get(key, {}))
            for key, item in value.items()
        }
    if value_type == "array" and isinstance(value, list):
        item_schema = schema.get("items", {})
        return [_coerce_schema_value(item, item_schema) for item in value]
    return value


class OpenAIProvider:
    """OpenAI Chat Completions provider with normalized tool_calls output."""

    def __init__(
        self,
        *,
        api_key_env: str | None = None,
        base_url: str | None = None,
        default_model: str = "gpt-4o-mini",
        config_env_prefix: str = "OPENAI",
        parallel_tool_calls: bool | None = None,
        default_timeout_seconds: float = 60.0,
    ) -> None:
        self.api_key_env = api_key_env or os.getenv("OPENAI_API_KEY_ENV", "OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL") or None
        self.default_model = default_model
        self.config_env_prefix = config_env_prefix
        self.parallel_tool_calls = parallel_tool_calls
        self.default_timeout_seconds = default_timeout_seconds

    def complete(
        self,
        messages: list[dict[str, str]],
        tools: list[dict[str, Any]] | None = None,
        *,
        model: str | None = None,
        temperature: float = 0.0,
        tool_choice: Any | None = None,
    ) -> ModelResponse:
        try:
            from openai import OpenAI
        except ImportError as exc:
            raise RuntimeError("Install live provider dependency first: pip install openai") from exc

        api_key = os.getenv(self.api_key_env)
        if not api_key:
            raise RuntimeError(f"Missing API key env var: {self.api_key_env}")

        timeout = _env_number(
            f"{self.config_env_prefix}_TIMEOUT_SECONDS",
            self.default_timeout_seconds,
            minimum=1.0,
            maximum=300.0,
        )
        max_retries = int(
            _env_number(
                f"{self.config_env_prefix}_MAX_RETRIES",
                2,
                minimum=0,
                maximum=10,
            )
        )
        client = OpenAI(
            api_key=api_key,
            base_url=self.base_url,
            timeout=timeout,
            max_retries=max_retries,
        )
        kwargs: dict[str, Any] = {
            "model": model or self.default_model,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools
            if self.parallel_tool_calls is not None:
                kwargs["parallel_tool_calls"] = self.parallel_tool_calls
        if tool_choice is not None:
            kwargs["tool_choice"] = tool_choice

        tool_call_retries = int(
            _env_number(
                f"{self.config_env_prefix}_TOOL_CALL_RETRIES",
                2,
                minimum=0,
                maximum=5,
            )
        )
        for attempt in range(tool_call_retries + 1):
            kwargs["temperature"] = temperature if attempt == 0 else min(0.1 * attempt, 0.3)
            try:
                resp = client.chat.completions.create(**kwargs)
                break
            except Exception as exc:
                if attempt == tool_call_retries or not _is_tool_call_generation_error(exc):
                    raise

        msg = resp.choices[0].message
        tool_schemas = {
            item.get("function", {}).get("name"): item.get("function", {}).get("parameters", {})
            for item in tools or []
        }
        calls: list[ToolCall] = []
        for call in msg.tool_calls or []:
            args = json.loads(call.function.arguments or "{}")
            args = _coerce_schema_value(args, tool_schemas.get(call.function.name, {}))
            calls.append(ToolCall(name=call.function.name, args=args))
        return ModelResponse(text=msg.content, tool_calls=calls, raw=resp)
