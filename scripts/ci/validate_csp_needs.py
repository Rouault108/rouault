from __future__ import annotations

import json
from needs_contract import fail, load_needs, require_detect_change_outputs, require_skipped, require_success


def main() -> int:
    try:
        needs = load_needs()
    except (ValueError, json.JSONDecodeError):
        return fail("CSP needs evidence is missing or invalid")
    failures: list[str] = []
    require_success(needs, failures, "detect-changes", "change detection is required")
    _content, _app, build = require_detect_change_outputs(needs, failures)
    if build:
        require_success(needs, failures, "test-csp", "build=true requires all CSP engines and mandatory coverage")
    else:
        require_skipped(needs, failures, "test-csp", "build=false must skip CSP matrix")
    if failures:
        for failure in failures:
            print(f"CSP coverage gate: {failure}")
        return 1
    print("CSP coverage gate passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
