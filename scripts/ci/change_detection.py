from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from fnmatch import fnmatch
from pathlib import Path
from typing import Any

ALL_ZERO_SHA = "0000000000000000000000000000000000000000"
EMPTY_TREE_SHA = "4b825dc642cb6eb9a060e54bf8d69288fbee4904"


@dataclass(frozen=True)
class DiffRange:
    base: str
    head: str
    full_run: bool = False
    reason: str = ""


@dataclass(frozen=True)
class Classification:
    content: bool
    app: bool
    build: bool
    reasons: tuple[str, ...]


IGNORED_EXACT = {"README.md", "LICENSE", "AGENTS.md"}

IGNORED_PREFIXES = ("docs/",)

CONTENT_PREFIXES = ("content/",)

APP_PREFIXES = (
    "src/",
    "build/",
    "shared/",
    "types/",
    "scripts/",
    "test/",
    ".storybook/",
    ".github/",
)

APP_EXACT = {
    "package.json",
    "pnpm-lock.yaml",
    ".node-version",
    ".npmrc",
    ".prettierrc",
    ".prettierignore",
}

APP_GLOBS = (
    "tsconfig*.json",
    "*.config.ts",
    "*.config.mjs",
)

CONTENT_APP_EXACT = {
    "eleventy.config.ts",
    "velite.config.ts",
}

BUILD_ONLY_EXACT = {
    "_headers",
    "_redirects",
    "wrangler.jsonc",
}


def run_git(*args: str, text: bool = True) -> str | bytes:
    completed = subprocess.run(
        ["git", *args],
        check=True,
        capture_output=True,
        text=text,
    )
    return completed.stdout


def read_event_payload(event_path: str | None) -> dict[str, Any]:
    if not event_path:
        return {}

    path = Path(event_path)
    if not path.exists():
        return {}

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"failed to parse GITHUB_EVENT_PATH: {exc}") from exc

    if not isinstance(payload, dict):
        raise RuntimeError("GITHUB_EVENT_PATH payload must be a JSON object")

    return payload


def resolve_diff_range(event_name: str, payload: dict[str, Any]) -> DiffRange:
    if event_name == "pull_request":
        pull_request = _dict_value(payload, "pull_request")
        base = _dict_value(_dict_value(pull_request, "base"), "sha")
        head = _dict_value(_dict_value(pull_request, "head"), "sha")

        base_sha = _string_value(base)
        head_sha = _string_value(head)

        if not base_sha:
            raise RuntimeError("failed to resolve pull_request base SHA")

        if not head_sha:
            raise RuntimeError("failed to resolve pull_request head SHA")

        try:
            merge_base = str(run_git("merge-base", base_sha, head_sha)).strip()
        except subprocess.CalledProcessError as exc:
            raise RuntimeError("failed to resolve pull_request merge-base") from exc

        if not merge_base:
            raise RuntimeError("failed to resolve pull_request merge-base")

        return DiffRange(base=merge_base, head=head_sha)

    if event_name == "push":
        before = _string_value(payload.get("before"))
        after = _string_value(payload.get("after"))

        if not after:
            raise RuntimeError("failed to resolve push after SHA")

        if not before:
            raise RuntimeError("failed to resolve push before SHA")

        if before == ALL_ZERO_SHA:
            return DiffRange(
                base=EMPTY_TREE_SHA,
                head=after,
                reason="push before is all-zero; using empty tree as base",
            )

        return DiffRange(base=before, head=after)

    raise RuntimeError(f"unsupported event for diff range: {event_name}")


def object_exists(rev: str) -> bool:
    try:
        run_git("cat-file", "-e", f"{rev}^{{object}}")
    except subprocess.CalledProcessError:
        return False

    return True


def ensure_object_available(rev: str) -> bool:
    if rev == EMPTY_TREE_SHA:
        return True

    if object_exists(rev):
        return True

    try:
        run_git("fetch", "--no-tags", "--prune", "origin", rev)
    except subprocess.CalledProcessError:
        return False

    return object_exists(rev)


def changed_files(base_sha: str, head_sha: str) -> list[str]:
    raw = run_git("diff", "-z", "--name-only", base_sha, head_sha, text=False)
    assert isinstance(raw, (bytes, bytearray))
    files = [
        chunk.decode("utf-8", errors="replace") for chunk in raw.split(b"\0") if chunk
    ]
    return sorted(files)


def classify_files(files: list[str]) -> Classification:
    content = False
    app = False
    build = False
    reasons: list[str] = []

    for file in files:
        result = classify_one(file)
        content = content or result.content
        app = app or result.app
        build = build or result.build
        reasons.extend(result.reasons)

    return Classification(
        content=content,
        app=app,
        build=build,
        reasons=tuple(reasons),
    )


def classify_one(file: str) -> Classification:
    if _is_ignored(file):
        return Classification(False, False, False, (f"{file}: ignored",))

    if file in CONTENT_APP_EXACT:
        return Classification(
            True,
            True,
            True,
            (f"{file}: content app config -> content=true, app=true, build=true",),
        )

    if _has_prefix(file, CONTENT_PREFIXES):
        return Classification(
            True,
            False,
            True,
            (f"{file}: content -> content=true, build=true",),
        )

    if _is_app_path(file):
        return Classification(
            False,
            True,
            True,
            (f"{file}: app/tooling/config -> app=true, build=true",),
        )

    if file in BUILD_ONLY_EXACT:
        return Classification(
            False,
            False,
            True,
            (f"{file}: build-only -> build=true",),
        )

    return Classification(
        False,
        True,
        True,
        (f"{file}: unknown -> app=true, build=true",),
    )


def full_run_outputs() -> dict[str, bool]:
    return {
        "content": True,
        "app": True,
        "build": True,
    }


def classification_outputs(classification: Classification) -> dict[str, bool]:
    return {
        "content": classification.content,
        "app": classification.app,
        "build": classification.build,
    }


def _is_ignored(file: str) -> bool:
    return file in IGNORED_EXACT or _has_prefix(file, IGNORED_PREFIXES)


def _is_app_path(file: str) -> bool:
    if file in APP_EXACT:
        return True

    if _has_prefix(file, APP_PREFIXES):
        return True

    return any(fnmatch(file, pattern) for pattern in APP_GLOBS)


def _has_prefix(file: str, prefixes: tuple[str, ...]) -> bool:
    return any(file.startswith(prefix) for prefix in prefixes)


def _dict_value(value: object, key: str) -> object:
    if not isinstance(value, dict):
        return ""

    return value.get(key, "")


def _string_value(value: object) -> str:
    if value is None:
        return ""

    return str(value)
