import { createHash } from 'node:crypto';

import { expect, test, type Locator, type Page } from '@playwright/test';

import { e2eNoteFixtures } from './support/note-fixtures.js';

const STATE_SEMANTICS = {
  highlight: { label: '強調行', wrapper: 'mark' },
  add: { label: '追加行', wrapper: 'ins' },
  remove: { label: '削除行', wrapper: 'del' },
} as const;

type StatefulLineState = keyof typeof STATE_SEMANTICS;
type LineState = 'normal' | StatefulLineState;

const LINE_STATES = [
  'normal',
  'highlight',
  'add',
  'remove',
] as const satisfies readonly LineState[];

interface SemanticLineSignature {
  readonly state: string | null;
  readonly role: string | null;
  readonly label: string | null;
  readonly wrapper: string | null;
  readonly directWrapperCount: number;
  readonly descendantWrapperCount: number;
  readonly namedGroupCount: number;
  readonly hiddenHelperCount: number;
  readonly tokenElementCount: number;
  readonly textLength: number;
  readonly contentTextLength: number;
  readonly textSha256: string;
  readonly contentTextSha256: string;
  readonly selectionSha256: string;
  readonly selectionLength: number;
  readonly containsStateLabel: boolean;
  readonly tokenSignature: readonly {
    readonly kind: number;
    readonly tag: string | null;
    readonly className: string | null;
    readonly style: string | null;
    readonly textLength: number;
    readonly textSha256: string;
  }[];
}

const sha256 = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

const readSemanticLineSignature = async (line: Locator): Promise<SemanticLineSignature> => {
  const snapshot = await line.evaluate((element) => {
    const lineElement = element as HTMLElement;
    const stateLabels = ['強調行', '追加行', '削除行'];
    const selection = lineElement.ownerDocument.defaultView?.getSelection();
    if (!selection) throw new Error('Selection API is unavailable.');
    const range = lineElement.ownerDocument.createRange();
    range.selectNodeContents(lineElement);
    selection.removeAllRanges();
    selection.addRange(range);
    const selectedText = selection.toString();
    selection.removeAllRanges();

    const wrapper = lineElement.firstElementChild;
    const contentOwner =
      wrapper && ['mark', 'ins', 'del'].includes(wrapper.localName) ? wrapper : lineElement;
    const lineText = lineElement.textContent ?? '';
    const contentText = contentOwner.textContent ?? '';
    return {
      state: lineElement.getAttribute('data-code-line-state'),
      role: lineElement.getAttribute('role'),
      label: lineElement.getAttribute('aria-label'),
      wrapper:
        wrapper && ['mark', 'ins', 'del'].includes(wrapper.localName) ? wrapper.localName : null,
      directWrapperCount: lineElement.querySelectorAll(':scope > mark, :scope > ins, :scope > del')
        .length,
      descendantWrapperCount: lineElement.querySelectorAll('mark, ins, del').length,
      namedGroupCount:
        (lineElement.matches('[role="group"][aria-label]') ? 1 : 0) +
        lineElement.querySelectorAll('[role="group"][aria-label]').length,
      hiddenHelperCount: lineElement.querySelectorAll(
        '[hidden], [aria-hidden="true"], .sr-only, [data-sr-only]',
      ).length,
      tokenElementCount: contentOwner.querySelectorAll('span').length,
      lineText,
      contentText,
      selectedText,
      containsStateLabel: stateLabels.some((label) => selectedText.includes(label)),
      tokenSignature: [...contentOwner.childNodes].map((node) => ({
        kind: node.nodeType,
        tag: node instanceof Element ? node.localName : null,
        className: node instanceof Element ? node.getAttribute('class') : null,
        style: node instanceof Element ? node.getAttribute('style') : null,
        text: node.textContent ?? '',
      })),
    };
  });

  return {
    state: snapshot.state,
    role: snapshot.role,
    label: snapshot.label,
    wrapper: snapshot.wrapper,
    directWrapperCount: snapshot.directWrapperCount,
    descendantWrapperCount: snapshot.descendantWrapperCount,
    namedGroupCount: snapshot.namedGroupCount,
    hiddenHelperCount: snapshot.hiddenHelperCount,
    tokenElementCount: snapshot.tokenElementCount,
    textLength: snapshot.lineText.length,
    contentTextLength: snapshot.contentText.length,
    textSha256: sha256(snapshot.lineText),
    contentTextSha256: sha256(snapshot.contentText),
    selectionSha256: sha256(snapshot.selectedText),
    selectionLength: snapshot.selectedText.length,
    containsStateLabel: snapshot.containsStateLabel,
    tokenSignature: snapshot.tokenSignature.map((token) => ({
      kind: token.kind,
      tag: token.tag,
      className: token.className,
      style: token.style,
      textLength: token.text.length,
      textSha256: sha256(token.text),
    })),
  };
};

const assertSemanticCodeBlock = async (pre: Locator, surface: string): Promise<unknown[]> => {
  await expect(pre, `${surface} code block`).toHaveCount(1);
  await expect(pre, `${surface} code block visibility`).toBeVisible();
  const signatures: SemanticLineSignature[] = [];

  for (const state of LINE_STATES) {
    const line = pre.locator(`[data-code-line-state="${state}"]`);
    await expect(line, `${surface}/${state} line`).toHaveCount(1);
    await expect(line, `${surface}/${state} line visibility`).toBeVisible();
    const signature = await readSemanticLineSignature(line);
    signatures.push(signature);

    expect(signature.state, `${surface}/${state} normalized state`).toBe(state);
    expect(signature.hiddenHelperCount, `${surface}/${state} hidden helper`).toBe(0);
    expect(signature.textLength, `${surface}/${state} code text length`).toBeGreaterThan(0);
    expect(signature.tokenElementCount, `${surface}/${state} token content`).toBeGreaterThan(0);
    expect(signature.selectionLength, `${surface}/${state} selection length`).toBe(
      signature.textLength,
    );
    expect(signature.selectionSha256, `${surface}/${state} selection hash`).toBe(
      signature.textSha256,
    );
    expect(signature.containsStateLabel, `${surface}/${state} selection annotation`).toBe(false);

    if (state === 'normal') {
      expect(signature.role, `${surface}/normal role`).toBeNull();
      expect(signature.label, `${surface}/normal name`).toBeNull();
      expect(signature.wrapper, `${surface}/normal wrapper`).toBeNull();
      expect(signature.directWrapperCount, `${surface}/normal direct wrapper`).toBe(0);
      expect(signature.descendantWrapperCount, `${surface}/normal nested wrapper`).toBe(0);
      expect(signature.namedGroupCount, `${surface}/normal named group`).toBe(0);
      continue;
    }

    const semantics = STATE_SEMANTICS[state];
    expect(signature.role, `${surface}/${state} role`).toBe('group');
    expect(signature.label, `${surface}/${state} name`).toBe(semantics.label);
    expect(signature.wrapper, `${surface}/${state} wrapper`).toBe(semantics.wrapper);
    expect(signature.directWrapperCount, `${surface}/${state} direct wrapper count`).toBe(1);
    expect(signature.descendantWrapperCount, `${surface}/${state} wrapper count`).toBe(1);
    expect(signature.namedGroupCount, `${surface}/${state} named group count`).toBe(1);
    expect(signature.contentTextLength, `${surface}/${state} wrapped content length`).toBe(
      signature.textLength,
    );
    expect(signature.contentTextSha256, `${surface}/${state} wrapped content hash`).toBe(
      signature.textSha256,
    );
    await expect(pre.getByRole('group', { name: semantics.label, exact: true })).toHaveCount(1);
    const localAccessibility = await line.ariaSnapshot();
    expect(
      localAccessibility.includes(`group "${semantics.label}"`),
      `${surface}/${state} local accessibility role and name`,
    ).toBe(true);
  }

  return signatures;
};

const assertTemplateSourceIsIndependent = async (pre: Locator, surface: string): Promise<void> => {
  const result = await pre.evaluate((element) => {
    const preElement = element as HTMLElement;
    const panel = preElement.closest<HTMLElement>('[data-code-group-panel]');
    const root = preElement.closest<HTMLElement>('[data-code-block-root]');
    const template = (panel ?? root)?.querySelector<HTMLTemplateElement>(
      ':scope > template[data-code-copy-source]',
    );
    if (!template) throw new Error('Code copy source template is unavailable.');
    const source = template.content.textContent ?? '';
    return {
      source,
      templateInsideDisplay: preElement.contains(template),
      containsStateLabel: ['強調行', '追加行', '削除行'].some((label) => source.includes(label)),
    };
  });

  expect(result.source.length, `${surface} copy source length`).toBeGreaterThan(0);
  expect(sha256(result.source), `${surface} copy source hash`).toMatch(/^[a-f0-9]{64}$/u);
  expect(result.templateInsideDisplay, `${surface} copy source ownership`).toBe(false);
  expect(result.containsStateLabel, `${surface} copy source annotation`).toBe(false);
};

const assertCopyResult = async (page: Page, pre: Locator, surface: string): Promise<void> => {
  const result = await pre.evaluate(async (element) => {
    const preElement = element as HTMLElement;
    const panel = preElement.closest<HTMLElement>('[data-code-group-panel]');
    const root = preElement.closest<HTMLElement>('[data-code-block-root]');
    const group = preElement.closest<HTMLElement>('section[data-code-group]');
    const template = (panel ?? root)?.querySelector<HTMLTemplateElement>(
      ':scope > template[data-code-copy-source]',
    );
    const button = group
      ? group.querySelector<HTMLButtonElement>(
          ':scope > .code-group-header [data-code-group-copy][data-copy-button]',
        )
      : root?.querySelector<HTMLButtonElement>('[data-copy-button]');
    if (!template || !button) throw new Error('Code copy contract nodes are unavailable.');

    const holder = window as typeof window & { __rouaultCapturedCopy?: string };
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (value: string) => {
          holder.__rouaultCapturedCopy = value;
          return Promise.resolve();
        },
      },
    });
    delete holder.__rouaultCapturedCopy;
    button.click();
    await Promise.resolve();
    const source = template.content.textContent ?? '';
    const copied = holder.__rouaultCapturedCopy ?? '';
    return {
      equal: copied === source,
      source,
      copied,
    };
  });

  expect(result.equal, `${surface} copy exactness`).toBe(true);
  expect(result.copied.length, `${surface} copy UTF-16 length`).toBe(result.source.length);
  expect(sha256(result.copied), `${surface} copy SHA-256`).toBe(sha256(result.source));
  await page.waitForTimeout(0);
};

test('line state semantics remain available across SSR, no-JS, group, and preview surfaces', async ({
  browser,
}) => {
  test.slow();

  const noJavaScriptContext = await browser.newContext({ javaScriptEnabled: false });
  let noJavaScriptGroupSignature: unknown[];
  try {
    const page = await noJavaScriptContext.newPage();
    await page.goto(e2eNoteFixtures.code.directPath, { waitUntil: 'networkidle' });
    const groupPre = page.locator(
      'pre[data-code-block][data-code-filename="line-state-group-active.ts"]',
    );
    noJavaScriptGroupSignature = await assertSemanticCodeBlock(groupPre, 'group-no-js');
    await assertTemplateSourceIsIndependent(groupPre, 'group-no-js');
    await expect(
      groupPre.locator('xpath=ancestor::section[@data-code-group][1]'),
    ).not.toHaveAttribute('data-code-group-enhanced', 'true');
  } finally {
    await noJavaScriptContext.close();
  }

  const context = await browser.newContext({ javaScriptEnabled: true });
  try {
    const page = await context.newPage();
    await page.goto(e2eNoteFixtures.code.directPath, { waitUntil: 'networkidle' });

    const standalone = page.locator(
      'pre[data-code-block][data-code-filename="line-state-standalone.ts"]',
    );
    await assertSemanticCodeBlock(standalone, 'standalone');
    await assertTemplateSourceIsIndependent(standalone, 'standalone');
    await assertCopyResult(page, standalone, 'standalone');

    const group = page.locator(
      'pre[data-code-block][data-code-filename="line-state-group-active.ts"]',
    );
    const groupSignature = await assertSemanticCodeBlock(group, 'group-enhanced');
    expect(groupSignature, 'group semantic subtree across enhancement').toEqual(
      noJavaScriptGroupSignature,
    );
    await assertTemplateSourceIsIndependent(group, 'group-enhanced');
    await assertCopyResult(page, group, 'group-enhanced');

    const groupRoot = group.locator('xpath=ancestor::section[@data-code-group][1]');
    const groupBeforeSwitch = await groupRoot
      .locator('[data-code-line-state]')
      .evaluateAll((lines) =>
        lines.map((line) => ({
          state: line.getAttribute('data-code-line-state'),
          role: line.getAttribute('role'),
          label: line.getAttribute('aria-label'),
          wrapper: line.firstElementChild?.localName ?? null,
          wrapperCount: line.querySelectorAll('mark, ins, del').length,
        })),
      );
    await groupRoot.locator('[data-code-group-tab][data-code-group-key="secondary"]').click();
    expect(
      await groupRoot.locator('[data-code-line-state]').evaluateAll((lines) =>
        lines.map((line) => ({
          state: line.getAttribute('data-code-line-state'),
          role: line.getAttribute('role'),
          label: line.getAttribute('aria-label'),
          wrapper: line.firstElementChild?.localName ?? null,
          wrapperCount: line.querySelectorAll('mark, ins, del').length,
        })),
      ),
      'group semantic subtree after active panel switch',
    ).toEqual(groupBeforeSwitch);
    const secondary = page.locator(
      'pre[data-code-block][data-code-filename="line-state-group-secondary.ts"]',
    );
    await assertTemplateSourceIsIndependent(secondary, 'group-secondary');
    await assertCopyResult(page, secondary, 'group-secondary');

    const preview = page.locator(
      'pre[data-code-block][data-code-filename="line-state-preview.html"]',
    );
    const previewBefore = await assertSemanticCodeBlock(preview, 'preview');
    await assertTemplateSourceIsIndependent(preview, 'preview');
    await assertCopyResult(page, preview, 'preview');
    const previewHost = preview.locator('xpath=ancestor::*[@data-code-preview-root][1]');
    await previewHost.evaluate((element) => element.setAttribute('data-preview-theme', 'dark'));
    await expect(previewHost).toHaveAttribute('data-preview-theme', 'dark');
    expect(await assertSemanticCodeBlock(preview, 'preview-updated')).toEqual(previewBefore);
  } finally {
    await context.close();
  }
});

const copyFocusEnvironments = [
  { label: 'light / OS light', theme: 'light', colorScheme: 'light', forcedColors: 'none' },
  { label: 'dark / OS dark', theme: 'dark', colorScheme: 'dark', forcedColors: 'none' },
  { label: 'system / OS light', theme: 'system', colorScheme: 'light', forcedColors: 'none' },
  { label: 'system / OS dark', theme: 'system', colorScheme: 'dark', forcedColors: 'none' },
  { label: 'forced colors', theme: 'light', colorScheme: 'light', forcedColors: 'active' },
] as const;

const copyFocusSurfaces = [
  { label: 'standalone', filename: 'line-state-standalone.ts' },
  { label: 'group', filename: 'line-state-group-active.ts' },
  { label: 'preview', filename: 'line-state-preview.html' },
] as const;

for (const environment of copyFocusEnvironments) {
  test(`Copy button は ${environment.label} の production CSS で有効な focus token を使う`, async ({
    page,
  }) => {
    await page.emulateMedia({
      colorScheme: environment.colorScheme,
      forcedColors: environment.forcedColors,
    });
    await page.goto(e2eNoteFixtures.code.directPath, { waitUntil: 'networkidle' });
    await page.evaluate((value) => {
      document.documentElement.dataset['theme'] = value;
    }, environment.theme);
    await expect(page.locator('html')).toHaveAttribute('data-theme', environment.theme);
    if (environment.theme === 'system') {
      const mapping = await page.evaluate((scheme) => {
        const root = document.documentElement;
        const system = getComputedStyle(root).getPropertyValue('--focus-ring-color').trim();
        try {
          root.dataset['theme'] = scheme;
          return {
            system,
            explicit: getComputedStyle(root).getPropertyValue('--focus-ring-color').trim(),
          };
        } finally {
          root.dataset['theme'] = 'system';
        }
      }, environment.colorScheme);
      expect(mapping.system).not.toBe('');
      expect(mapping.system).toBe(mapping.explicit);
    }
    for (const surface of copyFocusSurfaces) {
      await test.step(surface.label, async () => {
        const pre = page.locator(`pre[data-code-block][data-code-filename="${surface.filename}"]`);
        await expect(pre).toBeVisible();
        const owner =
          surface.label === 'group'
            ? pre.locator('xpath=ancestor::section[@data-code-group][1]')
            : pre.locator('xpath=ancestor::*[@data-code-block-root][1]');
        const button =
          surface.label === 'group'
            ? owner.locator(
                ':scope > .code-group-header button[data-code-group-copy][data-copy-button]',
              )
            : owner
                .locator('button.static-copy-button[data-copy-button][data-copy-target-id]')
                .first();
        await expect(button).toBeEnabled();
        await expect(button).toBeVisible();
        // 直前の操作対象へ戻してから、実際の Tab 移動で Copy へ入れることを固定する。
        await button.focus();
        await page.keyboard.press('Shift+Tab');
        await expect(button).not.toBeFocused();
        await page.keyboard.press('Tab');
        await expect(button).toBeFocused();
        const focus = await button.evaluate(async (element) => {
          await Promise.all(element.getAnimations().map((animation) => animation.finished));
          const probe = document.createElement('button');
          probe.type = 'button';
          probe.tabIndex = -1;
          probe.style.cssText =
            'outline: var(--focus-ring-width) solid var(--focus-ring-color); outline-offset: var(--focus-ring-offset);';
          element.parentElement?.append(probe);
          const actual = getComputedStyle(element);
          const rgba = (color: string): number[] => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 1;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Canvas 2D が必要です');
            context.fillStyle = color;
            context.fillRect(0, 0, 1, 1);
            return Array.from(context.getImageData(0, 0, 1, 1).data);
          };
          const result = {
            visible: element.matches(':focus-visible'),
            forcedColors: matchMedia('(forced-colors: active)').matches,
            osDark: matchMedia('(prefers-color-scheme: dark)').matches,
            theme: document.documentElement.dataset['theme'] ?? null,
            style: actual.outlineStyle,
            width: actual.outlineWidth,
            offset: actual.outlineOffset,
            color: rgba(actual.outlineColor),
          };
          // forced colors の補正と focus animation は focus 状態にも依存する。
          // 同じ button を同じ keyboard focus 状態で測り、色の比較を保持する。
          probe.focus({ preventScroll: true });
          await Promise.all(probe.getAnimations().map((animation) => animation.finished));
          const expectedColor = rgba(getComputedStyle(probe).outlineColor);
          probe.remove();
          if (element instanceof HTMLElement) element.focus({ preventScroll: true });
          return { ...result, expectedColor, restoredFocus: document.activeElement === element };
        });

        expect(focus.visible).toBe(true);
        expect(focus.restoredFocus).toBe(true);
        expect(focus.forcedColors).toBe(environment.forcedColors === 'active');
        expect(focus.osDark).toBe(environment.colorScheme === 'dark');
        expect(focus.theme).toBe(environment.theme);
        expect(focus.style).toBe('solid');
        expect(focus.width).toBe('2px');
        expect(focus.offset).toBe('2px');
        expect(focus.color).toEqual(focus.expectedColor);
        // システムの Highlight は半透明にもなるため、可視性は非ゼロ alpha で固定する。
        expect(focus.color[3]).toBeGreaterThan(0);
      });
    }
  });
}
