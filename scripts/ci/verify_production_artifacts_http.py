#!/usr/bin/env python3
from __future__ import annotations

import json
import hashlib
import os
import re
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


def assert_json_artifact(url: str, *, require_array: bool = False, require_non_empty: bool = False) -> object:
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
    return payload


def assert_lexical_descriptor(origin: str, base_path: str, descriptor: object) -> str:
    if not isinstance(descriptor, dict):
        raise AssertionError("expected lexical artifact descriptor")
    pathname = descriptor.get("path")
    digest = descriptor.get("sha256")
    size = descriptor.get("bytes")
    # manifestの任意URLを取得せず、同じ配信先のhash付き検索資産だけを検査する。
    if (not isinstance(pathname, str) or
            re.fullmatch(r"/search/[A-Za-z0-9_-]+\.[0-9a-f]{64}\.(json|wasm)", pathname) is None or
            not isinstance(digest, str) or re.fullmatch(r"[0-9a-f]{64}", digest) is None or
            type(size) is not int or size <= 0 or f".{digest}." not in pathname):
        raise AssertionError("invalid lexical artifact descriptor")
    url = join_url(origin, base_path, pathname)
    status, content_type, body = fetch(url)
    if status != 200:
        raise AssertionError(f"{url}: expected HTTP 200, got {status}")
    normalized = content_type.split(";", 1)[0].strip().lower()
    expected_type = "application/wasm" if pathname.endswith(".wasm") else "application/json"
    if normalized != expected_type:
        raise AssertionError(f"{url}: expected {expected_type}, got {content_type!r}")
    if len(body) != size or hashlib.sha256(body).hexdigest() != digest:
        raise AssertionError(f"{url}: artifact byte identity mismatch")
    if pathname.endswith(".json"):
        json.loads(body.decode("utf-8"))
    return url


def main() -> int:
    configured_origin = (os.environ.get("ROUAULT_SITE_ORIGIN") or "").strip()
    if configured_origin == "":
        print("ROUAULT_SITE_ORIGIN is required.", file=sys.stderr)
        return 1

    origin = (os.environ.get("ACTUAL_DEPLOYMENT_URL") or configured_origin).strip()
    if origin == "":
        print("ACTUAL_DEPLOYMENT_URL or ROUAULT_SITE_ORIGIN is required.", file=sys.stderr)
        return 1

    base_path = normalize_base_path(os.environ.get("ROUAULT_BASE_PATH"))
    artifacts = {
        "search_catalog": join_url(origin, base_path, "/search-catalog.json"),
        "route_manifest": join_url(origin, base_path, "/assets/internal-document-routes.json"),
        "lexical_manifest": join_url(origin, base_path, "/search/manifest.json"),
    }

    assert_json_artifact(artifacts["search_catalog"], require_array=True, require_non_empty=True)
    assert_json_artifact(artifacts["route_manifest"])
    manifest = assert_json_artifact(artifacts["lexical_manifest"])
    if not isinstance(manifest, dict) or manifest.get("schemaVersion") != 2:
        raise AssertionError("invalid lexical manifest schema")
    for key in ("documentIndex", "passageIndex", "passageStore", "providerArtifact", "providerConfig"):
        artifacts[key] = assert_lexical_descriptor(origin, base_path, manifest.get(key))

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
