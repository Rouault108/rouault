from __future__ import annotations

from pathlib import Path


WORKFLOW_PATH = Path(".github/workflows/ci-cd.yml")


def _line_index(lines: list[str], needle: str) -> int:
    for index, line in enumerate(lines):
        if needle in line:
            return index
    return -1


def _job_block(source: str, job_name: str) -> str:
    marker = f"  {job_name}:\n"
    start = source.find(marker)
    if start < 0:
        raise ValueError(f"{job_name} job was not found")

    next_job = source.find("\n  ", start + len(marker))
    while next_job >= 0:
        next_line_end = source.find("\n", next_job + 1)
        line = source[next_job + 1 : next_line_end if next_line_end >= 0 else len(source)]
        if line.startswith("  ") and not line.startswith("    ") and line.endswith(":"):
            return source[start:next_job]
        next_job = source.find("\n  ", next_job + 1)

    return source[start:]


def validate_workflow(source: str) -> list[str]:
    failures: list[str] = []

    try:
        build_production = _job_block(source, "build-production")
    except ValueError as error:
        return [str(error)]

    required_snippets = {
        "REPOSITORY_ROUAULT_SITE_ORIGIN": "REPOSITORY_ROUAULT_SITE_ORIGIN: ${{ vars.ROUAULT_SITE_ORIGIN }}",
        "REPOSITORY_ROUAULT_BASE_PATH": "REPOSITORY_ROUAULT_BASE_PATH: ${{ vars.ROUAULT_BASE_PATH }}",
        "main required branch": '[[ "${GITHUB_EVENT_NAME}" == "push" && "${GITHUB_REF}" == "refs/heads/main" ]]',
        "main missing failure": "ROUAULT_SITE_ORIGIN is required for main production deployment builds.",
        "ci fallback origin": "http://127.0.0.1:4173",
        "base path export": "ROUAULT_BASE_PATH=${REPOSITORY_ROUAULT_BASE_PATH:-}",
    }
    for label, snippet in required_snippets.items():
        if snippet not in build_production:
            failures.append(f"build-production job is missing {label}")

    lines = build_production.splitlines()
    resolve_step = _line_index(lines, "resolve production build site URL context")
    build_step = _line_index(lines, "pnpm build:production")
    if resolve_step < 0:
        failures.append("build-production job is missing production site URL context resolution step")
    if build_step < 0:
        failures.append("build-production job is missing pnpm build:production step")
    if resolve_step >= 0 and build_step >= 0 and resolve_step > build_step:
        failures.append("production site URL context resolution step must run before pnpm build:production")

    return failures


def main() -> int:
    failures = validate_workflow(WORKFLOW_PATH.read_text(encoding="utf-8"))
    for failure in failures:
        print(failure)
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
