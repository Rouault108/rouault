from __future__ import annotations

import json
import os
import sys
from typing import Any


def fail(message: str) -> int:
    print(message, file=sys.stderr)
    return 1


def load_needs() -> dict[str, Any]:
    raw = os.getenv("NEEDS_JSON")
    if raw is None:
        raise ValueError("NEEDS_JSON is not set")

    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise ValueError("NEEDS_JSON must decode to an object")

    return payload


def result_of(needs: dict[str, Any], job: str) -> str:
    meta = needs.get(job)
    if not isinstance(meta, dict):
        return "missing"

    result = meta.get("result")
    return result if isinstance(result, str) else "missing"


def output_of(needs: dict[str, Any], job: str, name: str) -> object:
    meta = needs.get(job)
    if not isinstance(meta, dict):
        return None

    outputs = meta.get("outputs")
    if not isinstance(outputs, dict):
        return None

    return outputs.get(name)


def require_result(
    needs: dict[str, Any],
    failures: list[str],
    job: str,
    expected: str,
    reason: str,
) -> None:
    result = result_of(needs, job)
    if result != expected:
        failures.append(f"{job}: expected {expected}, got {result}; {reason}")


def require_success(
    needs: dict[str, Any],
    failures: list[str],
    job: str,
    reason: str,
) -> None:
    require_result(needs, failures, job, "success", reason)


def require_skipped(
    needs: dict[str, Any],
    failures: list[str],
    job: str,
    reason: str,
) -> None:
    require_result(needs, failures, job, "skipped", reason)


def require_bool_output(
    needs: dict[str, Any],
    failures: list[str],
    job: str,
    name: str,
) -> bool:
    value = output_of(needs, job, name)

    if value not in ("true", "false"):
        failures.append(
            f"{job}.outputs.{name}: expected 'true' or 'false', got {value!r}"
        )
        return False

    return value == "true"


def require_detect_change_outputs(
    needs: dict[str, Any],
    failures: list[str],
) -> tuple[bool, bool, bool]:
    content_required = require_bool_output(needs, failures, "detect-changes", "content")
    app_required = require_bool_output(needs, failures, "detect-changes", "app")
    build_required = require_bool_output(needs, failures, "detect-changes", "build")

    return content_required, app_required, build_required
