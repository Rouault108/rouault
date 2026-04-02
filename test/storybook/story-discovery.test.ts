import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { collectStorySourceRecords } from './story-source.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('story discovery', () => {
  const stories = collectStorySourceRecords();

  it('Storybook metadata gate の入力が空でなく、docs/smoke/manual-only に収束していること', () => {
    const filePaths = new Set(stories.map((story) => story.filePath));
    const smokeCount = stories.filter((story) => story.resolvedRole === 'smoke').length;
    const docsCount = stories.filter((story) => story.resolvedRole === 'docs').length;

    const noteContractFiles = [...new Set(
      stories
        .filter((story) => story.filePath.startsWith('src/stories/note-contracts/'))
        .map((story) => story.filePath),
    )];

    const boundaryFiles = [...new Set(
      stories
        .filter(
          (story) =>
            story.filePath.endsWith('-boundary.stories.ts') ||
            story.metaTitle?.endsWith('/Boundary') === true,
        )
        .map((story) => story.filePath),
    )];

    expect(filePaths.size).toBeGreaterThan(0);
    expect(stories.length).toBeGreaterThan(0);
    expect(smokeCount).toBeGreaterThan(0);
    expect(docsCount).toBeGreaterThan(0);
    expect(noteContractFiles).toEqual([]);
    expect(boundaryFiles).toEqual([]);
  });

  it('常設ゲートと拡張ゲートが分離され、browser/node/E2E の責務境界が崩れていないことを確認する', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };

    const vitestConfig = fs.readFileSync(path.join(repositoryRoot, 'vitest.config.ts'), 'utf8');
    const wtrConfig = fs.readFileSync(
      path.join(repositoryRoot, 'web-test-runner.config.mjs'),
      'utf8',
    );

    expect(packageJson.scripts?.['test']).toBe(
      'pnpm test:node && pnpm test:ssr && pnpm test:browser && pnpm test:storybook:meta',
    );
    expect(packageJson.scripts?.['test:extended']).toBe(
      'pnpm test:storybook:smoke && pnpm test:e2e',
    );
    expect(packageJson.scripts?.['test:node']).toBe('vitest --project node');
    expect(packageJson.scripts?.['test:browser']).toBe(
      'pnpm exec web-test-runner --config web-test-runner.config.mjs',
    );
    expect(packageJson.scripts?.['test:unit']).toBeUndefined();
    expect(packageJson.scripts?.['test:storybook:meta']).toBe('vitest --project storybook-meta');
    expect(packageJson.scripts?.['test:storybook:smoke']).toBe(
      'vitest --project storybook-smoke',
    );

    expect(vitestConfig).toContain("name: 'node'");
    expect(vitestConfig).toContain("name: 'storybook-smoke'");
    expect(vitestConfig).toContain("include: ['smoke']");
    expect(vitestConfig).toContain("exclude: ['manual-only']");
    expect(vitestConfig).not.toContain("name: 'storybook-runtime'");

    expect(wtrConfig).toContain("files: ['test/browser/**/*.test.ts']");
    expect(wtrConfig).not.toContain('test/unit/');
    expect(wtrConfig).not.toContain('src/**/*.test.ts');
  });
});