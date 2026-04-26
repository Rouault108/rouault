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


EXTENDED_TEST_JOBS = (
    "test-storybook-smoke",
    "test-e2e-production",
    "test-e2e-dev",
)


def requires_extended_tests() -> bool:
    event_name = os.getenv("GITHUB_EVENT_NAME", "")
    ref = os.getenv("GITHUB_REF", "")
    base_ref = os.getenv("GITHUB_BASE_REF", "")

    is_main_push = event_name == "push" and ref == "refs/heads/main"
    is_manual = event_name == "workflow_dispatch"
    is_pr_to_main = event_name == "pull_request" and base_ref == "main"

    return is_main_push or is_manual or is_pr_to_main


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
    _content_required, app_required, build_required = require_detect_change_outputs(
        needs,
        failures,
    )

    require_success(needs, failures, "prebuild-gate", "prebuild gate is always required")

    if build_required:
        require_success(
            needs,
            failures,
            "build-production",
            "build=true requires a production build",
        )
    else:
        require_skipped(
            needs,
            failures,
            "build-production",
            "build=false must skip production build",
        )

    extended_required = app_required and requires_extended_tests()

    for job in EXTENDED_TEST_JOBS:
        if extended_required:
            require_success(
                needs,
                failures,
                job,
                "app=true on an extended-test run requires extended tests",
            )
        else:
            require_skipped(
                needs,
                failures,
                job,
                "extended tests are not required in this context",
            )

    if failures:
        print("Required CI contract violations:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Required CI contract passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
