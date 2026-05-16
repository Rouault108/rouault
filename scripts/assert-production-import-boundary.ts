import { findProductionImportBoundaryViolations } from './import-boundary-graph.js';

const violations = await findProductionImportBoundaryViolations();
for (const violation of violations) {
  console.error(violation);
}

if (violations.length > 0) process.exit(1);
