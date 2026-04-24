#!/usr/bin/env python3

from __future__ import annotations

import os
import sys

from change_detection import (
    changed_files,
    classification_outputs,
    classify_files,
    ensure_object_available,
    full_run_outputs,
    read_event_payload,
    resolve_diff_range,
)


def log(message: str) -> None:
    print(message, file=sys.stderr)


def write_outputs(outputs: dict[str, bool]) -> None:
    lines = [f"{key}={'true' if value else 'false'}" for key, value in outputs.items()]

    github_output = os.getenv("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as fh:
            for line in lines:
                fh.write(f"{line}\n")
        return

    for line in lines:
        print(line)


def main() -> int:
    event_name = os.getenv("GITHUB_EVENT_NAME", "")

    if event_name == "workflow_dispatch":
        log("manual dispatch: force full run")
        write_outputs(full_run_outputs())
        return 0

    try:
        payload = read_event_payload(os.getenv("GITHUB_EVENT_PATH"))
        diff_range = resolve_diff_range(event_name, payload)

        if diff_range.reason:
            log(diff_range.reason)

        if not ensure_object_available(diff_range.head):
            log(f"error: failed to resolve head object: {diff_range.head}")
            return 1

        if not ensure_object_available(diff_range.base):
            log(f"warning: failed to resolve base object: {diff_range.base}; force full run")
            write_outputs(full_run_outputs())
            return 0

        log(f"base SHA: {diff_range.base}")
        log(f"head SHA: {diff_range.head}")

        files = changed_files(diff_range.base, diff_range.head)
        log("Changed files:")
        if files:
            for file in files:
                log(file)
        else:
            log("(none)")

        classification = classify_files(files)
        outputs = classification_outputs(classification)
        write_outputs(outputs)

        if classification.reasons:
            log("Classification reasons:")
            for reason in classification.reasons:
                log(reason)

        log(
            "classified outputs: "
            + ", ".join(
                f"{key}={'true' if value else 'false'}" for key, value in outputs.items()
            )
        )
        return 0
    except RuntimeError as exc:
        log(f"error: {exc}")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
