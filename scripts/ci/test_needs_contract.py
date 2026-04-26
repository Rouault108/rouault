from __future__ import annotations

import json
import unittest
from unittest.mock import patch

import needs_contract
import validate_deployment_needs
import validate_prebuild_needs
import validate_required_needs


def job(result: str, outputs: dict[str, str] | None = None) -> dict[str, object]:
    meta: dict[str, object] = {"result": result}
    if outputs is not None:
        meta["outputs"] = outputs
    return meta


def detect(content: bool, app: bool, build: bool) -> dict[str, object]:
    return job(
        "success",
        {
            "content": str(content).lower(),
            "app": str(app).lower(),
            "build": str(build).lower(),
        },
    )


def with_needs(
    needs: dict[str, object],
    env: dict[str, str] | None = None,
) -> dict[str, str]:
    values = {"NEEDS_JSON": json.dumps(needs)}
    if env:
        values.update(env)
    return values


class NeedsContractTest(unittest.TestCase):
    def test_load_needs_rejects_non_object_json(self) -> None:
        with patch.dict("os.environ", {"NEEDS_JSON": "[]"}, clear=True):
            with self.assertRaisesRegex(ValueError, "object"):
                needs_contract.load_needs()

    def test_missing_result_is_reported_as_missing(self) -> None:
        self.assertEqual(needs_contract.result_of({"lint": {}}, "lint"), "missing")
        self.assertEqual(needs_contract.result_of({}, "lint"), "missing")

    def test_detect_outputs_must_be_explicit_booleans(self) -> None:
        failures: list[str] = []
        needs = {
            "detect-changes": job(
                "success",
                {"content": "true", "app": "", "build": "yes"},
            )
        }

        self.assertEqual(
            needs_contract.require_detect_change_outputs(needs, failures),
            (True, False, False),
        )
        self.assertEqual(len(failures), 2)


APP_PREREQUISITE_JOBS = (
    "lint",
    "typecheck-app",
    "typecheck-node",
    "test-node",
    "test-browser",
    "test-storybook-meta",
)

EXTENDED_TEST_JOBS = (
    "test-storybook-smoke",
    "test-e2e-production",
    "test-e2e-dev",
)


def prebuild_needs(
    *,
    detect_job: dict[str, object] | None = None,
    app_jobs: str = "skipped",
    test_ssr: str = "skipped",
) -> dict[str, object]:
    needs: dict[str, object] = {
        "detect-changes": detect(False, False, False) if detect_job is None else detect_job,
        "test-ssr": job(test_ssr),
    }
    needs.update({name: job(app_jobs) for name in APP_PREREQUISITE_JOBS})
    return needs


def required_needs(
    *,
    detect_job: dict[str, object] | None = None,
    prebuild_gate: str = "success",
    build_production: str = "skipped",
    extended_tests: str = "skipped",
) -> dict[str, object]:
    needs: dict[str, object] = {
        "detect-changes": detect(False, False, False) if detect_job is None else detect_job,
        "prebuild-gate": job(prebuild_gate),
        "build-production": job(build_production),
    }
    needs.update({name: job(extended_tests) for name in EXTENDED_TEST_JOBS})
    return needs


class ValidatePrebuildNeedsTest(unittest.TestCase):
    def test_content_only_requires_ssr_and_skips_app_prerequisites(self) -> None:
        needs = {
            "detect-changes": detect(True, False, True),
            "lint": job("skipped"),
            "typecheck-app": job("skipped"),
            "typecheck-node": job("skipped"),
            "test-node": job("skipped"),
            "test-browser": job("skipped"),
            "test-storybook-meta": job("skipped"),
            "test-ssr": job("success"),
        }

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 0)

    def test_content_only_rejects_skipped_ssr(self) -> None:
        needs = {
            "detect-changes": detect(True, False, True),
            "lint": job("skipped"),
            "typecheck-app": job("skipped"),
            "typecheck-node": job("skipped"),
            "test-node": job("skipped"),
            "test-browser": job("skipped"),
            "test-storybook-meta": job("skipped"),
            "test-ssr": job("skipped"),
        }

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)

    def test_app_change_requires_app_prerequisites(self) -> None:
        needs = {
            "detect-changes": detect(False, True, True),
            "lint": job("success"),
            "typecheck-app": job("success"),
            "typecheck-node": job("success"),
            "test-node": job("success"),
            "test-browser": job("success"),
            "test-storybook-meta": job("success"),
            "test-ssr": job("success"),
        }

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 0)

    def test_app_change_rejects_skipped_app_prerequisite(self) -> None:
        needs = prebuild_needs(
            detect_job=detect(False, True, True),
            app_jobs="success",
            test_ssr="success",
        )
        needs["lint"] = job("skipped")

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)

    def test_app_false_rejects_successful_app_prerequisite(self) -> None:
        needs = prebuild_needs(
            detect_job=detect(True, False, True),
            app_jobs="skipped",
            test_ssr="success",
        )
        needs["test-browser"] = job("success")

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)

    def test_docs_only_requires_all_prerequisites_skipped(self) -> None:
        needs = prebuild_needs(
            detect_job=detect(False, False, False),
            app_jobs="skipped",
            test_ssr="skipped",
        )

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 0)

    def test_docs_only_rejects_successful_ssr(self) -> None:
        needs = prebuild_needs(
            detect_job=detect(False, False, False),
            app_jobs="skipped",
            test_ssr="success",
        )

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)

    def test_detect_changes_failure_fails_prebuild_gate(self) -> None:
        needs = prebuild_needs(
            detect_job=job(
                "failure",
                {"content": "true", "app": "false", "build": "true"},
            ),
            app_jobs="skipped",
            test_ssr="success",
        )

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)

    def test_build_true_rejects_cancelled_ssr(self) -> None:
        needs = prebuild_needs(
            detect_job=detect(True, False, True),
            app_jobs="skipped",
            test_ssr="cancelled",
        )

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)

    def test_missing_detect_outputs_fail_prebuild_gate(self) -> None:
        needs = prebuild_needs(
            detect_job=job("success", {"content": "true", "app": "false"}),
            app_jobs="skipped",
            test_ssr="success",
        )

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)

    def test_invalid_detect_output_fails_prebuild_gate(self) -> None:
        needs = prebuild_needs(
            detect_job=job(
                "success",
                {"content": "true", "app": "false", "build": "yes"},
            ),
            app_jobs="skipped",
            test_ssr="success",
        )

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)

    def test_missing_detect_job_fails_prebuild_gate(self) -> None:
        needs = prebuild_needs(
            detect_job=detect(True, False, True),
            app_jobs="skipped",
            test_ssr="success",
        )
        del needs["detect-changes"]

        with patch.dict("os.environ", with_needs(needs), clear=True):
            self.assertEqual(validate_prebuild_needs.main(), 1)


class ValidateRequiredNeedsTest(unittest.TestCase):
    def test_content_only_requires_build_and_skips_extended_tests(self) -> None:
        needs = required_needs(
            detect_job=detect(True, False, True),
            build_production="success",
            extended_tests="skipped",
        )
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 0)

    def test_main_push_app_change_requires_extended_tests_and_build(self) -> None:
        needs = {
            "detect-changes": detect(False, True, True),
            "prebuild-gate": job("success"),
            "test-storybook-smoke": job("success"),
            "test-e2e-production": job("success"),
            "test-e2e-dev": job("success"),
            "build-production": job("success"),
        }
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 0)

    def test_docs_only_rejects_successful_build_production(self) -> None:
        needs = required_needs(
            detect_job=detect(False, False, False),
            build_production="success",
            extended_tests="skipped",
        )
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_feature_pr_app_change_skips_extended_tests(self) -> None:
        needs = {
            "detect-changes": detect(False, True, True),
            "prebuild-gate": job("success"),
            "test-storybook-smoke": job("skipped"),
            "test-e2e-production": job("skipped"),
            "test-e2e-dev": job("skipped"),
            "build-production": job("success"),
        }
        env = {
            "GITHUB_EVENT_NAME": "pull_request",
            "GITHUB_REF": "refs/pull/1/merge",
            "GITHUB_BASE_REF": "feature",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 0)

    def test_docs_only_requires_skipped_build(self) -> None:
        needs = {
            "detect-changes": detect(False, False, False),
            "prebuild-gate": job("success"),
            "test-storybook-smoke": job("skipped"),
            "test-e2e-production": job("skipped"),
            "test-e2e-dev": job("skipped"),
            "build-production": job("skipped"),
        }
        env = {
            "GITHUB_EVENT_NAME": "workflow_dispatch",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 0)

    def test_build_true_rejects_skipped_build_production(self) -> None:
        needs = {
            "detect-changes": detect(True, False, True),
            "prebuild-gate": job("success"),
            "test-storybook-smoke": job("skipped"),
            "test-e2e-production": job("skipped"),
            "test-e2e-dev": job("skipped"),
            "build-production": job("skipped"),
        }
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_build_true_rejects_missing_build_production(self) -> None:
        needs = required_needs(
            detect_job=detect(True, False, True),
            build_production="success",
            extended_tests="skipped",
        )
        del needs["build-production"]
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_main_push_app_change_rejects_skipped_extended_test(self) -> None:
        needs = required_needs(
            detect_job=detect(False, True, True),
            build_production="success",
            extended_tests="success",
        )
        needs["test-e2e-production"] = job("skipped")
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_feature_pr_app_change_rejects_successful_extended_tests(self) -> None:
        needs = required_needs(
            detect_job=detect(False, True, True),
            build_production="success",
            extended_tests="success",
        )
        env = {
            "GITHUB_EVENT_NAME": "pull_request",
            "GITHUB_REF": "refs/pull/1/merge",
            "GITHUB_BASE_REF": "feature",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_workflow_dispatch_app_change_requires_extended_tests(self) -> None:
        needs = required_needs(
            detect_job=detect(True, True, True),
            build_production="success",
            extended_tests="success",
        )
        env = {
            "GITHUB_EVENT_NAME": "workflow_dispatch",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 0)

    def test_workflow_dispatch_rejects_skipped_extended_tests(self) -> None:
        needs = required_needs(
            detect_job=detect(True, True, True),
            build_production="success",
            extended_tests="skipped",
        )
        env = {
            "GITHUB_EVENT_NAME": "workflow_dispatch",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_prebuild_gate_failure_fails_required_gate(self) -> None:
        needs = required_needs(
            detect_job=detect(True, False, True),
            prebuild_gate="failure",
            build_production="success",
            extended_tests="skipped",
        )
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_build_true_rejects_cancelled_build_production(self) -> None:
        needs = required_needs(
            detect_job=detect(True, False, True),
            build_production="cancelled",
            extended_tests="skipped",
        )
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_missing_detect_outputs_fail_required_gate(self) -> None:
        needs = required_needs(
            detect_job=job("success", {"content": "true", "app": "false"}),
            build_production="success",
            extended_tests="skipped",
        )
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)

    def test_invalid_detect_output_fails_required_gate(self) -> None:
        needs = required_needs(
            detect_job=job(
                "success",
                {"content": "true", "app": "TRUE", "build": "true"},
            ),
            build_production="success",
            extended_tests="skipped",
        )
        env = {
            "GITHUB_EVENT_NAME": "push",
            "GITHUB_REF": "refs/heads/main",
            "GITHUB_BASE_REF": "",
        }

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_required_needs.main(), 1)


class ValidateDeploymentNeedsTest(unittest.TestCase):
    def test_main_push_build_true_requires_deploy_success(self) -> None:
        needs = {
            "detect-changes": detect(True, False, True),
            "ci-required": job("success"),
            "deploy-production": job("success"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 0)

    def test_main_push_build_true_rejects_skipped_deploy(self) -> None:
        needs = {
            "detect-changes": detect(True, False, True),
            "ci-required": job("success"),
            "deploy-production": job("skipped"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)

    def test_main_push_build_true_rejects_missing_deploy(self) -> None:
        needs = {
            "detect-changes": detect(True, False, True),
            "ci-required": job("success"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)

    def test_main_push_build_false_requires_deploy_skipped(self) -> None:
        needs = {
            "detect-changes": detect(False, False, False),
            "ci-required": job("success"),
            "deploy-production": job("skipped"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 0)

    def test_main_push_build_false_rejects_successful_deploy(self) -> None:
        needs = {
            "detect-changes": detect(False, False, False),
            "ci-required": job("success"),
            "deploy-production": job("success"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)

    def test_ci_required_failure_fails_deployment_validation(self) -> None:
        needs = {
            "detect-changes": detect(True, False, True),
            "ci-required": job("failure"),
            "deploy-production": job("success"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)

    def test_non_main_context_requires_deploy_skipped(self) -> None:
        needs = {
            "detect-changes": detect(True, True, True),
            "ci-required": job("success"),
            "deploy-production": job("skipped"),
        }
        env = {"GITHUB_EVENT_NAME": "workflow_dispatch", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 0)

    def test_workflow_dispatch_rejects_successful_deploy(self) -> None:
        needs = {
            "detect-changes": detect(True, True, True),
            "ci-required": job("success"),
            "deploy-production": job("success"),
        }
        env = {"GITHUB_EVENT_NAME": "workflow_dispatch", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)

    def test_non_main_context_rejects_successful_deploy(self) -> None:
        needs = {
            "detect-changes": detect(True, True, True),
            "ci-required": job("success"),
            "deploy-production": job("success"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/feature"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)

    def test_main_push_build_true_rejects_cancelled_deploy(self) -> None:
        needs = {
            "detect-changes": detect(True, False, True),
            "ci-required": job("success"),
            "deploy-production": job("cancelled"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)

    def test_missing_detect_output_fails(self) -> None:
        needs = {
            "detect-changes": job("success", {"content": "true", "app": "false"}),
            "ci-required": job("success"),
            "deploy-production": job("success"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)

    def test_invalid_detect_output_fails_deployment_validation(self) -> None:
        needs = {
            "detect-changes": job(
                "success",
                {"content": "true", "app": "false", "build": ""},
            ),
            "ci-required": job("success"),
            "deploy-production": job("success"),
        }
        env = {"GITHUB_EVENT_NAME": "push", "GITHUB_REF": "refs/heads/main"}

        with patch.dict("os.environ", with_needs(needs, env), clear=True):
            self.assertEqual(validate_deployment_needs.main(), 1)


if __name__ == "__main__":
    unittest.main()
