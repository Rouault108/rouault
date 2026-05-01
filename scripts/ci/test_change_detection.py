from __future__ import annotations

import subprocess
import unittest
from unittest.mock import patch

import change_detection
import classify_changes
from change_detection import (
    ALL_ZERO_SHA,
    EMPTY_TREE_SHA,
    DiffRange,
    changed_files,
    classification_outputs,
    classify_files,
    ensure_object_available,
    resolve_diff_range,
)


class ClassificationTest(unittest.TestCase):
    def test_single_file_classification(self) -> None:
        cases = [
            ("README.md", False, False, False),
            ("LICENSE", False, False, False),
            ("docs/foo.md", False, False, False),
            ("docs/nested/foo.md", False, False, False),
            ("content/foo.md", True, False, True),
            ("content/library/foo.md", True, False, True),
            ("src/components/foo.ts", False, True, True),
            ("src/components/foo/bar.ts", False, True, True),
            ("shared/foo.ts", False, True, True),
            ("types/foo.ts", False, True, True),
            ("scripts/foo.ts", False, True, True),
            ("test/foo.test.ts", False, True, True),
            (".storybook/main.ts", False, True, True),
            (".github/workflows/ci-cd.yml", False, True, True),
            (".github/actions/foo/action.yml", False, True, True),
            (".github/dependabot.yml", False, True, True),
            ("package.json", False, True, True),
            ("pnpm-lock.yaml", False, True, True),
            ("tsconfig.json", False, True, True),
            ("tsconfig.node.json", False, True, True),
            ("vite.client.config.ts", False, True, True),
            ("eslint.config.mjs", False, True, True),
            ("playwright.config.ts", False, True, True),
            ("eleventy.config.ts", True, True, True),
            ("velite.config.ts", True, True, True),
            ("_headers", False, False, True),
            ("_redirects", False, False, True),
            ("wrangler.jsonc", False, False, True),
            ("AGENTS.md", False, False, False),
            ("unknown.file", False, True, True),
        ]

        for file, content, app, build in cases:
            with self.subTest(file=file):
                self.assertEqual(
                    classification_outputs(classify_files([file])),
                    {
                        "content": content,
                        "app": app,
                        "build": build,
                    },
                )

    def test_multi_file_classification(self) -> None:
        cases = [
            (["README.md", "docs/foo.md"], False, False, False),
            (["README.md", "src/foo.ts"], False, True, True),
            (["README.md", "unknown.file"], False, True, True),
            ([], False, False, False),
        ]

        for files, content, app, build in cases:
            with self.subTest(files=files):
                self.assertEqual(
                    classification_outputs(classify_files(files)),
                    {
                        "content": content,
                        "app": app,
                        "build": build,
                    },
                )


class ResolveDiffRangeTest(unittest.TestCase):
    def test_pull_request_uses_merge_base(self) -> None:
        payload = {
            "pull_request": {
                "base": {"sha": "base-sha"},
                "head": {"sha": "head-sha"},
            }
        }

        with patch.object(
            change_detection, "run_git", return_value="merge-base-sha\n"
        ) as run_git:
            result = resolve_diff_range("pull_request", payload)

        self.assertEqual(result, DiffRange(base="merge-base-sha", head="head-sha"))
        run_git.assert_called_once_with("merge-base", "base-sha", "head-sha")

    def test_pull_request_missing_base_sha_raises(self) -> None:
        payload = {"pull_request": {"base": {}, "head": {"sha": "head-sha"}}}

        with self.assertRaisesRegex(RuntimeError, "base SHA"):
            resolve_diff_range("pull_request", payload)

    def test_pull_request_missing_head_sha_raises(self) -> None:
        payload = {"pull_request": {"base": {"sha": "base-sha"}, "head": {}}}

        with self.assertRaisesRegex(RuntimeError, "head SHA"):
            resolve_diff_range("pull_request", payload)

    def test_pull_request_merge_base_failure_raises(self) -> None:
        payload = {
            "pull_request": {
                "base": {"sha": "base-sha"},
                "head": {"sha": "head-sha"},
            }
        }

        with patch.object(
            change_detection,
            "run_git",
            side_effect=subprocess.CalledProcessError(1, ["git", "merge-base"]),
        ):
            with self.assertRaisesRegex(RuntimeError, "merge-base"):
                resolve_diff_range("pull_request", payload)

    def test_push_uses_payload_before_after(self) -> None:
        result = resolve_diff_range(
            "push", {"before": "before-sha", "after": "after-sha"}
        )

        self.assertEqual(result, DiffRange(base="before-sha", head="after-sha"))

    def test_push_missing_before_raises(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "before SHA"):
            resolve_diff_range("push", {"after": "after-sha"})

    def test_push_missing_after_raises(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "after SHA"):
            resolve_diff_range("push", {"before": "before-sha"})

    def test_push_all_zero_before_uses_empty_tree(self) -> None:
        result = resolve_diff_range(
            "push", {"before": ALL_ZERO_SHA, "after": "after-sha"}
        )

        self.assertEqual(result.base, EMPTY_TREE_SHA)
        self.assertEqual(result.head, "after-sha")
        self.assertIn("empty tree", result.reason)

    def test_unsupported_event_raises(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "unsupported event"):
            resolve_diff_range("workflow_dispatch", {})


class ObjectAvailabilityTest(unittest.TestCase):
    def test_object_exists(self) -> None:
        with patch.object(change_detection, "run_git", return_value="") as run_git:
            self.assertTrue(ensure_object_available("head-sha"))

        run_git.assert_called_once_with("cat-file", "-e", "head-sha^{object}")

    def test_missing_object_fetch_succeeds(self) -> None:
        failure = subprocess.CalledProcessError(1, ["git", "cat-file"])

        with patch.object(
            change_detection, "run_git", side_effect=[failure, "", ""]
        ) as run_git:
            self.assertTrue(ensure_object_available("base-sha"))

        self.assertEqual(
            run_git.call_args_list[1].args,
            ("fetch", "--no-tags", "--prune", "origin", "base-sha"),
        )

    def test_missing_object_fetch_fails(self) -> None:
        cat_file_failure = subprocess.CalledProcessError(1, ["git", "cat-file"])
        fetch_failure = subprocess.CalledProcessError(1, ["git", "fetch"])

        with patch.object(
            change_detection,
            "run_git",
            side_effect=[cat_file_failure, fetch_failure],
        ):
            self.assertFalse(ensure_object_available("base-sha"))

    def test_empty_tree_is_available_without_fetch(self) -> None:
        with patch.object(change_detection, "run_git") as run_git:
            self.assertTrue(ensure_object_available(EMPTY_TREE_SHA))

        run_git.assert_not_called()


class ChangedFilesTest(unittest.TestCase):
    def test_changed_files_reads_null_delimited_diff_and_sorts_paths(self) -> None:
        diff_output = b"src/z.ts\0README.md\0content/a.md\0"

        with patch.object(
            change_detection, "run_git", return_value=diff_output
        ) as run_git:
            self.assertEqual(
                changed_files("base-sha", "head-sha"),
                ["README.md", "content/a.md", "src/z.ts"],
            )

        run_git.assert_called_once_with(
            "diff",
            "-z",
            "--name-only",
            "base-sha",
            "head-sha",
            text=False,
        )


class EntryPointAvailabilityTest(unittest.TestCase):
    def test_workflow_dispatch_returns_full_run_outputs(self) -> None:
        with patch.dict(
            "os.environ", {"GITHUB_EVENT_NAME": "workflow_dispatch"}, clear=True
        ):
            with patch.object(classify_changes, "write_outputs") as write_outputs:
                with patch.object(classify_changes, "log"):
                    self.assertEqual(classify_changes.main(), 0)

        write_outputs.assert_called_once_with(
            {
                "content": True,
                "app": True,
                "build": True,
            }
        )

    def test_head_object_missing_returns_error(self) -> None:
        diff_range = DiffRange(base="base-sha", head="head-sha")

        with patch.dict("os.environ", {"GITHUB_EVENT_NAME": "push"}, clear=True):
            with patch.object(classify_changes, "read_event_payload", return_value={}):
                with patch.object(
                    classify_changes, "resolve_diff_range", return_value=diff_range
                ):
                    with patch.object(
                        classify_changes,
                        "ensure_object_available",
                        return_value=False,
                    ):
                        with patch.object(
                            classify_changes, "write_outputs"
                        ) as write_outputs:
                            with patch.object(classify_changes, "log"):
                                self.assertEqual(classify_changes.main(), 1)

        write_outputs.assert_not_called()

    def test_base_object_missing_returns_full_run_outputs(self) -> None:
        diff_range = DiffRange(base="base-sha", head="head-sha")

        with patch.dict("os.environ", {"GITHUB_EVENT_NAME": "push"}, clear=True):
            with patch.object(classify_changes, "read_event_payload", return_value={}):
                with patch.object(
                    classify_changes, "resolve_diff_range", return_value=diff_range
                ):
                    with patch.object(
                        classify_changes,
                        "ensure_object_available",
                        side_effect=[True, False],
                    ):
                        with patch.object(
                            classify_changes, "write_outputs"
                        ) as write_outputs:
                            with patch.object(classify_changes, "log"):
                                self.assertEqual(classify_changes.main(), 0)

        write_outputs.assert_called_once_with(
            {
                "content": True,
                "app": True,
                "build": True,
            }
        )


if __name__ == "__main__":
    unittest.main()
