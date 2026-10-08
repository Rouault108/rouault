#!/usr/bin/env python3
from __future__ import annotations

import json
import hashlib
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
import urllib.error
import urllib.parse
import urllib.request


MAX_JSON_BYTES = 8 * 1024 * 1024
MAX_HTML_BYTES = 8 * 1024 * 1024
ROUTE_WORKERS = 8


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, file_pointer, code, message, headers, new_url):
        return None


HTTP_OPENER = urllib.request.build_opener(NoRedirectHandler())


class BuildMetadataParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.values: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "meta":
            return
        attributes = dict(attrs)
        name = attributes.get("name")
        content = attributes.get("content")
        if isinstance(name, str) and isinstance(content, str):
            self.values[name] = content


def normalize_base_path(value: str | None) -> str:
    if value is None or value == "" or value == "/":
        return ""
    if not value.startswith("/"):
        raise ValueError("ROUAULT_BASE_PATH must be empty or start with /.")
    return value.rstrip("/")


def join_url(origin: str, base_path: str, pathname: str) -> str:
    return urllib.parse.urljoin(origin.rstrip("/") + "/", f"{base_path}{pathname}".lstrip("/"))


def read_limited(response, max_bytes: int) -> bytes:
    body = response.read(max_bytes + 1)
    if len(body) > max_bytes:
        raise AssertionError(f"[content] response exceeded {max_bytes} bytes")
    return body


def fetch(url: str, *, max_bytes: int) -> tuple[int, str, bytes, str | None]:
    request = urllib.request.Request(url, headers={"User-Agent": "rouault-artifact-verifier"})
    try:
        with HTTP_OPENER.open(request, timeout=20) as response:
            return (
                response.status,
                response.headers.get("content-type", ""),
                read_limited(response, max_bytes),
                response.headers.get("location"),
            )
    except urllib.error.HTTPError as error:
        return (
            error.code,
            error.headers.get("content-type", ""),
            read_limited(error, max_bytes),
            error.headers.get("location"),
        )
    except urllib.error.URLError as error:
        raise AssertionError(f"[unavailable] {url}: {error.reason}") from error


def assert_http_200(url: str, status: int, location: str | None) -> None:
    if 300 <= status < 400:
        raise AssertionError(
            f"[redirect] {url}: expected direct HTTP 200, got {status} Location={location!r}"
        )
    if status != 200:
        raise AssertionError(f"[unavailable] {url}: expected HTTP 200, got {status}")


def assert_json_artifact(url: str, *, require_array: bool = False, require_non_empty: bool = False) -> object:
    status, content_type, body, location = fetch(url, max_bytes=MAX_JSON_BYTES)
    assert_http_200(url, status, location)
    if "json" not in content_type.lower():
        raise AssertionError(f"[content] {url}: expected JSON Content-Type, got {content_type!r}")
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise AssertionError(f"[content] {url}: invalid UTF-8 JSON") from error
    if require_array and not isinstance(payload, list):
        raise AssertionError(f"[content] {url}: expected top-level JSON array")
    if require_non_empty and isinstance(payload, list) and len(payload) == 0:
        raise AssertionError(f"[content] {url}: expected non-empty JSON array")
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
    status, content_type, body, location = fetch(url, max_bytes=size)
    assert_http_200(url, status, location)
    normalized = content_type.split(";", 1)[0].strip().lower()
    expected_type = "application/wasm" if pathname.endswith(".wasm") else "application/json"
    if normalized != expected_type:
        raise AssertionError(f"{url}: expected {expected_type}, got {content_type!r}")
    if len(body) != size or hashlib.sha256(body).hexdigest() != digest:
        raise AssertionError(f"{url}: artifact byte identity mismatch")
    if pathname.endswith(".json"):
        json.loads(body.decode("utf-8"))
    return url


def router_artifact_pathname(route: str) -> str:
    if route == "/":
        return "/__router/index.router.json"
    return f"/__router{route.rstrip('/')}/index.router.json"


def validate_route_manifest(payload: object) -> tuple[list[str], str, str]:
    if not isinstance(payload, dict) or payload.get("version") != 1:
        raise AssertionError("[manifest] invalid internal document route manifest schema")
    routes = payload.get("routes")
    build_id = payload.get("buildId")
    generated_at = payload.get("generatedAt")
    if (
        not isinstance(routes, list)
        or len(routes) == 0
        or not all(isinstance(route, str) and route.startswith("/") for route in routes)
        or len(set(routes)) != len(routes)
    ):
        raise AssertionError("[manifest] routes must be a non-empty unique pathname array")
    if not isinstance(build_id, str) or build_id.strip() == "":
        raise AssertionError("[manifest] buildId is required")
    if not isinstance(generated_at, str) or generated_at.strip() == "":
        raise AssertionError("[manifest] generatedAt is required")
    return routes, build_id, generated_at


def assert_document_route(
    origin: str,
    base_path: str,
    route: str,
    build_id: str,
    generated_at: str,
) -> tuple[str, str]:
    page_url = join_url(origin, base_path, route)
    status, content_type, body, location = fetch(page_url, max_bytes=MAX_HTML_BYTES)
    assert_http_200(page_url, status, location)
    if "text/html" not in content_type.lower():
        raise AssertionError(
            f"[content] {page_url}: expected HTML Content-Type, got {content_type!r}"
        )
    try:
        html = body.decode("utf-8")
    except UnicodeDecodeError as error:
        raise AssertionError(f"[content] {page_url}: invalid UTF-8 HTML") from error
    parser = BuildMetadataParser()
    parser.feed(html)
    if parser.values.get("rouault-build-id") != build_id:
        raise AssertionError(f"[manifest] {page_url}: HTML buildId differs from route manifest")
    if parser.values.get("rouault-generated-at") != generated_at:
        raise AssertionError(f"[manifest] {page_url}: HTML generatedAt differs from route manifest")

    router_url = join_url(origin, base_path, router_artifact_pathname(route))
    payload = assert_json_artifact(router_url)
    if not isinstance(payload, dict):
        raise AssertionError(f"[content] {router_url}: expected top-level JSON object")
    if payload.get("buildId") != build_id or payload.get("generatedAt") != generated_at:
        raise AssertionError(f"[manifest] {router_url}: build metadata differs from route manifest")
    return page_url, router_url


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
    route_manifest = assert_json_artifact(artifacts["route_manifest"])
    routes, build_id, generated_at = validate_route_manifest(route_manifest)
    manifest = assert_json_artifact(artifacts["lexical_manifest"])
    if not isinstance(manifest, dict) or manifest.get("schemaVersion") != 2:
        raise AssertionError("invalid lexical manifest schema")
    for key in ("documentIndex", "passageIndex", "passageStore", "providerArtifact", "providerConfig"):
        artifacts[key] = assert_lexical_descriptor(origin, base_path, manifest.get(key))

    with ThreadPoolExecutor(max_workers=ROUTE_WORKERS) as executor:
        route_results = list(
            executor.map(
                lambda route: assert_document_route(
                    origin, base_path, route, build_id, generated_at
                ),
                routes,
            )
        )

    print(
        "Production runtime artifacts and manifest routes are directly reachable over HTTP "
        f"(routes={len(route_results)}, buildId={build_id}, generatedAt={generated_at}):"
    )
    for url in artifacts.values():
        print(f"- {url}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"production artifact HTTP verification failed: {error}", file=sys.stderr)
        raise SystemExit(1)
