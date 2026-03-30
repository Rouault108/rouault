import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const directivesRoot = path.resolve(projectRoot, 'lib/remark/directives');

const readDirectorySources = (directoryPath: string): string[] =>
  readdirSync(directoryPath)
    .filter((entry) => entry.endsWith('.ts'))
    .map((entry) => readFileSync(path.join(directoryPath, entry), 'utf8'));

describe('markdown directive architecture', () => {
  it('validator 層が output props と file I/O へ依存していないこと', () => {
    const validatorDirectory = path.join(directivesRoot, 'validator');

    expect(existsSync(validatorDirectory)).to.equal(true);

    for (const source of readDirectorySources(validatorDirectory)) {
      expect(source).not.toContain('hProperties');
      expect(source).not.toContain('node.data');
      expect(source).not.toContain('readFileSync');
      expect(source).not.toContain('existsSync');
      expect(source).not.toContain('readSourceNoteMetadata');
    }
  });

  it('payload 層が output binding を保持していないこと', () => {
    const payloadDirectory = path.join(directivesRoot, 'payload');

    expect(existsSync(payloadDirectory)).to.equal(true);

    for (const source of readDirectorySources(payloadDirectory)) {
      expect(source).not.toContain('hName');
      expect(source).not.toContain('hProperties');
    }
  });

  it('旧 metadata / 旧 validator preview 実装が残っていないこと', () => {
    expect(existsSync(path.join(directivesRoot, 'shared/directive-metadata.ts'))).to.equal(false);
    expect(existsSync(path.join(directivesRoot, 'validation/preview.ts'))).to.equal(false);
  });
});
