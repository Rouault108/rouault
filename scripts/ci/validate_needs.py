#!/usr/bin/env python3

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


def allowed_results() -> set[str]:
    raw = os.getenv("CI_ALLOWED_RESULTS", "success,skipped")
    return {item.strip() for item in raw.split(",") if item.strip()}


def main() -> int:
    try:
        needs = load_needs()
    except ValueError as exc:
        return fail(f"error: {exc}")
    except json.JSONDecodeError as exc:
        return fail(f"error: NEEDS_JSON is not valid JSON: {exc}")

    allowed = allowed_results()
    prefix = os.getenv("CI_GATE_PREFIX", "Blocking job results detected:")
    success_message = os.getenv("CI_GATE_SUCCESS", "All prerequisite jobs are success or skipped.")

    bad: dict[str, str] = {}
    for name, meta in needs.items():
        result = None
        if isinstance(meta, dict):
            result = meta.get("result")

        if result not in allowed:
            bad[name] = str(result)

    if bad:
        print(prefix)
        for name, result in bad.items():
            print(f"- {name}: {result}")
        return 1

    print(success_message)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())