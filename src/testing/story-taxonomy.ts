export const ROUAULT_CONTRACT_KINDS = [
  'visual',
  'interaction-contract',
  'boundary-contract',
] as const;

export type RouaultContractKind = (typeof ROUAULT_CONTRACT_KINDS)[number];

export interface RouaultStoryParameters {
  rouaultContractKind: RouaultContractKind;
}

export const ROUAULT_BOUNDARY_NAME_HINTS = [
  'Dark',
  'ForcedColors',
  'ReducedMotion',
  'Print',
  'Overflow',
  'Empty',
  'Boundary',
  'Fallback',
  'Invalid',
  'NoJs',
  'AccessibilityMedia',
  'Persistence',
  'Degraded',
  'Strict',
  'Unsafe',
] as const;

export const ROUAULT_INTERACTION_NAME_HINTS = [
  'Flow',
  'Keyboard',
  'Focus',
  'Event',
  'Selection',
  'Open',
  'Close',
  'Submit',
  'Reset',
  'Toggle',
  'Pause',
  'Resume',
  'Navigation',
] as const;

export const ROUAULT_BOUNDARY_NAME_PATTERN = new RegExp(
  `(?:${ROUAULT_BOUNDARY_NAME_HINTS.join('|')})`,
);
export const ROUAULT_INTERACTION_NAME_PATTERN = new RegExp(
  `(?:${ROUAULT_INTERACTION_NAME_HINTS.join('|')})`,
);

interface ParametersLike {
  rouaultContractKind?: unknown;
}

interface ContractKindHintInput {
  filePath: string;
  exportName: string;
  hasPlay: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function normalizePath(value: string): string {
  return value.replaceAll('\\', '/');
}

export function isRouaultContractKind(value: unknown): value is RouaultContractKind {
  return typeof value === 'string' && (ROUAULT_CONTRACT_KINDS as readonly string[]).includes(value);
}

export function getRouaultStoryParameters(
  value: unknown,
): Partial<RouaultStoryParameters> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  return value as Partial<RouaultStoryParameters>;
}

export function resolveRouaultContractKind(
  storyParameters: unknown,
  metaParameters?: unknown,
): RouaultContractKind | undefined {
  const story = getRouaultStoryParameters(storyParameters) as ParametersLike | undefined;
  if (isRouaultContractKind(story?.rouaultContractKind)) {
    return story.rouaultContractKind;
  }

  const meta = getRouaultStoryParameters(metaParameters) as ParametersLike | undefined;
  if (isRouaultContractKind(meta?.rouaultContractKind)) {
    return meta.rouaultContractKind;
  }

  return undefined;
}

export function isFoundationStoryFile(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return (
    normalized.startsWith('src/stories/foundations/') ||
    normalized.includes('/src/stories/foundations/')
  );
}

export function isBoundaryStoryFile(filePath: string): boolean {
  return /(?:^|\/)[^/]*boundary\.stories\.ts$/i.test(normalizePath(filePath));
}

export function classifyRouaultContractKindFromHints({
  filePath,
  exportName,
  hasPlay,
}: ContractKindHintInput): RouaultContractKind {
  if (isFoundationStoryFile(filePath)) {
    return 'visual';
  }

  if (isBoundaryStoryFile(filePath) || ROUAULT_BOUNDARY_NAME_PATTERN.test(exportName)) {
    return 'boundary-contract';
  }

  if (ROUAULT_INTERACTION_NAME_PATTERN.test(exportName)) {
    return 'interaction-contract';
  }

  if (hasPlay) {
    return 'interaction-contract';
  }

  return 'visual';
}

export function isStorybookExecutionHelperPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return (
    normalized.startsWith('src/stories/shared/') ||
    normalized.startsWith('src/testing/storybook/') ||
    normalized.includes('/src/stories/shared/') ||
    normalized.includes('/src/testing/storybook/')
  );
}
