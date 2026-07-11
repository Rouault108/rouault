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

    const noteContractFiles = [
      ...new Set(
        stories
          .filter((story) => story.filePath.startsWith('src/stories/note-contracts/'))
          .map((story) => story.filePath),
      ),
    ];

    const boundaryFiles = [
      ...new Set(
        stories
          .filter(
            (story) =>
              story.filePath.endsWith('-boundary.stories.ts') ||
              story.metaTitle?.endsWith('/Boundary') === true,
          )
          .map((story) => story.filePath),
      ),
    ];

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

    const getScript = (name: string): string => {
      const script = packageJson.scripts?.[name];
      expect(script, `${name} script should exist`).toEqual(expect.any(String));
      return script ?? '';
    };

    const normalize = (value: string): string => value.replace(/\s+/g, ' ').trim();

    const testScript = normalize(getScript('test'));
    const extendedScript = normalize(getScript('test:extended'));
    const nodeScript = normalize(getScript('test:node'));
    const browserScript = normalize(getScript('test:browser'));
    const storybookMetaScript = normalize(getScript('test:storybook:meta'));
    const storybookSmokeScript = normalize(getScript('test:storybook:smoke'));
    const e2eProductionScript = normalize(getScript('test:e2e:production'));

    expect(testScript).toContain('test:node');
    expect(testScript).toContain('test:ssr');
    expect(testScript).toContain('test:browser');
    expect(testScript).toContain('test:storybook:meta');
    expect(testScript).not.toContain('test:storybook:smoke');
    expect(testScript).not.toContain('test:e2e');

    expect(extendedScript).toContain('test:storybook:smoke');
    expect(extendedScript).toContain('test:e2e');
    expect(extendedScript).not.toContain('test:node');
    expect(extendedScript).not.toContain('test:ssr');
    expect(extendedScript).not.toContain('test:browser');
    expect(extendedScript).not.toContain('test:storybook:meta');

    expect(e2eProductionScript).toContain('playwright test');

    expect(nodeScript).toContain('vitest');
    expect(nodeScript).toContain('--project node');
    expect(nodeScript).not.toContain('playwright');

    expect(browserScript).toContain('scripts/run-web-test-runner.mjs');
    expect(browserScript).toContain('--config web-test-runner.config.mjs');
    expect(browserScript).not.toContain('vitest --project node');

    expect(packageJson.scripts?.['test:unit']).toBeUndefined();

    expect(storybookMetaScript).toContain('vitest');
    expect(storybookMetaScript).toContain('--project storybook-meta');

    expect(storybookSmokeScript).toContain('vitest');
    expect(storybookSmokeScript).toContain('--project storybook-smoke');

    expect(vitestConfig).toContain("name: 'node'");
    expect(vitestConfig).toContain("name: 'storybook-smoke'");
    expect(vitestConfig).toContain("include: ['smoke']");
    expect(vitestConfig).toContain("exclude: ['manual-only']");
    expect(vitestConfig).toContain("host: '127.0.0.1'");
    expect(vitestConfig).toContain('strictPort: false');
    expect(vitestConfig).not.toContain("name: 'storybook-runtime'");

    expect(wtrConfig).toContain(
      "files: ['test/browser/**/*.test.ts']",
    );
    expect(wtrConfig).not.toContain('test/unit/');
    expect(wtrConfig).not.toContain('src/**/*.test.ts');
  });
});
