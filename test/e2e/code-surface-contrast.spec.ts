import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { expect, test } from '@playwright/test';

import { ROUAULT_SHIKI_COLOR_REPLACEMENTS } from '../../build/rehype/shiki-themes.js';
import {
  RESOLVED_THEME_ATTRIBUTE,
  THEME_ATTRIBUTE,
  THEME_STORAGE_KEY,
} from '../../src/theme/theme-manager.js';
import { e2eNoteFixtures } from './support/note-fixtures.js';

const TEST_FILE = 'test/e2e/code-surface-contrast.spec.ts';
const THEMES = ['light', 'dark'] as const;
const STATES = ['normal', 'highlight', 'diff-add', 'diff-remove'] as const;
const REQUIRED_FOREGROUND_OWNERS = [
  'replaced-token',
  'theme-default-token',
  'unreplaced-token',
] as const;

type ContrastTheme = (typeof THEMES)[number];
type ContrastState = (typeof STATES)[number];
type RequiredForegroundOwner = (typeof REQUIRED_FOREGROUND_OWNERS)[number];
type ForegroundOwner = RequiredForegroundOwner | 'inherited-text';
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
  if (!rawRunKind) {
    return { runKind: 'standard', artifactPath: null };
  }
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
  readonly foregroundSource: 'token-inline' | 'inherited-computed';
  readonly foregroundOwner: ForegroundOwner;
  readonly rawForegroundCss: string | null;
  readonly normalizedRawForegroundRgb: string | null;
  readonly themeDefaultForegroundCss: string;
  readonly normalizedThemeDefaultForegroundRgb: string;
  readonly matchedReplacementOutputRgb: string | null;
  readonly state: ContrastState;
  readonly foregroundCss: string;
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
  readonly expectedReplacementOutputs: readonly string[];
  readonly observedReplacementOutputs: readonly string[];
  readonly missingReplacementOutputs: readonly string[];
  readonly replacementOutputStateCoverage: Readonly<
    Record<string, Readonly<Record<ContrastState, number>>>
  >;
  readonly requiredForegroundOwnerCounts: Readonly<Record<RequiredForegroundOwner, number>>;
  readonly inheritedTextCount: number;
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
  readonly requiredForegroundOwnersByTheme: Readonly<
    Record<ContrastTheme, Readonly<Record<RequiredForegroundOwner, number>>>
  >;
  readonly optionalInheritedTextCountByTheme: Readonly<Record<ContrastTheme, number>>;
  readonly expectedReplacementOutputsByTheme: Readonly<Record<ContrastTheme, readonly string[]>>;
  readonly observedReplacementOutputsByTheme: Readonly<Record<ContrastTheme, readonly string[]>>;
  readonly missingReplacementOutputsByTheme: Readonly<Record<ContrastTheme, readonly string[]>>;
  readonly replacementOutputStateCoverageByTheme: Readonly<
    Record<
      ContrastTheme,
      Readonly<Record<string, Readonly<Record<ContrastState, number>>>>
    >
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

const expectedReplacementHexesForTheme = (theme: ContrastTheme): readonly string[] => {
  const themeName = theme === 'light' ? 'github-light' : 'github-dark';
  return Object.values(ROUAULT_SHIKI_COLOR_REPLACEMENTS[themeName]);
};

const createFallbackThemeMeasurement = (
  theme: ContrastTheme,
  error: string,
): ThemeMeasurement => ({
  theme,
  themeState: {
    requestedTheme: theme,
    preference: null,
    resolvedTheme: null,
    colorScheme: '',
  },
  resolvedBlockCounts: Object.fromEntries(EXPECTED_BLOCKS.map((filename) => [filename, 0])),
  expectedReplacementOutputs: [],
  observedReplacementOutputs: [],
  missingReplacementOutputs: [],
  replacementOutputStateCoverage: {},
  requiredForegroundOwnerCounts: {
    'replaced-token': 0,
    'theme-default-token': 0,
    'unreplaced-token': 0,
  },
  inheritedTextCount: 0,
  stateBackgrounds: {
    normal: '',
    highlight: '',
    'diff-add': '',
    'diff-remove': '',
  },
  records: [],
  errors: [error],
});

const sortRecords = (records: readonly ContrastRecord[]): ContrastRecord[] =>
  [...records].sort((left, right) => {
    const leftKey = [
      left.theme,
      left.sourceLanguage,
      left.sourceCodeBlockId,
      left.sourceLineIndex.toString().padStart(6, '0'),
      left.sourceElementPath,
      left.foregroundOwner,
      left.state,
    ].join('\u0000');
    const rightKey = [
      right.theme,
      right.sourceLanguage,
      right.sourceCodeBlockId,
      right.sourceLineIndex.toString().padStart(6, '0'),
      right.sourceElementPath,
      right.foregroundOwner,
      right.state,
    ].join('\u0000');
    return leftKey.localeCompare(rightKey);
  });

const writeFormalArtifact = async (
  artifactPath: string,
  evidence: ContrastEvidence,
): Promise<void> => {
  await mkdir(path.dirname(artifactPath), { recursive: true });
  const temporaryPath = `${artifactPath}.tmp-${process.pid.toString()}-${Date.now().toString()}`;
  await writeFile(temporaryPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, artifactPath);
};

test('production code surface foregrounds maintain contrast across all semantic line states', async ({
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
      context = await browser.newContext({
        ...(baseURL ? { baseURL } : {}),
        colorScheme: theme,
      });
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
          readonly expectedReplacementHexes: readonly string[];
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
          expectedReplacementHexes,
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
            readonly foregroundSource: 'token-inline' | 'inherited-computed';
            readonly foregroundOwner: ForegroundOwner;
            readonly rawForegroundCss: string | null;
            readonly normalizedRawForegroundRgb: string | null;
            readonly themeDefaultForegroundCss: string;
            readonly normalizedThemeDefaultForegroundRgb: string;
            readonly matchedReplacementOutputRgb: string | null;
            readonly foregroundCss: string;
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
                (foreground.r * foreground.a +
                  background.r * background.a * (1 - foreground.a)) /
                alpha,
              g:
                (foreground.g * foreground.a +
                  background.g * background.a * (1 - foreground.a)) /
                alpha,
              b:
                (foreground.b * foreground.a +
                  background.b * background.a * (1 - foreground.a)) /
                alpha,
              a: alpha,
            };
          };

          const rgbString = (color: RgbaColor): string =>
            `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;

          const opaqueRgb = (cssColor: string, label: string): string | null => {
            const parsed = parseColor(cssColor);
            if (!parsed) {
              errors.push(`${label}: Canvas could not parse ${JSON.stringify(cssColor)}.`);
              return null;
            }
            if (parsed.a < 0.999) {
              errors.push(`${label}: expected an opaque color, received alpha ${parsed.a.toFixed(4)}.`);
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
                errors.push(`${label}: could not parse ${ancestor.tagName} background.`);
                return null;
              }
              result = composite(layer, result);
            }
            if (result.a < 0.999) {
              errors.push(`${label}: final background is not opaque (alpha ${result.a.toFixed(4)}).`);
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
            return 0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);
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
            errors.push(
              `Theme contract mismatch for ${activeTheme}: preference=${String(themeState.preference)}, ` +
                `resolved=${String(themeState.resolvedTheme)}, color-scheme=${themeState.colorScheme}.`,
            );
            return {
              theme: activeTheme,
              themeState,
              resolvedBlockCounts: Object.fromEntries(
                expectedBlocks.map((filename) => [filename, 0]),
              ),
              expectedReplacementOutputs: [],
              observedReplacementOutputs: [],
              missingReplacementOutputs: [],
              replacementOutputStateCoverage: {},
              requiredForegroundOwnerCounts: {
                'replaced-token': 0,
                'theme-default-token': 0,
                'unreplaced-token': 0,
              },
              inheritedTextCount: 0,
              stateBackgrounds: {
                normal: '',
                highlight: '',
                'diff-add': '',
                'diff-remove': '',
              },
              records: [],
              errors,
            };
          }

          const resolvedBlockCounts = Object.fromEntries(
            expectedBlocks.map((filename) => [
              filename,
              document.querySelectorAll(
                `pre[data-code-block][data-code-filename="${CSS.escape(filename)}"]`,
              ).length,
            ]),
          );

          const expectedReplacementOutputs = expectedReplacementHexes
            .flatMap((hex, index) => {
              const normalized = opaqueRgb(hex, `${activeTheme} expected replacement ${index.toString()}`);
              return normalized ? [normalized] : [];
            })
            .filter((value, index, values) => values.indexOf(value) === index)
            .sort();

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
              const background = finalBackgroundFor(line, `${activeTheme} ${state}`);
              if (background) {
                stateBackgroundColors[state] = background;
                stateBackgrounds[state] = rgbString(background);
              }
            }
          }

          const activeRawProperty = activeTheme === 'light' ? 'color' : '--shiki-dark';
          const occurrences: ForegroundOccurrence[] = [];
          const requiredForegroundOwnerCounts: Record<RequiredForegroundOwner, number> = {
            'replaced-token': 0,
            'theme-default-token': 0,
            'unreplaced-token': 0,
          };
          let inheritedTextCount = 0;

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
            const themeDefaultForegroundCss = block.style
              .getPropertyValue(activeRawProperty)
              .trim();
            const normalizedThemeDefaultForegroundRgb = opaqueRgb(
              themeDefaultForegroundCss,
              `${activeTheme} ${fixture.filename} theme default`,
            );
            if (!normalizedThemeDefaultForegroundRgb) continue;

            const lineElements = [...block.querySelectorAll('.line')];
            const styledTokens = [...block.querySelectorAll<HTMLElement>('span[style]')].filter(
              (token) => token.style.getPropertyValue(activeRawProperty).trim().length > 0,
            );
            for (const token of styledTokens) {
              const rawForegroundCss = token.style.getPropertyValue(activeRawProperty).trim();
              const normalizedRawForegroundRgb = opaqueRgb(
                rawForegroundCss,
                `${activeTheme} ${fixture.filename} token`,
              );
              if (!normalizedRawForegroundRgb) continue;
              const matchedReplacementOutputRgb = expectedReplacementOutputs.includes(
                normalizedRawForegroundRgb,
              )
                ? normalizedRawForegroundRgb
                : null;
              const foregroundOwner: RequiredForegroundOwner = matchedReplacementOutputRgb
                ? 'replaced-token'
                : normalizedRawForegroundRgb === normalizedThemeDefaultForegroundRgb
                  ? 'theme-default-token'
                  : 'unreplaced-token';
              requiredForegroundOwnerCounts[foregroundOwner] += 1;
              const line = token.closest('.line');
              occurrences.push({
                sourceLanguage: fixture.language,
                sourceCodeBlockId: fixture.filename,
                sourceLineIndex: line ? lineElements.indexOf(line) : -1,
                sourceElementPath: elementPath(token, block),
                foregroundSource: 'token-inline',
                foregroundOwner,
                rawForegroundCss,
                normalizedRawForegroundRgb,
                themeDefaultForegroundCss,
                normalizedThemeDefaultForegroundRgb,
                matchedReplacementOutputRgb,
                foregroundCss: getComputedStyle(token).color,
              });
            }

            const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
            let textNode = walker.nextNode();
            while (textNode) {
              const parent = textNode.parentElement;
              const styledAncestor = parent?.closest<HTMLElement>('span[style]');
              const line = parent?.closest('.line') ?? null;
              if (
                parent &&
                line &&
                textNode.textContent?.trim() &&
                !styledAncestor?.style.getPropertyValue(activeRawProperty).trim()
              ) {
                inheritedTextCount += 1;
                occurrences.push({
                  sourceLanguage: fixture.language,
                  sourceCodeBlockId: fixture.filename,
                  sourceLineIndex: lineElements.indexOf(line),
                  sourceElementPath: `${elementPath(parent, block)} > text()`,
                  foregroundSource: 'inherited-computed',
                  foregroundOwner: 'inherited-text',
                  rawForegroundCss: null,
                  normalizedRawForegroundRgb: null,
                  themeDefaultForegroundCss,
                  normalizedThemeDefaultForegroundRgb,
                  matchedReplacementOutputRgb: null,
                  foregroundCss: getComputedStyle(parent).color,
                });
              }
              textNode = walker.nextNode();
            }
          }

          const observedReplacementOutputs = expectedReplacementOutputs
            .filter((expected) =>
              occurrences.some(
                (occurrence) => occurrence.normalizedRawForegroundRgb === expected,
              ),
            )
            .sort();
          const missingReplacementOutputs = expectedReplacementOutputs.filter(
            (expected) => !observedReplacementOutputs.includes(expected),
          );
          const records: ContrastRecord[] = [];
          const replacementOutputStateCoverage = Object.fromEntries(
            expectedReplacementOutputs.map((output) => [
              output,
              { normal: 0, highlight: 0, 'diff-add': 0, 'diff-remove': 0 },
            ]),
          ) as Record<string, Record<ContrastState, number>>;

          for (const occurrence of occurrences) {
            const foreground = parseColor(occurrence.foregroundCss);
            if (!foreground) {
              errors.push(
                `${activeTheme} ${occurrence.sourceCodeBlockId} ${occurrence.sourceElementPath}: ` +
                  `could not parse computed foreground ${occurrence.foregroundCss}.`,
              );
              continue;
            }
            for (const state of states) {
              const background = stateBackgroundColors[state];
              if (!background) continue;
              const finalForeground = composite(foreground, background);
              const ratio = contrastRatio(finalForeground, background);
              const record: ContrastRecord = {
                theme: activeTheme,
                sourceLanguage: occurrence.sourceLanguage,
                sourceCodeBlockId: occurrence.sourceCodeBlockId,
                sourceLineIndex: occurrence.sourceLineIndex,
                sourceElementPath: occurrence.sourceElementPath,
                foregroundSource: occurrence.foregroundSource,
                foregroundOwner: occurrence.foregroundOwner,
                rawForegroundCss: occurrence.rawForegroundCss,
                normalizedRawForegroundRgb: occurrence.normalizedRawForegroundRgb,
                themeDefaultForegroundCss: occurrence.themeDefaultForegroundCss,
                normalizedThemeDefaultForegroundRgb:
                  occurrence.normalizedThemeDefaultForegroundRgb,
                matchedReplacementOutputRgb: occurrence.matchedReplacementOutputRgb,
                state,
                foregroundCss: occurrence.foregroundCss,
                finalForegroundRgb: rgbString(finalForeground),
                finalBackgroundRgb: rgbString(background),
                ratio: Number(ratio.toFixed(4)),
                result: ratio >= 4.5 ? 'pass' : 'fail',
              };
              records.push(record);
              if (occurrence.matchedReplacementOutputRgb) {
                const outputCoverage =
                  replacementOutputStateCoverage[occurrence.matchedReplacementOutputRgb];
                if (outputCoverage) {
                  outputCoverage[state] += 1;
                } else {
                  errors.push(
                    `${activeTheme}: missing coverage bucket for ${occurrence.matchedReplacementOutputRgb}.`,
                  );
                }
              }
            }
          }

          return {
            theme: activeTheme,
            themeState,
            resolvedBlockCounts,
            expectedReplacementOutputs,
            observedReplacementOutputs,
            missingReplacementOutputs,
            replacementOutputStateCoverage,
            requiredForegroundOwnerCounts,
            inheritedTextCount,
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
          expectedReplacementHexes: expectedReplacementHexesForTheme(theme),
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
  const errors = [
    ...lifecycleErrors,
    ...measurements.flatMap((measurement) => measurement.errors),
  ];
  const coverage: ContrastCoverage = {
    expectedBlocks: EXPECTED_BLOCKS,
    resolvedBlocks: {
      light: measurementByTheme.light.resolvedBlockCounts,
      dark: measurementByTheme.dark.resolvedBlockCounts,
    },
    themes: measurements.map((measurement) => measurement.themeState),
    languages: [...INVENTORY_FIXTURES.map((fixture) => fixture.language)],
    states: STATES,
    requiredForegroundOwnersByTheme: {
      light: measurementByTheme.light.requiredForegroundOwnerCounts,
      dark: measurementByTheme.dark.requiredForegroundOwnerCounts,
    },
    optionalInheritedTextCountByTheme: {
      light: measurementByTheme.light.inheritedTextCount,
      dark: measurementByTheme.dark.inheritedTextCount,
    },
    expectedReplacementOutputsByTheme: {
      light: measurementByTheme.light.expectedReplacementOutputs,
      dark: measurementByTheme.dark.expectedReplacementOutputs,
    },
    observedReplacementOutputsByTheme: {
      light: measurementByTheme.light.observedReplacementOutputs,
      dark: measurementByTheme.dark.observedReplacementOutputs,
    },
    missingReplacementOutputsByTheme: {
      light: measurementByTheme.light.missingReplacementOutputs,
      dark: measurementByTheme.dark.missingReplacementOutputs,
    },
    replacementOutputStateCoverageByTheme: {
      light: measurementByTheme.light.replacementOutputStateCoverage,
      dark: measurementByTheme.dark.replacementOutputStateCoverage,
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
      expect(
        coverage.resolvedBlocks[theme][filename],
        `${theme} fixture count for ${filename}`,
      ).toBe(1);
    }
  }

  for (const theme of THEMES) {
    expect(coverage.themes.some((item) => item.requestedTheme === theme)).toBe(true);
    for (const state of STATES) {
      expect(coverage.stateBackgroundsByTheme[theme][state], `${theme}/${state} background`).not.toBe(
        '',
      );
    }
    for (const owner of REQUIRED_FOREGROUND_OWNERS) {
      expect(
        coverage.requiredForegroundOwnersByTheme[theme][owner],
        `${theme}/${owner} coverage`,
      ).toBeGreaterThan(0);
    }
    for (const language of coverage.languages) {
      expect(
        records.some((record) => record.theme === theme && record.sourceLanguage === language),
        `${theme}/${language} foreground coverage`,
      ).toBe(true);
    }
  }

  for (const theme of THEMES) {
    expect(coverage.expectedReplacementOutputsByTheme[theme], `${theme} expected outputs`).toHaveLength(
      6,
    );
    expect(coverage.missingReplacementOutputsByTheme[theme], `${theme} missing outputs`).toEqual([]);
  }

  for (const theme of THEMES) {
    for (const output of coverage.expectedReplacementOutputsByTheme[theme]) {
      const stateCoverage = coverage.replacementOutputStateCoverageByTheme[theme][output];
      expect(stateCoverage, `${theme}/${output} state coverage`).toBeDefined();
      for (const state of STATES) {
        expect(stateCoverage?.[state] ?? 0, `${theme}/${output}/${state}`).toBeGreaterThan(0);
      }
    }
  }

  expect(errors).toEqual([]);
  expect(records.length).toBeGreaterThan(0);

  const failingRecords = records.filter((record) => record.result === 'fail' || record.ratio < 4.5);
  expect(failingRecords).toEqual([]);

  for (const theme of THEMES) {
    expect(
      new Set(Object.values(coverage.stateBackgroundsByTheme[theme])).size,
      `${theme} semantic state backgrounds must not collapse`,
    ).toBe(STATES.length);
  }
});
