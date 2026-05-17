from __future__ import annotations

import unittest
from pathlib import Path

import validate_production_build_env


class ValidateProductionBuildEnvTest(unittest.TestCase):
    def test_current_workflow_declares_build_production_site_url_context(self) -> None:
        source = Path(".github/workflows/ci-cd.yml").read_text(encoding="utf-8")

        self.assertEqual(validate_production_build_env.validate_workflow(source), [])

    def test_resolution_step_must_precede_production_build(self) -> None:
        source = """
  build-production:
    env:
      ROUAULT_MEDIA_BASE_URL: ${{ vars.ROUAULT_MEDIA_BASE_URL }}
      REPOSITORY_ROUAULT_SITE_ORIGIN: ${{ vars.ROUAULT_SITE_ORIGIN }}
      REPOSITORY_ROUAULT_BASE_PATH: ${{ vars.ROUAULT_BASE_PATH }}
    steps:
      - run: pnpm build:production
      - name: resolve production build site URL context
        run: |
          if [[ "${GITHUB_EVENT_NAME}" == "push" && "${GITHUB_REF}" == "refs/heads/main" ]]; then
            echo "ROUAULT_SITE_ORIGIN is required for main production deployment builds."
          fi
          echo "ROUAULT_SITE_ORIGIN=${REPOSITORY_ROUAULT_SITE_ORIGIN:-http://127.0.0.1:4173}" >> "$GITHUB_ENV"
          echo "ROUAULT_BASE_PATH=${REPOSITORY_ROUAULT_BASE_PATH:-}" >> "$GITHUB_ENV"
  ci-required:
    steps: []
"""

        failures = validate_production_build_env.validate_workflow(source)

        self.assertIn(
            "production site URL context resolution step must run before pnpm build:production",
            failures,
        )

    def test_run_production_build_keeps_ci_fallback_out_of_script(self) -> None:
        source = Path("scripts/run-production-build.ts").read_text(encoding="utf-8")

        self.assertNotIn("http://127.0.0.1:4173", source)
        self.assertNotIn("DEFAULT_SITE_URL_CONTEXT", source)


if __name__ == "__main__":
    unittest.main()
