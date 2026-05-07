import { findProductionImportBoundaryViolations } from './import-boundary-graph.js';

const violations = await findProductionImportBoundaryViolations();

if (violations.length > 0) {
  console.error('production import boundary violations:');
  for (const violation of violations) {
    console.error(`- ${violation.ruleId}: ${violation.file} imports ${violation.specifier}`);
  }
  process.exitCode = 1;
} else {
  console.log('assert-production-import-boundary: ok');
}
