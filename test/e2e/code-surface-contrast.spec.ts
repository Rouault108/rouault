import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { expect, test } from '@playwright/test';

import {
  type PaletteSlot,
  ROUAULT_SYNTAX_PALETTES,
  ROUAULT_SYNTAX_PALETTE_SLOTS,
} from '../../build/rehype/shiki-theme-definition.js';
import {
  RESOLVED_THEME_ATTRIBUTE,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
} from '../../src/theme/theme-manager.js';
import { e2eNoteFixtures } from './support/note-fixtures.js';

const TEST_FILE = 'test/e2e/code-surface-contrast.spec.ts';
const THEMES = ['light', 'dark'] as const;
const STATES = ['normal', 'highlight', 'diff-add', 'diff-remove'] as const;
const PALETTE_SLOTS = ROUAULT_SYNTAX_PALETTE_SLOTS;
type ContrastTheme = (typeof THEMES)[number];
type ContrastState = (typeof STATES)[number];
type ForegroundOwner = 'base-foreground' | 'palette-slot' | 'unexpected-foreground';
type ContrastRunKind = 'standard' | 'targeted' | 'regression';

interface FixtureDefinition {
  readonly filename: string;
  readonly language: 'typescript' | 'c' | 'json' | 'shell' | 'csharp';
}

const INVENTORY_FIXTURES = [
  { filename: 'contrast-typescript.tsx', language: 'typescript' },
  { filename: 'contrast-c.c', language: 'c' },
  { filename: 'contrast-json.json', language: 'json' },
  { filename: 'contrast-shell.sh', language: 'shell' },
  { filename: 'contrast-csharp.cs', language: 'csharp' },
] as const satisfies readonly FixtureDefinition[];

const STATE_FIXTURE_FILENAME = 'contrast-states.ts';
const EXPECTED_BLOCKS = [
  ...INVENTORY_FIXTURES.map((fixture) => fixture.filename),
  STATE_FIXTURE_FILENAME,
] as const;

interface RunConfiguration {
  readonly runKind: ContrastRunKind;
  readonly artifactPath: string | null;
}

const resolveRunConfiguration = (): RunConfiguration => {
  const rawRunKind = process.env['ROUAULT_CODE_CONTRAST_RUN_KIND']?.trim();
  if (!rawRunKind) return { runKind: 'standard', artifactPath: null };
  if (rawRunKind === 'targeted' || rawRunKind === 'regression') {
    return {
      runKind: rawRunKind,
      artifactPath: path.resolve(
        process.cwd(),
        `.generated/e2e/code-surface-contrast.${rawRunKind}.json`,
      ),
    };
  }
  throw new Error(
    `Invalid ROUAULT_CODE_CONTRAST_RUN_KIND: ${JSON.stringify(rawRunKind)}. ` +
      'Expected targeted, regression, or an unset environment variable.',
  );
};

const RUN_CONFIGURATION = resolveRunConfiguration();

interface ContrastRecord {
  readonly theme: ContrastTheme;
  readonly sourceLanguage: FixtureDefinition['language'];
  readonly sourceCodeBlockId: string;
  readonly sourceLineIndex: number;
  readonly sourceElementPath: string;
  readonly foregroundOwner: ForegroundOwner;
  readonly paletteSlot: PaletteSlot | null;
  readonly rawForegroundCss: string;
  readonly normalizedRawForegroundRgb: string | null;
  readonly computedForegroundCss: string;
  readonly normalizedComputedForegroundRgb: string | null;
  readonly state: ContrastState;
  readonly finalForegroundRgb: string;
  readonly finalBackgroundRgb: string;
  readonly ratio: number;
  readonly result: 'pass' | 'fail';
}

interface ThemeStateEvidence {
  readonly requestedTheme: ContrastTheme;
  readonly preference: string | null;
  readonly resolvedTheme: string | null;
  readonly colorScheme: string;
}

interface ThemeMeasurement {
  readonly theme: ContrastTheme;
  readonly themeState: ThemeStateEvidence;
  readonly resolvedBlockCounts: Readonly<Record<string, number>>;
  readonly paletteRgbBySlot: Readonly<Record<PaletteSlot, string>>;
  readonly usedPaletteSlots: readonly PaletteSlot[];
  readonly slotStateCoverage: Readonly<
    Record<PaletteSlot, Readonly<Record<ContrastState, number>>>
  >;
  readonly foregroundOwnerCounts: Readonly<Record<ForegroundOwner, number>>;
  readonly stateBackgrounds: Readonly<Record<ContrastState, string>>;
  readonly records: readonly ContrastRecord[];
  readonly errors: readonly string[];
}

interface ContrastCoverage {
  readonly expectedBlocks: readonly string[];
  readonly resolvedBlocks: Readonly<Record<ContrastTheme, Readonly<Record<string, number>>>>;
  readonly themes: readonly ThemeStateEvidence[];
  readonly languages: readonly FixtureDefinition['language'][];
  readonly states: readonly ContrastState[];
  readonly expectedPaletteSlots: readonly PaletteSlot[];
  readonly usedPaletteSlotsByTheme: Readonly<Record<ContrastTheme, readonly PaletteSlot[]>>;
  readonly foregroundOwnerCountsByTheme: Readonly<
    Record<ContrastTheme, Readonly<Record<ForegroundOwner, number>>>
  >;
  readonly slotStateCoverageByTheme: Readonly<
    Record<ContrastTheme, Readonly<Record<PaletteSlot, Readonly<Record<ContrastState, number>>>>>
  >;
  readonly stateBackgroundsByTheme: Readonly<
    Record<ContrastTheme, Readonly<Record<ContrastState, string>>>
  >;
  readonly recordCount: number;
}

interface ContrastEvidence {
  readonly runId: string;
  readonly generatedAt: string;
  readonly testFile: string;
  readonly project: string;
  readonly runKind: ContrastRunKind;
  readonly coverage: ContrastCoverage;
  readonly records: readonly ContrastRecord[];
  readonly errors: readonly string[];
}

const emptySlotStateCoverage = (): Record<PaletteSlot, Record<ContrastState, number>> =>
  Object.fromEntries(
    PALETTE_SLOTS.map((slot) => [
      slot,
      { normal: 0, highlight: 0, 'diff-add': 0, 'diff-remove': 0 },
    ]),
  ) as Record<PaletteSlot, Record<ContrastState, number>>;

const createFallbackThemeMeasurement = (theme: ContrastTheme, error: string): ThemeMeasurement => ({
  theme,
  themeState: { requestedTheme: theme, preference: null, resolvedTheme: null, colorScheme: '' },
  resolvedBlockCounts: Object.fromEntries(EXPECTED_BLOCKS.map((filename) => [filename, 0])),
  paletteRgbBySlot: Object.fromEntries(PALETTE_SLOTS.map((slot) => [slot, ''])) as Record<
    PaletteSlot,
    string
  >,
  usedPaletteSlots: [],
  slotStateCoverage: emptySlotStateCoverage(),
  foregroundOwnerCounts: {
    'base-foreground': 0,
    'palette-slot': 0,
    'unexpected-foreground': 0,
  },
  stateBackgrounds: { normal: '', highlight: '', 'diff-add': '', 'diff-remove': '' },
  records: [],
  errors: [error],
});

const sortRecords = (records: readonly ContrastRecord[]): ContrastRecord[] =>
  [...records].sort((left, right) =>
    [
      left.theme,
      left.sourceLanguage,
      left.sourceCodeBlockId,
      left.sourceLineIndex.toString().padStart(6, '0'),
      left.sourceElementPath,
      left.paletteSlot ?? 'unexpected',
      left.state,
    ]
      .join('\u0000')
      .localeCompare(
        [
          right.theme,
          right.sourceLanguage,
          right.sourceCodeBlockId,
          right.sourceLineIndex.toString().padStart(6, '0'),
          right.sourceElementPath,
          right.paletteSlot ?? 'unexpected',
          right.state,
        ].join('\u0000'),
      ),
  );

const writeFormalArtifact = async (
  artifactPath: string,
  evidence: ContrastEvidence,
): Promise<void> => {
  await mkdir(path.dirname(artifactPath), { recursive: true });
  const temporaryPath = `${artifactPath}.tmp-${process.pid.toString()}-${Date.now().toString()}`;
  await writeFile(temporaryPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, artifactPath);
};

test('production code surface palette slots maintain contrast across all semantic line states', async ({
  browser,
  baseURL,
}, testInfo) => {
  const generatedAt = new Date().toISOString();
  const runId = `code-surface-contrast-${RUN_CONFIGURATION.runKind}-${generatedAt.replace(/[^0-9]/gu, '')}-${process.pid.toString()}`;
  const measurements: ThemeMeasurement[] = [];
  const lifecycleErrors: string[] = [];
  let measurementReached = false;

  for (const theme of THEMES) {
    let context: Awaited<ReturnType<typeof browser.newContext>> | null = null;
    try {
      context = await browser.newContext({ ...(baseURL ? { baseURL } : {}), colorScheme: theme });
      await context.addInitScript(
        ({ storageKey, requestedTheme }) => {
          window.localStorage.setItem(storageKey, requestedTheme);
        },
        { storageKey: THEME_STORAGE_KEY, requestedTheme: theme },
      );
      const page = await context.newPage();
      await page.goto(e2eNoteFixtures.code.directPath, { waitUntil: 'networkidle' });
      measurementReached = true;

      const measurement = await page.evaluate<
        ThemeMeasurement,
        {
          readonly theme: ContrastTheme;
          readonly themeAttribute: string;
          readonly resolvedThemeAttribute: string;
          readonly inventoryFixtures: readonly FixtureDefinition[];
          readonly stateFixtureFilename: string;
          readonly expectedBlocks: readonly string[];
          readonly palette: Readonly<Record<PaletteSlot, string>>;
          readonly paletteSlots: readonly PaletteSlot[];
          readonly states: readonly ContrastState[];
        }
      >(
        ({
          theme: activeTheme,
          themeAttribute,
          resolvedThemeAttribute,
          inventoryFixtures,
          stateFixtureFilename,
          expectedBlocks,
          palette,
          paletteSlots,
          states,
        }) => {
          interface RgbaColor {
            readonly r: number;
            readonly g: number;
            readonly b: number;
            readonly a: number;
          }
          interface ForegroundOccurrence {
            readonly sourceLanguage: FixtureDefinition['language'];
            readonly sourceCodeBlockId: string;
            readonly sourceLineIndex: number;
            readonly sourceElementPath: string;
            readonly foregroundOwner: ForegroundOwner;
            readonly paletteSlot: PaletteSlot | null;
            readonly rawForegroundCss: string;
            readonly normalizedRawForegroundRgb: string | null;
            readonly computedForegroundCss: string;
            readonly normalizedComputedForegroundRgb: string | null;
          }

          const errors: string[] = [];
          const canvas = document.createElement('canvas');
          canvas.width = 1;
          canvas.height = 1;
          const canvasContext = canvas.getContext('2d', { willReadFrequently: true });
          const parseColor = (cssColor: string): RgbaColor | null => {
            if (!canvasContext || cssColor.trim().length === 0) return null;
            canvasContext.clearRect(0, 0, 1, 1);
            canvasContext.fillStyle = '#010203';
            canvasContext.fillStyle = cssColor;
            if (canvasContext.fillStyle === '#010203' && cssColor.toLowerCase() !== '#010203') {
              return null;
            }
            canvasContext.fillRect(0, 0, 1, 1);
            const [r = 0, g = 0, b = 0, alpha = 0] = canvasContext.getImageData(0, 0, 1, 1).data;
            return { r, g, b, a: alpha / 255 };
          };
          const composite = (foreground: RgbaColor, background: RgbaColor): RgbaColor => {
            const alpha = foreground.a + background.a * (1 - foreground.a);
            if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
            return {
              r:
                (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) /
                alpha,
              g:
                (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) /
                alpha,
              b:
                (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) /
                alpha,
              a: alpha,
            };
          };
          const rgbString = (color: RgbaColor): string =>
            `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;
          const opaqueRgb = (cssColor: string, label: string): string | null => {
            const parsed = parseColor(cssColor);
            if (!parsed) {
              errors.push(`${label}: color parse failed.`);
              return null;
            }
            if (parsed.a < 0.999) {
              errors.push(`${label}: expected opaque color.`);
              return null;
            }
            return rgbString(parsed);
          };
          const finalBackgroundFor = (element: Element, label: string): RgbaColor | null => {
            const ancestors: Element[] = [];
            let current: Element | null = element;
            while (current) {
              ancestors.unshift(current);
              current = current.parentElement;
            }
            let result: RgbaColor = { r: 0, g: 0, b: 0, a: 0 };
            for (const ancestor of ancestors) {
              const layer = parseColor(getComputedStyle(ancestor).backgroundColor);
              if (!layer) {
                errors.push(`${label}: background parse failed.`);
                return null;
              }
              result = composite(layer, result);
            }
            if (result.a < 0.999) {
              errors.push(`${label}: final background is not opaque.`);
              return null;
            }
            return result;
          };
          const relativeLuminance = (color: RgbaColor): number => {
            const channel = (value: number): number => {
              const normalized = value / 255;
              return normalized <= 0.04045
                ? normalized / 12.92
                : ((normalized + 0.055) / 1.055) ** 2.4;
            };
            return (
              0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b)
            );
          };
          const contrastRatio = (foreground: RgbaColor, background: RgbaColor): number => {
            const foregroundLuminance = relativeLuminance(foreground);
            const backgroundLuminance = relativeLuminance(background);
            return (
              (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
              (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
            );
          };
          const elementPath = (element: Element, root: Element): string => {
            const parts: string[] = [];
            let current: Element | null = element;
            while (current && current !== root) {
              const parent: Element | null = current.parentElement;
              const index = parent ? [...parent.children].indexOf(current) + 1 : 1;
              parts.unshift(`${current.tagName.toLowerCase()}:nth-child(${index.toString()})`);
              current = parent;
            }
            return parts.join(' > ');
          };

          const root = document.documentElement;
          const themeState: ThemeStateEvidence = {
            requestedTheme: activeTheme,
            preference: root.getAttribute(themeAttribute),
            resolvedTheme: root.getAttribute(resolvedThemeAttribute),
            colorScheme: getComputedStyle(root).colorScheme,
          };
          if (
            themeState.preference !== activeTheme ||
            themeState.resolvedTheme !== activeTheme ||
            themeState.colorScheme !== activeTheme
          ) {
            errors.push(`${activeTheme}: theme contract mismatch.`);
          }

          const resolvedBlockCounts = Object.fromEntries(
            expectedBlocks.map((filename) => [
              filename,
              document.querySelectorAll(
                `pre[data-code-block][data-code-filename="${CSS.escape(filename)}"]`,
              ).length,
            ]),
          );
          const paletteRgbBySlot = Object.fromEntries(
            paletteSlots.map((slot) => [
              slot,
              opaqueRgb(palette[slot], `${activeTheme}/${slot} palette`) ?? '',
            ]),
          ) as Record<PaletteSlot, string>;
          if (new Set(Object.values(paletteRgbBySlot)).size !== paletteSlots.length) {
            errors.push(`${activeTheme}: palette colors are not uniquely reversible.`);
          }
          const slotsForRgb = (rgb: string | null): PaletteSlot[] =>
            rgb ? paletteSlots.filter((slot) => paletteRgbBySlot[slot] === rgb) : [];

          const stateBackgroundColors: Partial<Record<ContrastState, RgbaColor>> = {};
          const stateBackgrounds: Record<ContrastState, string> = {
            normal: '',
            highlight: '',
            'diff-add': '',
            'diff-remove': '',
          };
          const stateBlocks = document.querySelectorAll(
            `pre[data-code-block][data-code-filename="${CSS.escape(stateFixtureFilename)}"]`,
          );
          const stateBlock = stateBlocks.length === 1 ? stateBlocks[0] : undefined;
          if (!stateBlock) {
            errors.push(
              `Expected exactly one state fixture ${stateFixtureFilename}, found ${stateBlocks.length.toString()}.`,
            );
          } else {
            const lines = [...stateBlock.querySelectorAll('.line')];
            const lineByState: Record<ContrastState, Element | undefined> = {
              normal: lines.find(
                (line) =>
                  !line.classList.contains('highlighted') &&
                  !line.classList.contains('ui-explicit-highlight') &&
                  !line.classList.contains('diff'),
              ),
              highlight: lines.find(
                (line) =>
                  line.classList.contains('highlighted') ||
                  line.classList.contains('ui-explicit-highlight'),
              ),
              'diff-add': lines.find(
                (line) => line.classList.contains('diff') && line.classList.contains('add'),
              ),
              'diff-remove': lines.find(
                (line) => line.classList.contains('diff') && line.classList.contains('remove'),
              ),
            };
            for (const state of states) {
              const line = lineByState[state];
              if (!line) {
                errors.push(`${activeTheme}: missing ${state} state line.`);
                continue;
              }
              const background = finalBackgroundFor(line, `${activeTheme}/${state}`);
              if (background) {
                stateBackgroundColors[state] = background;
                stateBackgrounds[state] = rgbString(background);
              }
            }
          }

          const activeRawProperty = activeTheme === 'light' ? 'color' : '--shiki-dark';
          const occurrences: ForegroundOccurrence[] = [];
          const foregroundOwnerCounts: Record<ForegroundOwner, number> = {
            'base-foreground': 0,
            'palette-slot': 0,
            'unexpected-foreground': 0,
          };
          for (const fixture of inventoryFixtures) {
            const blocks = document.querySelectorAll<HTMLElement>(
              `pre[data-code-block][data-code-filename="${CSS.escape(fixture.filename)}"]`,
            );
            if (blocks.length !== 1 || blocks[0] === undefined) {
              errors.push(
                `Expected exactly one ${fixture.filename} fixture, found ${blocks.length.toString()}.`,
              );
              continue;
            }
            const block = blocks[0];
            const lineElements = [...block.querySelectorAll('.line')];
            const tokens = [...block.querySelectorAll<HTMLElement>('span[style]')].filter(
              (token) => token.style.getPropertyValue(activeRawProperty).trim().length > 0,
            );
            for (const token of tokens) {
              const rawForegroundCss = token.style.getPropertyValue(activeRawProperty).trim();
              const normalizedRawForegroundRgb = opaqueRgb(
                rawForegroundCss,
                `${activeTheme}/${fixture.filename}/raw`,
              );
              const computedForegroundCss = getComputedStyle(token).color;
              const normalizedComputedForegroundRgb = opaqueRgb(
                computedForegroundCss,
                `${activeTheme}/${fixture.filename}/computed`,
              );
              const rawSlots = slotsForRgb(normalizedRawForegroundRgb);
              const computedSlots = slotsForRgb(normalizedComputedForegroundRgb);
              const paletteSlot =
                rawSlots.length === 1 &&
                computedSlots.length === 1 &&
                rawSlots[0] === computedSlots[0]
                  ? (rawSlots[0] ?? null)
                  : null;
              const foregroundOwner: ForegroundOwner = paletteSlot
                ? paletteSlot === 'base'
                  ? 'base-foreground'
                  : 'palette-slot'
                : 'unexpected-foreground';
              foregroundOwnerCounts[foregroundOwner] += 1;
              const line = token.closest('.line');
              occurrences.push({
                sourceLanguage: fixture.language,
                sourceCodeBlockId: fixture.filename,
                sourceLineIndex: line ? lineElements.indexOf(line) : -1,
                sourceElementPath: elementPath(token, block),
                foregroundOwner,
                paletteSlot,
                rawForegroundCss,
                normalizedRawForegroundRgb,
                computedForegroundCss,
                normalizedComputedForegroundRgb,
              });
            }
          }

          const slotStateCoverage = Object.fromEntries(
            paletteSlots.map((slot) => [
              slot,
              { normal: 0, highlight: 0, 'diff-add': 0, 'diff-remove': 0 },
            ]),
          ) as Record<PaletteSlot, Record<ContrastState, number>>;
          const records: ContrastRecord[] = [];
          for (const occurrence of occurrences) {
            const foreground = parseColor(occurrence.computedForegroundCss);
            if (!foreground) continue;
            for (const state of states) {
              const background = stateBackgroundColors[state];
              if (!background) continue;
              const finalForeground = composite(foreground, background);
              const ratio = contrastRatio(finalForeground, background);
              records.push({
                theme: activeTheme,
                sourceLanguage: occurrence.sourceLanguage,
                sourceCodeBlockId: occurrence.sourceCodeBlockId,
                sourceLineIndex: occurrence.sourceLineIndex,
                sourceElementPath: occurrence.sourceElementPath,
                foregroundOwner: occurrence.foregroundOwner,
                paletteSlot: occurrence.paletteSlot,
                rawForegroundCss: occurrence.rawForegroundCss,
                normalizedRawForegroundRgb: occurrence.normalizedRawForegroundRgb,
                computedForegroundCss: occurrence.computedForegroundCss,
                normalizedComputedForegroundRgb: occurrence.normalizedComputedForegroundRgb,
                state,
                finalForegroundRgb: rgbString(finalForeground),
                finalBackgroundRgb: rgbString(background),
                ratio: Number(ratio.toFixed(4)),
                result: ratio >= 4.5 ? 'pass' : 'fail',
              });
              if (occurrence.paletteSlot) slotStateCoverage[occurrence.paletteSlot][state] += 1;
            }
          }
          const usedPaletteSlots = paletteSlots.filter((slot) =>
            Object.values(slotStateCoverage[slot]).some((count) => count > 0),
          );
          return {
            theme: activeTheme,
            themeState,
            resolvedBlockCounts,
            paletteRgbBySlot,
            usedPaletteSlots,
            slotStateCoverage,
            foregroundOwnerCounts,
            stateBackgrounds,
            records,
            errors,
          };
        },
        {
          theme,
          themeAttribute: THEME_ATTRIBUTE,
          resolvedThemeAttribute: RESOLVED_THEME_ATTRIBUTE,
          inventoryFixtures: INVENTORY_FIXTURES,
          stateFixtureFilename: STATE_FIXTURE_FILENAME,
          expectedBlocks: EXPECTED_BLOCKS,
          palette: ROUAULT_SYNTAX_PALETTES[theme],
          paletteSlots: PALETTE_SLOTS,
          states: STATES,
        },
      );
      measurements.push(measurement);
    } catch (error) {
      const summary = error instanceof Error ? error.message : String(error);
      lifecycleErrors.push(`${theme}: ${summary}`);
      measurements.push(
        createFallbackThemeMeasurement(theme, `${theme} measurement lifecycle failure: ${summary}`),
      );
    } finally {
      if (context) {
        try {
          await context.close();
        } catch (error) {
          lifecycleErrors.push(
            `${theme} context close: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }
  }

  const measurementByTheme = Object.fromEntries(
    measurements.map((measurement) => [measurement.theme, measurement]),
  ) as Record<ContrastTheme, ThemeMeasurement>;
  const records = sortRecords(measurements.flatMap((measurement) => measurement.records));
  const errors = [...lifecycleErrors, ...measurements.flatMap((measurement) => measurement.errors)];
  const coverage: ContrastCoverage = {
    expectedBlocks: EXPECTED_BLOCKS,
    resolvedBlocks: {
      light: measurementByTheme.light.resolvedBlockCounts,
      dark: measurementByTheme.dark.resolvedBlockCounts,
    },
    themes: measurements.map((measurement) => measurement.themeState),
    languages: [...INVENTORY_FIXTURES.map((fixture) => fixture.language)],
    states: STATES,
    expectedPaletteSlots: PALETTE_SLOTS,
    usedPaletteSlotsByTheme: {
      light: measurementByTheme.light.usedPaletteSlots,
      dark: measurementByTheme.dark.usedPaletteSlots,
    },
    foregroundOwnerCountsByTheme: {
      light: measurementByTheme.light.foregroundOwnerCounts,
      dark: measurementByTheme.dark.foregroundOwnerCounts,
    },
    slotStateCoverageByTheme: {
      light: measurementByTheme.light.slotStateCoverage,
      dark: measurementByTheme.dark.slotStateCoverage,
    },
    stateBackgroundsByTheme: {
      light: measurementByTheme.light.stateBackgrounds,
      dark: measurementByTheme.dark.stateBackgrounds,
    },
    recordCount: records.length,
  };
  const evidence: ContrastEvidence = {
    runId,
    generatedAt,
    testFile: TEST_FILE,
    project: testInfo.project.name,
    runKind: RUN_CONFIGURATION.runKind,
    coverage,
    records,
    errors,
  };

  if (RUN_CONFIGURATION.artifactPath && measurementReached) {
    await writeFormalArtifact(RUN_CONFIGURATION.artifactPath, evidence);
  }
  if (RUN_CONFIGURATION.artifactPath && !measurementReached) {
    throw new Error(
      `Formal ${RUN_CONFIGURATION.runKind} contrast run did not reach measurement; no artifact was generated. ` +
        errors.join(' | '),
    );
  }

  for (const theme of THEMES) {
    for (const filename of EXPECTED_BLOCKS) {
      expect(coverage.resolvedBlocks[theme][filename], `${theme}/${filename} fixture count`).toBe(
        1,
      );
    }
    expect(coverage.usedPaletteSlotsByTheme[theme], `${theme} palette coverage`).toEqual(
      PALETTE_SLOTS,
    );
    expect(
      coverage.foregroundOwnerCountsByTheme[theme]['base-foreground'],
      `${theme} base coverage`,
    ).toBeGreaterThan(0);
    expect(
      coverage.foregroundOwnerCountsByTheme[theme]['palette-slot'],
      `${theme} accent coverage`,
    ).toBeGreaterThan(0);
    expect(
      coverage.foregroundOwnerCountsByTheme[theme]['unexpected-foreground'],
      `${theme} unexpected foreground`,
    ).toBe(0);
    for (const slot of PALETTE_SLOTS) {
      for (const state of STATES) {
        expect(
          coverage.slotStateCoverageByTheme[theme][slot][state],
          `${theme}/${slot}/${state}`,
        ).toBeGreaterThan(0);
      }
    }
    for (const language of coverage.languages) {
      expect(
        records.some((record) => record.theme === theme && record.sourceLanguage === language),
        `${theme}/${language} foreground coverage`,
      ).toBe(true);
    }
    expect(
      new Set(Object.values(coverage.stateBackgroundsByTheme[theme])).size,
      `${theme} semantic state backgrounds must not collapse`,
    ).toBe(STATES.length);
  }

  expect(errors).toEqual([]);
  expect(records.length).toBeGreaterThan(0);
  expect(records.filter((record) => record.result === 'fail' || record.ratio < 4.5)).toEqual([]);

  for (const theme of THEMES) {
    for (const slot of PALETTE_SLOTS) {
      const slotRecords = records.filter(
        (record) => record.theme === theme && record.paletteSlot === slot,
      );
      expect(slotRecords.length, `${theme}/${slot} measurement count`).toBeGreaterThan(0);
      expect(
        Math.min(...slotRecords.map((record) => record.ratio)),
        `${theme}/${slot} minimum contrast`,
      ).toBeGreaterThanOrEqual(5);
    }
  }
});
