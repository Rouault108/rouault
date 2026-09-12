#!/usr/bin/env python3
"""Validate Rouault workflow JSON artifacts.

This minimal validator combines JSON Schema Draft 2020-12 validation with
semantic checks that are cross-field, cross-array, or intentionally kept outside
JSON Schema.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Literal

from jsonschema import Draft202012Validator, FormatChecker
from jsonschema.exceptions import ValidationError

ValidationMode = Literal["structural", "completion"]

RELATED_ID_FIELDS: tuple[tuple[str, str], ...] = (
    ("related_failure_id", "Failure"),
    ("related_cause_id", "Cause"),
    ("related_change_id", "Change"),
    ("related_success_id", "Success"),
    ("related_verification_id", "Verification"),
)

ALLOWED_NECESSITY_RESULTS: dict[str, set[str]] = {
    "required": {"required"},
    "conditional": {"conditional-activated", "conditional-not-activated"},
    "optional": {"optional-executed", "optional-not-run"},
}

EVENT_CLASS_TRANSITION_RULES: dict[str, set[tuple[str, str]]] = {
    "initialization": {("N/A", "planned")},
    "progress": {("planned", "ready"), ("ready", "in-progress")},
    "transition": {("ready", "blocked"), ("in-progress", "blocked"), ("blocked", "ready")},
    "outcome": {("in-progress", "passed"), ("in-progress", "failed")},
    "retirement": {
        ("planned", "cancelled"),
        ("ready", "cancelled"),
        ("in-progress", "cancelled"),
        ("blocked", "cancelled"),
        ("passed", "superseded"),
        ("failed", "superseded"),
    },
}

ALLOWED_STATUS_TRANSITIONS: set[tuple[str, str]] = set().union(*EVENT_CLASS_TRANSITION_RULES.values())
STRUCTURAL_TERMINAL_STATUSES: set[str] = {"cancelled", "superseded"}
COMPLETION_INCOMPLETE_STATUSES: set[str] = {"planned", "ready", "in-progress", "blocked", "failed"}
COMPLETION_PASS_RESULTS: set[str] = {"required", "conditional-activated", "optional-executed"}
COMPLETION_CANCEL_RESULTS: set[str] = {"conditional-not-activated", "optional-not-run"}
SUPERSEDED_REASON_MARKERS: tuple[str, ...] = ("superseded by", "replaced by", "replacement")
REPLACEMENT_PHASE_ID_RE = re.compile(r"\bR4P-[A-Za-z0-9._-]+(?:-[A-Za-z0-9._-]+)*\b")
ISSUE_INCOMPLETE_REFERENCE_RE = re.compile(r"\bIssue incomplete:\s*[A-Za-z0-9._-]+\b", re.IGNORECASE)
ISSUE_INCOMPLETE_GENERIC_RE = re.compile(r"\b(?:issue incomplete|issue-incomplete|incomplete issue|unresolved issue)\b", re.IGNORECASE)
VALIDATION_MODES: set[str] = {"structural", "completion"}



@dataclass(frozen=True)
class ValidationIssue:
    path: str
    message: str

    def format(self) -> str:
        return f"{self.path}: {self.message}"


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"{path}: JSON parse failed: {exc}") from exc


def display_path(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def json_path(error: ValidationError) -> str:
    if not error.path:
        return "$"
    return "$" + "".join(f"[{part!r}]" if isinstance(part, int) else f".{part}" for part in error.path)


def schema_issues(schema: dict[str, Any], instance: Any) -> list[ValidationIssue]:
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    return [
        ValidationIssue(json_path(error), error.message)
        for error in sorted(validator.iter_errors(instance), key=lambda err: list(err.path))
    ]


def require_unique(values: Iterable[str], label: str, base_path: str) -> list[ValidationIssue]:
    seen: set[str] = set()
    issues: list[ValidationIssue] = []
    for value in values:
        if value in seen:
            issues.append(ValidationIssue(base_path, f"duplicate {label}: {value}"))
        seen.add(value)
    return issues


def superseded_grounding_parts(event: dict[str, Any]) -> tuple[bool, list[str], bool, bool]:
    """Return superseded grounding signals from an execution event reason.

    A grounded superseded event must have a replacement marker plus either a
    concrete replacement phase ID or a concrete Issue incomplete reference.
    Generic prose such as "Issue incomplete" is intentionally insufficient.
    """
    reason = event.get("reason")
    if not isinstance(reason, str):
        return (False, [], False, False)
    normalized = reason.lower()
    has_marker = any(marker in normalized for marker in SUPERSEDED_REASON_MARKERS)
    replacement_phase_ids = list(dict.fromkeys(REPLACEMENT_PHASE_ID_RE.findall(reason)))
    has_issue_incomplete_reference = bool(ISSUE_INCOMPLETE_REFERENCE_RE.search(reason))
    has_generic_issue_incomplete = bool(ISSUE_INCOMPLETE_GENERIC_RE.search(reason))
    return (has_marker, replacement_phase_ids, has_issue_incomplete_reference, has_generic_issue_incomplete)


def has_superseded_grounding(event: dict[str, Any]) -> bool:
    has_marker, replacement_phase_ids, has_issue_incomplete_reference, _ = superseded_grounding_parts(event)
    return has_marker and (bool(replacement_phase_ids) or has_issue_incomplete_reference)


def parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def semantic_issues(schema_name: str, instance: Any, mode: ValidationMode) -> list[ValidationIssue]:
    if schema_name == "r4-execution-ledger.schema.json":
        return semantic_issues_r4_execution_ledger(instance, mode)
    return []


def semantic_issues_r4_execution_ledger(instance: dict[str, Any], mode: ValidationMode) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []

    phase_evidence_map = instance.get("phase_evidence_map", [])
    phase_execution_event_log = instance.get("phase_execution_event_log", [])
    phase_necessity_evaluation_log = instance.get("phase_necessity_evaluation_log", [])
    artifact_validation_attestations = instance.get("artifact_validation_attestations", [])

    phase_ids = [entry.get("qualified_phase_id") for entry in phase_evidence_map if isinstance(entry, dict)]
    event_phase_ids = [event.get("qualified_phase_id") for event in phase_execution_event_log if isinstance(event, dict)]
    necessity_phase_ids = [event.get("qualified_phase_id") for event in phase_necessity_evaluation_log if isinstance(event, dict)]

    issues.extend(require_unique([v for v in phase_ids if isinstance(v, str)], "phase_evidence_map.qualified_phase_id", "$.phase_evidence_map"))
    issues.extend(require_unique([event.get("event_id") for event in phase_execution_event_log if isinstance(event, dict) and isinstance(event.get("event_id"), str)], "event_id", "$.phase_execution_event_log"))
    issues.extend(require_unique([event.get("evaluation_event_id") for event in phase_necessity_evaluation_log if isinstance(event, dict) and isinstance(event.get("evaluation_event_id"), str)], "evaluation_event_id", "$.phase_necessity_evaluation_log"))
    issues.extend(require_unique([att.get("attestation_id") for att in artifact_validation_attestations if isinstance(att, dict) and isinstance(att.get("attestation_id"), str)], "attestation_id", "$.artifact_validation_attestations"))

    phase_id_set = {v for v in phase_ids if isinstance(v, str)}
    for index, phase_id in enumerate(event_phase_ids):
        if isinstance(phase_id, str) and phase_id not in phase_id_set:
            issues.append(ValidationIssue(f"$.phase_execution_event_log[{index}].qualified_phase_id", f"phase ID is not present in phase_evidence_map: {phase_id}"))
    for index, phase_id in enumerate(necessity_phase_ids):
        if isinstance(phase_id, str) and phase_id not in phase_id_set:
            issues.append(ValidationIssue(f"$.phase_necessity_evaluation_log[{index}].qualified_phase_id", f"phase ID is not present in phase_evidence_map: {phase_id}"))

    for index, event in enumerate(phase_necessity_evaluation_log):
        if not isinstance(event, dict):
            continue
        necessity = event.get("necessity")
        evaluation_result = event.get("evaluation_result")
        if isinstance(necessity, str) and isinstance(evaluation_result, str):
            allowed_results = ALLOWED_NECESSITY_RESULTS.get(necessity, set())
            if evaluation_result not in allowed_results:
                issues.append(
                    ValidationIssue(
                        f"$.phase_necessity_evaluation_log[{index}].evaluation_result",
                        f"evaluation_result {evaluation_result} is not allowed for necessity {necessity}",
                    )
                )

    issues.extend(necessity_evaluation_chronology_issues(phase_necessity_evaluation_log))

    events_by_phase: dict[str, list[tuple[int, dict[str, Any]]]] = {}
    for index, event in enumerate(phase_execution_event_log):
        if not isinstance(event, dict):
            continue
        from_status = event.get("from_status")
        to_status = event.get("to_status")
        event_class = event.get("event_class")
        if isinstance(from_status, str) and isinstance(to_status, str):
            transition = (from_status, to_status)
            if transition not in ALLOWED_STATUS_TRANSITIONS:
                issues.append(
                    ValidationIssue(
                        f"$.phase_execution_event_log[{index}].to_status",
                        f"status transition {from_status} -> {to_status} is not allowed",
                    )
                )
            if isinstance(event_class, str):
                class_allowed = EVENT_CLASS_TRANSITION_RULES.get(event_class)
                if class_allowed is not None and transition not in class_allowed:
                    issues.append(
                        ValidationIssue(
                            f"$.phase_execution_event_log[{index}].event_class",
                            f"event_class {event_class} does not allow transition {from_status} -> {to_status}",
                        )
                    )
        phase_id = event.get("qualified_phase_id")
        if isinstance(phase_id, str):
            events_by_phase.setdefault(phase_id, []).append((index, event))

    current_plan_revision = instance.get("current_plan_revision")
    issues.extend(structural_event_chain_issues(events_by_phase))
    issues.extend(superseded_grounding_issues(events_by_phase, phase_id_set, mode))
    issues.extend(current_plan_revision_issues(current_plan_revision, phase_necessity_evaluation_log, phase_execution_event_log, phase_evidence_map, artifact_validation_attestations))

    if mode == "completion":
        issues.extend(completion_issues_r4_execution_ledger(phase_id_set, phase_necessity_evaluation_log, events_by_phase))

    issues.extend(related_id_reason_issues(phase_evidence_map))
    return issues


def necessity_evaluation_chronology_issues(phase_necessity_evaluation_log: list[Any]) -> list[ValidationIssue]:
    """Validate append-only ordering for necessity evaluation events.

    The canonical order is the JSON array order. For the same qualified phase,
    later rows may revise earlier evaluations, but plan_revision and timestamp
    must not move backwards. Completion mode later uses the last row in this
    canonical order as the latest evaluation.
    """
    issues: list[ValidationIssue] = []
    latest_by_phase: dict[str, tuple[int, int | None, datetime | None]] = {}
    for index, event in enumerate(phase_necessity_evaluation_log):
        if not isinstance(event, dict):
            continue
        phase_id = event.get("qualified_phase_id")
        if not isinstance(phase_id, str):
            continue
        plan_revision = event.get("plan_revision")
        plan_revision_value = plan_revision if isinstance(plan_revision, int) else None
        timestamp_value = parse_datetime(event.get("timestamp"))
        previous = latest_by_phase.get(phase_id)
        if previous is not None:
            previous_index, previous_revision, previous_timestamp = previous
            if (
                previous_revision is not None
                and plan_revision_value is not None
                and plan_revision_value < previous_revision
            ):
                issues.append(
                    ValidationIssue(
                        f"$.phase_necessity_evaluation_log[{index}].plan_revision",
                        f"plan_revision regressed for phase {phase_id}: previous event {previous_index} had {previous_revision}, current has {plan_revision_value}",
                    )
                )
            if (
                previous_timestamp is not None
                and timestamp_value is not None
                and timestamp_value < previous_timestamp
            ):
                issues.append(
                    ValidationIssue(
                        f"$.phase_necessity_evaluation_log[{index}].timestamp",
                        f"timestamp regressed for phase {phase_id}: previous event {previous_index} was {previous_timestamp.isoformat()}, current is {timestamp_value.isoformat()}",
                    )
                )
        latest_by_phase[phase_id] = (index, plan_revision_value, timestamp_value)
    return issues


def structural_event_chain_issues(events_by_phase: dict[str, list[tuple[int, dict[str, Any]]]]) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    for phase_id, phase_events in events_by_phase.items():
        first_index, first_event = phase_events[0]
        first_transition = (first_event.get("from_status"), first_event.get("to_status"))
        if first_event.get("event_class") != "initialization" or first_transition != ("N/A", "planned"):
            issues.append(
                ValidationIssue(
                    f"$.phase_execution_event_log[{first_index}]",
                    f"phase {phase_id} must start with event_class initialization and transition N/A -> planned",
                )
            )

        previous_index, previous_event = phase_events[0]
        previous_revision = previous_event.get("plan_revision") if isinstance(previous_event.get("plan_revision"), int) else None
        previous_timestamp = parse_datetime(previous_event.get("timestamp"))
        for current_index, current_event in phase_events[1:]:
            previous_to = previous_event.get("to_status")
            current_from = current_event.get("from_status")
            if isinstance(previous_to, str) and isinstance(current_from, str) and previous_to != current_from:
                issues.append(
                    ValidationIssue(
                        f"$.phase_execution_event_log[{current_index}].from_status",
                        f"phase {phase_id} status chain is broken: previous event {previous_index} ended at {previous_to}, current event starts at {current_from}",
                    )
                )
            if previous_event.get("to_status") in STRUCTURAL_TERMINAL_STATUSES:
                issues.append(
                    ValidationIssue(
                        f"$.phase_execution_event_log[{current_index}]",
                        f"phase {phase_id} has an event after terminal status {previous_event.get('to_status')}",
                    )
                )

            current_revision = current_event.get("plan_revision") if isinstance(current_event.get("plan_revision"), int) else None
            if previous_revision is not None and current_revision is not None and current_revision < previous_revision:
                issues.append(
                    ValidationIssue(
                        f"$.phase_execution_event_log[{current_index}].plan_revision",
                        f"plan_revision regressed for phase {phase_id}: previous event {previous_index} had {previous_revision}, current has {current_revision}",
                    )
                )
            current_timestamp = parse_datetime(current_event.get("timestamp"))
            if previous_timestamp is not None and current_timestamp is not None and current_timestamp < previous_timestamp:
                issues.append(
                    ValidationIssue(
                        f"$.phase_execution_event_log[{current_index}].timestamp",
                        f"timestamp regressed for phase {phase_id}: previous event {previous_index} was {previous_timestamp.isoformat()}, current is {current_timestamp.isoformat()}",
                    )
                )

            previous_index, previous_event = current_index, current_event
            if current_revision is not None:
                previous_revision = current_revision
            if current_timestamp is not None:
                previous_timestamp = current_timestamp
    return issues


def superseded_grounding_issues(
    events_by_phase: dict[str, list[tuple[int, dict[str, Any]]]],
    phase_id_set: set[str],
    mode: ValidationMode,
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    for phase_id, phase_events in events_by_phase.items():
        final_index, final_event = phase_events[-1]
        if final_event.get("to_status") != "superseded":
            continue

        has_marker, replacement_phase_ids, has_issue_incomplete_reference, has_generic_issue_incomplete = superseded_grounding_parts(final_event)
        if not has_marker:
            issues.append(
                ValidationIssue(
                    f"$.phase_execution_event_log[{final_index}].reason",
                    f"phase {phase_id} ends at superseded; reason must include a replacement marker",
                )
            )
        if has_generic_issue_incomplete and not has_issue_incomplete_reference:
            issues.append(
                ValidationIssue(
                    f"$.phase_execution_event_log[{final_index}].reason",
                    f"phase {phase_id} references Issue incomplete without a concrete reference ID; use 'Issue incomplete: <ID>'",
                )
            )
        if not replacement_phase_ids and not has_issue_incomplete_reference:
            issues.append(
                ValidationIssue(
                    f"$.phase_execution_event_log[{final_index}].reason",
                    f"phase {phase_id} ends at superseded; reason must include a replacement R4P-* phase ID or 'Issue incomplete: <ID>'",
                )
            )

        for replacement_phase_id in replacement_phase_ids:
            if replacement_phase_id == phase_id:
                issues.append(
                    ValidationIssue(
                        f"$.phase_execution_event_log[{final_index}].reason",
                        f"phase {phase_id} cannot supersede itself",
                    )
                )
                continue
            if replacement_phase_id not in phase_id_set:
                issues.append(
                    ValidationIssue(
                        f"$.phase_execution_event_log[{final_index}].reason",
                        f"replacement phase ID is not present in this ledger: {replacement_phase_id}",
                    )
                )
                continue
            if mode == "completion":
                replacement_events = events_by_phase.get(replacement_phase_id, [])
                if not replacement_events:
                    issues.append(
                        ValidationIssue(
                            f"$.phase_execution_event_log[{final_index}].reason",
                            f"replacement phase {replacement_phase_id} has no execution event in completion mode",
                        )
                    )
                    continue
                replacement_final_status = replacement_events[-1][1].get("to_status")
                if replacement_final_status not in {"passed", "superseded"}:
                    issues.append(
                        ValidationIssue(
                            f"$.phase_execution_event_log[{final_index}].reason",
                            f"replacement phase {replacement_phase_id} must be completed in completion mode; final status is {replacement_final_status}",
                        )
                    )
                elif replacement_final_status == "superseded" and not has_superseded_grounding(replacement_events[-1][1]):
                    issues.append(
                        ValidationIssue(
                            f"$.phase_execution_event_log[{final_index}].reason",
                            f"replacement phase {replacement_phase_id} is superseded without grounding",
                        )
                    )
    return issues


def current_plan_revision_issues(
    current_plan_revision: Any,
    phase_necessity_evaluation_log: list[Any],
    phase_execution_event_log: list[Any],
    phase_evidence_map: list[Any],
    artifact_validation_attestations: list[Any],
) -> list[ValidationIssue]:
    if not isinstance(current_plan_revision, int):
        return []

    checks: list[tuple[str, list[Any], str]] = [
        ("$.phase_necessity_evaluation_log", phase_necessity_evaluation_log, "plan_revision"),
        ("$.phase_execution_event_log", phase_execution_event_log, "plan_revision"),
        ("$.phase_evidence_map", phase_evidence_map, "validated_plan_revision"),
        ("$.artifact_validation_attestations", artifact_validation_attestations, "validated_against_plan_revision"),
        ("$.artifact_validation_attestations", artifact_validation_attestations, "created_against_plan_revision"),
    ]
    issues: list[ValidationIssue] = []
    for base_path, rows, field_name in checks:
        for index, row in enumerate(rows):
            if not isinstance(row, dict):
                continue
            value = row.get(field_name)
            if isinstance(value, int) and value > current_plan_revision:
                issues.append(
                    ValidationIssue(
                        f"{base_path}[{index}].{field_name}",
                        f"{field_name} {value} exceeds current_plan_revision {current_plan_revision}",
                    )
                )
    return issues

def completion_issues_r4_execution_ledger(
    phase_id_set: set[str],
    phase_necessity_evaluation_log: list[Any],
    events_by_phase: dict[str, list[tuple[int, dict[str, Any]]]],
) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    evaluation_result_by_phase: dict[str, tuple[int, str]] = {}
    for index, event in enumerate(phase_necessity_evaluation_log):
        if not isinstance(event, dict):
            continue
        phase_id = event.get("qualified_phase_id")
        evaluation_result = event.get("evaluation_result")
        if isinstance(phase_id, str) and isinstance(evaluation_result, str):
            evaluation_result_by_phase[phase_id] = (index, evaluation_result)

    for phase_id in sorted(phase_id_set):
        phase_events = events_by_phase.get(phase_id)
        if not phase_events:
            issues.append(ValidationIssue("$.phase_execution_event_log", f"completion mode requires execution events for phase {phase_id}"))
            continue
        evaluation_record = evaluation_result_by_phase.get(phase_id)
        if evaluation_record is None:
            issues.append(ValidationIssue("$.phase_necessity_evaluation_log", f"completion mode requires a necessity evaluation event for phase {phase_id}"))
            continue

        final_index, final_event = phase_events[-1]
        final_status = final_event.get("to_status")
        _, evaluation_result = evaluation_record

        if final_status in COMPLETION_INCOMPLETE_STATUSES:
            issues.append(
                ValidationIssue(
                    f"$.phase_execution_event_log[{final_index}].to_status",
                    f"completion mode does not allow terminal status {final_status} for phase {phase_id}",
                )
            )
            continue

        if evaluation_result in COMPLETION_PASS_RESULTS and final_status not in {"passed", "superseded"}:
            issues.append(
                ValidationIssue(
                    f"$.phase_execution_event_log[{final_index}].to_status",
                    f"completion mode requires final status passed or superseded for evaluation_result {evaluation_result}; got {final_status}",
                )
            )
        elif evaluation_result in COMPLETION_CANCEL_RESULTS and final_status != "cancelled":
            issues.append(
                ValidationIssue(
                    f"$.phase_execution_event_log[{final_index}].to_status",
                    f"completion mode requires final status cancelled for evaluation_result {evaluation_result}; got {final_status}",
                )
            )
    return issues


def related_id_reason_issues(phase_evidence_map: list[Any]) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    for index, entry in enumerate(phase_evidence_map):
        if not isinstance(entry, dict):
            continue
        null_related_kinds = [kind for field, kind in RELATED_ID_FIELDS if entry.get(field) is None]
        reason = entry.get("related_ids_na_reason")
        if null_related_kinds:
            if not isinstance(reason, str) or not reason.strip():
                issues.append(ValidationIssue(f"$.phase_evidence_map[{index}].related_ids_na_reason", "must be a non-empty string when any related ID is null"))
                continue
            missing = [kind for kind in null_related_kinds if kind not in reason]
            if missing:
                issues.append(ValidationIssue(f"$.phase_evidence_map[{index}].related_ids_na_reason", "missing related ID kind(s): " + ", ".join(missing)))
        elif reason is not None:
            issues.append(ValidationIssue(f"$.phase_evidence_map[{index}].related_ids_na_reason", "must be null when all related IDs are non-null"))
    return issues


def validate_file(root: Path, schema_path: Path, file_path: Path, mode: ValidationMode) -> tuple[bool, list[ValidationIssue]]:
    schema = load_json(schema_path)
    instance = load_json(file_path)
    issues = schema_issues(schema, instance)
    issues.extend(semantic_issues(schema_path.name, instance, mode))
    return (len(issues) == 0, issues)


def validate_manifest(root: Path, manifest_path: Path) -> int:
    manifest = load_json(manifest_path)
    samples = manifest.get("samples", [])
    if not isinstance(samples, list):
        print(f"{manifest_path}: samples must be an array", file=sys.stderr)
        return 2

    failures = 0
    for sample in samples:
        rel_file = sample["path"]
        rel_schema = sample["schema"]
        expected = sample["expect"]
        mode_value = sample.get("mode", "structural")
        if mode_value not in VALIDATION_MODES:
            print(f"FAIL: {rel_file} expected={expected} actual=manifest-error schema={rel_schema} mode={mode_value}")
            print(f"  - $.samples[].mode: invalid validation mode: {mode_value!r}; expected 'structural' or 'completion'")
            failures += 1
            continue
        mode: ValidationMode = mode_value
        file_path = root / rel_file
        schema_path = root / "schemas" / rel_schema
        ok, issues = validate_file(root, schema_path, file_path, mode)
        matched = (ok and expected == "valid") or ((not ok) and expected == "invalid")
        status = "PASS" if matched else "FAIL"
        actual = "valid" if ok else "invalid"
        print(f"{status}: {rel_file} expected={expected} actual={actual} schema={rel_schema} mode={mode}")
        if not matched:
            failures += 1
            for issue in issues:
                print(f"  - {issue.format()}")
        elif not ok:
            print(f"  invalid reason: {issues[0].format() if issues else 'unknown'}")
    return 1 if failures else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate Rouault workflow JSON artifacts.")
    parser.add_argument("--root", default=None, help="File-set root. Defaults to the parent of this script's parent directory.")
    parser.add_argument("--schema", help="Schema path, relative to root or absolute.")
    parser.add_argument("--file", help="JSON artifact path, relative to root or absolute.")
    parser.add_argument("--sample-manifest", help="Sample manifest path, relative to root or absolute.")
    parser.add_argument(
        "--mode",
        choices=("structural", "completion"),
        default="structural",
        help="Validation mode for individual --schema/--file checks. structural allows in-progress ledgers; completion enforces R4 Completion / Closure invariants.",
    )
    args = parser.parse_args(argv)

    script_root = Path(__file__).resolve().parents[1]
    root = Path(args.root).resolve() if args.root else script_root

    if args.sample_manifest:
        manifest_path = Path(args.sample_manifest)
        if not manifest_path.is_absolute():
            manifest_path = root / manifest_path
        return validate_manifest(root, manifest_path)

    if not args.schema or not args.file:
        parser.error("either --sample-manifest or both --schema and --file are required")

    schema_path = Path(args.schema)
    file_path = Path(args.file)
    if not schema_path.is_absolute():
        schema_path = root / schema_path
    if not file_path.is_absolute():
        file_path = root / file_path

    ok, issues = validate_file(root, schema_path, file_path, args.mode)
    display_file = display_path(file_path, root)
    display_schema = display_path(schema_path, root)
    if ok:
        print(f"valid: {display_file} against {display_schema} mode={args.mode}")
        return 0
    print(f"invalid: {display_file} against {display_schema} mode={args.mode}")
    for issue in issues:
        print(f"- {issue.format()}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
