import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('Storybook preview contracts', () => {
  it('delegates font loading to the shared CSS registry', () => {
    const previewTs = fs.readFileSync(path.join(repositoryRoot, '.storybook/preview.ts'), 'utf8');

    expect(previewTs).not.toContain('@fontsource/jetbrains-mono');
    expect(previewTs).not.toContain('@fontsource-variable/geist-mono');
    expect(previewTs).toContain("import '../src/assets/css/main.css';");
  });
});
