import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rm, stat } from 'node:fs/promises';

import {
  NOTO_SANS_JP_FONT_SOURCE_DIR_ABSOLUTE_PATH,
  prepareStaticFontAssets,
} from '../../build/assets/static-font-assets.js';

vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs/promises')>()),
  stat: vi.fn(),
  rm: vi.fn(),
}));

describe('static font source failures', () => {
  beforeEach(() => {
    vi.mocked(stat).mockReset();
    vi.mocked(rm).mockReset();
  });

  it('preserves the missing-directory diagnostic and original cause before any cleanup', async () => {
    const original = Object.assign(new Error('missing font fixture'), { code: 'ENOENT' });
    vi.mocked(stat).mockRejectedValueOnce(original);

    await expect(prepareStaticFontAssets()).rejects.toMatchObject({
      name: 'Error',
      message: `Noto Sans JP font source directory does not exist: ${NOTO_SANS_JP_FONT_SOURCE_DIR_ABSOLUTE_PATH}`,
      cause: original,
    });
    expect(rm).not.toHaveBeenCalled();
  });

  it('rethrows other filesystem errors unchanged', async () => {
    const original = Object.assign(new Error('font access fixture'), { code: 'EACCES' });
    vi.mocked(stat).mockRejectedValueOnce(original);

    await expect(prepareStaticFontAssets()).rejects.toBe(original);
    expect(rm).not.toHaveBeenCalled();
  });
});
