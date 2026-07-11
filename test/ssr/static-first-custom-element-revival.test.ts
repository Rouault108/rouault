import { describe, expect, it } from 'vitest';

import { STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS } from '../../build/content/static-first-removed-or-reduced-tags.js';
import {
  collectCustomElementDefinitionSourceFiles,
  scanCustomElementDefinitions,
  type CustomElementDefinitionFinding,
} from './helpers/custom-element-definition-scan.js';

const sourceRoots = ['src', 'shared', 'build', 'scripts'] as const;

const repoRoot = process.cwd();
const sourceFiles = collectCustomElementDefinitionSourceFiles(repoRoot, sourceRoots);
const scanResult = scanCustomElementDefinitions(repoRoot, sourceFiles);
const removedOrReducedLegacyTags = new Set<string>(STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS);

const formatFinding = (finding: CustomElementDefinitionFinding): string =>
  `${finding.relativePath}:${finding.line}:${finding.column} ${finding.kind} ${
    finding.tag ?? '<non-literal>'
  }`;

const literalDefinitions = [
  ...scanResult.literalDecoratorDefinitions,
  ...scanResult.literalCustomElementsDefineDefinitions,
];

describe('static-first custom element revival guard', () => {
  it('scans runtime source roots with TypeScript AST custom element definition detection', () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
    expect(literalDefinitions.some((finding) => finding.tag === 'router-document-host')).toBe(true);
    expect(literalDefinitions.some((finding) => finding.tag === 'layout-toc-controller')).toBe(
      true,
    );
  });

  it('does not define removed-or-reduced legacy tags as custom elements', () => {
    const revivalFindings = literalDefinitions.filter(
      (finding) => finding.tag !== null && removedOrReducedLegacyTags.has(finding.tag),
    );

    expect(
      revivalFindings.map(formatFinding),
      'removed-or-reduced legacy tag revival guard, not a general custom-element lint',
    ).toEqual([]);
  });

  it('does not use non-literal custom element definitions outside the retained inventory guard', () => {
    const nonLiteralFindings = [
      ...scanResult.nonLiteralDecoratorDefinitions,
      ...scanResult.nonLiteralCustomElementsDefineDefinitions,
    ];

    expect(
      nonLiteralFindings.map(formatFinding),
      'removed-or-reduced legacy tag revival guard, not a general custom-element lint',
    ).toEqual([]);
  });
});
