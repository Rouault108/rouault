#!/usr/bin/env python3

from __future__ import annotations

import json
import os

from needs_contract import (
    fail,
    load_needs,
    require_detect_change_outputs,
    require_skipped,
    require_success,
)


def is_main_push() -> bool:
    return (
        os.getenv("GITHUB_EVENT_NAME", "") == "push"
        and os.getenv("GITHUB_REF", "") == "refs/heads/main"
    )


def main() -> int:
    try:
        needs = load_needs()
    except ValueError as exc:
        return fail(f"error: {exc}")
    except json.JSONDecodeError as exc:
        return fail(f"error: NEEDS_JSON is not valid JSON: {exc}")

    failures: list[str] = []

    require_success(
        needs,
        failures,
        "detect-changes",
        "change detection is always required",
    )
    _content_required, _app_required, build_required = require_detect_change_outputs(
        needs,
        failures,
    )

    require_success(
        needs,
        failures,
        "ci-required",
        "required CI must pass before deployment validation",
    )

    if is_main_push() and build_required:
        require_success(
            needs,
            failures,
            "deploy-production",
            "main push with build=true requires production deployment",
        )
    else:
        require_skipped(
            needs,
            failures,
            "deploy-production",
            "production deployment must be skipped unless this is a main push with build=true",
        )

    if failures:
        print("Deployment CI contract violations:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Deployment CI contract passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
