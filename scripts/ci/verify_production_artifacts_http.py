#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


def normalize_base_path(value: str | None) -> str:
    if value is None or value == "" or value == "/":
        return ""
    if not value.startswith("/"):
        raise ValueError("ROUAULT_BASE_PATH must be empty or start with /.")
    return value.rstrip("/")


def join_url(origin: str, base_path: str, pathname: str) -> str:
    return urllib.parse.urljoin(origin.rstrip("/") + "/", f"{base_path}{pathname}".lstrip("/"))


def fetch(url: str) -> tuple[int, str, bytes]:
    request = urllib.request.Request(url, headers={"User-Agent": "rouault-artifact-verifier"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            return response.status, response.headers.get("content-type", ""), response.read()
    except urllib.error.HTTPError as error:
        return error.code, error.headers.get("content-type", ""), error.read()


def assert_json_artifact(url: str, *, require_array: bool = False, require_non_empty: bool = False) -> None:
    status, content_type, body = fetch(url)
    if status != 200:
        raise AssertionError(f"{url}: expected HTTP 200, got {status}")
    if "json" not in content_type.lower():
        raise AssertionError(f"{url}: expected JSON Content-Type, got {content_type!r}")
    payload = json.loads(body.decode("utf-8"))
    if require_array and not isinstance(payload, list):
        raise AssertionError(f"{url}: expected top-level JSON array")
    if require_non_empty and isinstance(payload, list) and len(payload) == 0:
        raise AssertionError(f"{url}: expected non-empty JSON array")


def assert_javascript_artifact(url: str) -> None:
    status, content_type, body = fetch(url)
    if status != 200:
        raise AssertionError(f"{url}: expected HTTP 200, got {status}")
    normalized = content_type.split(";", 1)[0].strip().lower()
    if normalized not in {
        "text/javascript",
        "application/javascript",
        "text/ecmascript",
        "application/ecmascript",
    }:
        raise AssertionError(f"{url}: expected JavaScript Content-Type, got {content_type!r}")
    if len(body) == 0:
        raise AssertionError(f"{url}: expected non-empty body")


def main() -> int:
    origin = (os.environ.get("ACTUAL_DEPLOYMENT_URL") or os.environ.get("ROUAULT_SITE_ORIGIN") or "").strip()
    if origin == "":
        print("ACTUAL_DEPLOYMENT_URL or ROUAULT_SITE_ORIGIN is required.", file=sys.stderr)
        return 1

    base_path = normalize_base_path(os.environ.get("ROUAULT_BASE_PATH"))
    artifacts = {
        "search_catalog": join_url(origin, base_path, "/search-catalog.json"),
        "route_manifest": join_url(origin, base_path, "/assets/internal-document-routes.json"),
        "pagefind_js": join_url(origin, base_path, "/pagefind/pagefind.js"),
        "pagefind_entry": join_url(origin, base_path, "/pagefind/pagefind-entry.json"),
    }

    assert_json_artifact(artifacts["search_catalog"], require_array=True, require_non_empty=True)
    assert_json_artifact(artifacts["route_manifest"])
    assert_javascript_artifact(artifacts["pagefind_js"])
    assert_json_artifact(artifacts["pagefind_entry"])

    print("Production runtime artifacts are reachable over HTTP:")
    for url in artifacts.values():
        print(f"- {url}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"production artifact HTTP verification failed: {error}", file=sys.stderr)
        raise SystemExit(1)
