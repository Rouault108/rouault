#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import subprocess
import sys
from fnmatch import fnmatch
from pathlib import Path
from typing import Any


def log(message: str) -> None:
    print(message, file=sys.stderr)


def run_git(*args: str, text: bool = True) -> str | bytes:
    completed = subprocess.run(
        ["git", *args],
        check=True,
        capture_output=True,
        text=text,
    )
    return completed.stdout


def read_event_payload() -> dict[str, Any]:
    event_path = os.getenv("GITHUB_EVENT_PATH")
    if not event_path:
      return {}

    path = Path(event_path)
    if not path.exists():
        return {}

    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        log(f"warning: failed to parse GITHUB_EVENT_PATH: {exc}")
        return {}


def resolve_shas() -> tuple[str, str]:
    event_name = os.getenv("GITHUB_EVENT_NAME", "")
    payload = read_event_payload()

    if event_name == "pull_request":
        pull_request = payload.get("pull_request", {})
        base_sha = str(pull_request.get("base", {}).get("sha", "") or "")
        head_sha = str(pull_request.get("head", {}).get("sha", "") or "")
        return base_sha, head_sha

    base_sha = os.getenv("GITHUB_BEFORE", "")
    head_sha = os.getenv("GITHUB_SHA", "")

    if not head_sha:
        head_sha = str(run_git("rev-parse", "HEAD")).strip()

    return base_sha, head_sha


def normalize_base_sha(base_sha: str, head_sha: str) -> str:
    if base_sha and base_sha != "0000000000000000000000000000000000000000":
        return base_sha

    root_commit = str(run_git("rev-list", "--max-parents=0", head_sha)).splitlines()[-1].strip()
    return root_commit


def changed_files(base_sha: str, head_sha: str) -> list[str]:
    raw = run_git("diff", "-z", "--name-only", base_sha, head_sha, text=False)
    assert isinstance(raw, (bytes, bytearray))
    files = [chunk.decode("utf-8", errors="replace") for chunk in raw.split(b"\0") if chunk]
    return sorted(files)


def classify(files: list[str]) -> dict[str, bool]:
    content = False
    app = False
    build = False

    app_patterns = (
        "src/*",
        "build/*",
        "shared/*",
        "types/*",
        "scripts/*",
        "test/*",
        ".storybook/*",
        ".github/workflows/*",
        ".github/actions/*",
        "package.json",
        "pnpm-lock.yaml",
        "tsconfig*.json",
        "*.config.ts",
        "*.config.mjs",
        ".node-version",
        ".npmrc",
    )

    for file in files:
        if fnmatch(file, "content/*"):
            content = True
            build = True

        if any(fnmatch(file, pattern) for pattern in app_patterns):
            app = True
            build = True

        if file in {"eleventy.config.ts", "velite.config.ts"}:
            content = True
            app = True
            build = True

        if file in {"_headers", "_redirects", "wrangler.jsonc"}:
            build = True

    return {
        "content": content,
        "app": app,
        "build": build,
    }


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
        write_outputs(
            {
                "content": True,
                "app": True,
                "build": True,
            }
        )
        return 0

    base_sha, head_sha = resolve_shas()

    if not head_sha:
        log("error: failed to resolve head SHA")
        return 1

    base_sha = normalize_base_sha(base_sha, head_sha)

    log(f"base SHA: {base_sha}")
    log(f"head SHA: {head_sha}")

    files = changed_files(base_sha, head_sha)

    log("Changed files:")
    if files:
        for file in files:
            log(file)
    else:
        log("(none)")

    outputs = classify(files)
    write_outputs(outputs)

    log(
        "classified outputs: "
        + ", ".join(f"{key}={'true' if value else 'false'}" for key, value in outputs.items())
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())