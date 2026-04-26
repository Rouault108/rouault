#!/usr/bin/env python3

from __future__ import annotations

import json

from needs_contract import (
    fail,
    load_needs,
    require_detect_change_outputs,
    require_skipped,
    require_success,
)


APP_PREREQUISITE_JOBS = (
    "lint",
    "typecheck-app",
    "typecheck-node",
    "test-node",
    "test-browser",
    "test-storybook-meta",
)


def main() -> int:
    try:
        needs = load_needs()
    except ValueError as exc:
        return fail(f"error: {exc}")
    except json.JSONDecodeError as exc:
        return fail(f"error: NEEDS_JSON is not valid JSON: {exc}")

    failures: list[str] = []

    require_success(needs, failures, "detect-changes", "change detection is always required")
    _content_required, app_required, build_required = require_detect_change_outputs(
        needs,
        failures,
    )

    for job in APP_PREREQUISITE_JOBS:
        if app_required:
            require_success(needs, failures, job, "app=true requires app prerequisite checks")
        else:
            require_skipped(needs, failures, job, "app=false must skip app prerequisite checks")

    if build_required:
        require_success(needs, failures, "test-ssr", "build=true requires SSR tests")
    else:
        require_skipped(needs, failures, "test-ssr", "build=false must skip SSR tests")

    if failures:
        print("Prebuild CI contract violations:")
        for failure in failures:
            print(f"- {failure}")
        return 1

    print("Prebuild CI contract passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
