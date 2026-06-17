import { requireBuildIdInput } from '../../shared/navigation/build-id-contract.js';
import { requireGeneratedAtInput } from '../../shared/navigation/generated-at-contract.js';
import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import type { DocumentRenderSnapshot } from '../../shared/navigation/document-render-snapshot.js';
import type { HydrationPlan } from '../../shared/navigation/hydration-plan.js';
import {
  NavigationShellValidationError,
  validateNavigationEnvelopeShell,
} from '../../shared/navigation/navigation-shell-validator.js';
import type { StrictLoadedNavigationEnvelope } from './router-types.js';
import {
  NavigationEnvelopeContractError,
  NavigationEnvelopeMetadataMismatchError,
} from './navigation-envelope-errors.js';
import { createRouterDiagnosticError } from './router-diagnostics.js';

export interface ValidateLoadedEnvelopeInput {
  readonly envelope: NavigationEnvelope;
  readonly source: 'fetch' | 'document-route';
  readonly currentBuildId: string;
  readonly currentGeneratedAt: string;
  readonly normalizedUrl: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const isString = (value: unknown): value is string => typeof value === 'string';
const isRenderedKind = (value: unknown): value is DocumentRenderSnapshot['renderedKind'] =>
  value === 'page' || value === 'not-found' || value === 'error';

const createInvalidEnvelopeError = (message: string): NavigationEnvelopeContractError =>
  new NavigationEnvelopeContractError(message, {
    cause: createRouterDiagnosticError(message, {
      reason: 'navigation-envelope-invalid',
      routeId: 'navigation-envelope',
    }),
  });

const isHydrationPlan = (value: unknown): value is HydrationPlan => {
  if (!isRecord(value) || !Array.isArray(value['scopes'])) {
    return false;
  }

  return value['scopes'].every((scope: unknown) => {
    if (!isRecord(scope) || !isString(scope['scope'])) {
      return false;
    }

    const capability = scope['capability'];
    if (
      capability !== undefined &&
      capability !== 'static' &&
      capability !== 'progressive' &&
      capability !== 'interactive'
    ) {
      return false;
    }

    const trigger = scope['trigger'];
    if (
      trigger !== undefined &&
      trigger !== 'initial' &&
      trigger !== 'post-commit' &&
      trigger !== 'visible' &&
      trigger !== 'interaction'
    ) {
      return false;
    }

    const marker = scope['marker'];
    if (
      marker !== undefined &&
      marker !== 'toc-owner' &&
      marker !== 'toc-source' &&
      marker !== 'toc-trigger' &&
      marker !== 'reading-shell'
    ) {
      return false;
    }

    return scope['ownerId'] === undefined || isString(scope['ownerId']);
  });
};

const isDocumentRenderSnapshot = (value: unknown): value is DocumentRenderSnapshot => {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value['html']) &&
    isString(value['title']) &&
    (value['description'] === null || isString(value['description'])) &&
    isRenderedKind(value['renderedKind']) &&
    (value['announcedTitle'] === undefined ||
      value['announcedTitle'] === null ||
      isString(value['announcedTitle']))
  );
};

const readOptionalMetadataString = (
  value: unknown,
  label: 'buildId' | 'generatedAt',
): string | null | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  if (!isString(value)) {
    throw createInvalidEnvelopeError(
      `navigation envelope ${label} は string/null/undefined である必要があります。`,
    );
  }

  return value;
};

export const validateNavigationEnvelope = (value: unknown): NavigationEnvelope => {
  if (!isRecord(value)) {
    throw createInvalidEnvelopeError('navigation envelope は object である必要があります。');
  }

  if (value['schemaVersion'] !== NAVIGATION_ENVELOPE_SCHEMA_VERSION) {
    throw createInvalidEnvelopeError(
      `navigation envelope schemaVersion ${String(value['schemaVersion'])} は未対応です。`,
    );
  }

  if (!isDocumentRenderSnapshot(value['document'])) {
    throw createInvalidEnvelopeError('navigation envelope document が不正です。');
  }

  const hydrationPlan = value['hydrationPlan'];
  let normalizedHydrationPlan: HydrationPlan | null = null;
  if (hydrationPlan !== undefined && hydrationPlan !== null) {
    if (!isHydrationPlan(hydrationPlan)) {
      throw createInvalidEnvelopeError('navigation envelope hydrationPlan が不正です。');
    }
    normalizedHydrationPlan = hydrationPlan;
  }

  if (!hasOwn(value, 'shell')) {
    throw createInvalidEnvelopeError('navigation envelope shell is required.');
  }

  let shell: NavigationEnvelope['shell'];
  try {
    shell = validateNavigationEnvelopeShell(value['shell']);
  } catch (error) {
    if (error instanceof NavigationShellValidationError) {
      throw createInvalidEnvelopeError(`navigation envelope shell が不正です: ${error.message}`);
    }
    throw error;
  }

  return {
    schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
    buildId: readOptionalMetadataString(value['buildId'], 'buildId'),
    generatedAt: readOptionalMetadataString(value['generatedAt'], 'generatedAt'),
    document: value['document'],
    shell,
    hydrationPlan: normalizedHydrationPlan,
  };
};

const requireLoadedEnvelopeBuildId = (value: unknown): string => {
  try {
    return requireBuildIdInput(value, 'navigation envelope buildId');
  } catch (error) {
    throw createInvalidEnvelopeError(
      error instanceof Error ? error.message : 'navigation envelope buildId is invalid.',
    );
  }
};

const requireLoadedEnvelopeGeneratedAt = (value: unknown): string => {
  try {
    return requireGeneratedAtInput(value, 'navigation envelope generatedAt');
  } catch (error) {
    throw createInvalidEnvelopeError(
      error instanceof Error ? error.message : 'navigation envelope generatedAt is invalid.',
    );
  }
};

export const validateLoadedEnvelope = ({
  envelope,
  currentBuildId,
  currentGeneratedAt,
  normalizedUrl,
}: ValidateLoadedEnvelopeInput): StrictLoadedNavigationEnvelope => {
  const envelopeBuildId = requireLoadedEnvelopeBuildId(envelope.buildId);
  const envelopeGeneratedAt = requireLoadedEnvelopeGeneratedAt(envelope.generatedAt);

  if (envelopeBuildId !== currentBuildId) {
    throw new NavigationEnvelopeMetadataMismatchError({
      kind: 'buildId',
      currentValue: currentBuildId,
      envelopeValue: envelopeBuildId,
      normalizedUrl,
    });
  }

  if (envelopeGeneratedAt !== currentGeneratedAt) {
    throw new NavigationEnvelopeMetadataMismatchError({
      kind: 'generatedAt',
      currentValue: currentGeneratedAt,
      envelopeValue: envelopeGeneratedAt,
      normalizedUrl,
    });
  }

  return {
    ...envelope,
    buildId: envelopeBuildId,
    generatedAt: envelopeGeneratedAt,
  };
};
