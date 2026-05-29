import * as parse5 from 'parse5';
import type { DefaultTreeAdapterMap } from 'parse5';

import type { HydrationRegistryProfile } from '../../shared/static-first-profiles.js';

type Parse5DocumentFragment = DefaultTreeAdapterMap['documentFragment'];
type Parse5Element = DefaultTreeAdapterMap['element'];
type Parse5Node = DefaultTreeAdapterMap['node'];

export interface StaticFirstHydrationRegistryContractEntry {
  readonly tag: string;
  readonly kind: 'custom-element' | 'enhancer';
  readonly profiles: readonly HydrationRegistryProfile[];
}

export interface StaticFirstProfiledHydrationValidationOptions {
  readonly profile: HydrationRegistryProfile;
  readonly html: string;
  readonly registry: readonly StaticFirstHydrationRegistryContractEntry[];
  readonly denylistTags?: readonly string[];
  readonly ssrTargetTags?: readonly string[];
}

export interface StaticFirstProfiledHydrationValidationResult {
  readonly hydrationKeys: readonly string[];
  readonly hydrationTags: readonly string[];
  readonly errors: readonly string[];
}

const isElementNode = (node: Parse5Node): node is Parse5Element =>
  'tagName' in node && typeof node.tagName === 'string' && Array.isArray(node.attrs);

const getAttributeValue = (node: Parse5Element, name: string): string | undefined =>
  node.attrs.find((attribute) => attribute.name === name)?.value;

const collectElements = (fragment: Parse5DocumentFragment): readonly Parse5Element[] => {
  const elements: Parse5Element[] = [];
  const visit = (node: Parse5Node): void => {
    if (isElementNode(node)) {
      elements.push(node);
    }
    if ('childNodes' in node && Array.isArray(node.childNodes)) {
      for (const child of node.childNodes) {
        visit(child);
      }
    }
  };

  for (const child of fragment.childNodes) {
    visit(child);
  }

  return elements;
};

const unique = (values: readonly string[]): readonly string[] => [...new Set(values)].sort();

export const validateStaticFirstProfiledHydration = ({
  profile,
  html,
  registry,
  denylistTags = [],
  ssrTargetTags = [],
}: StaticFirstProfiledHydrationValidationOptions): StaticFirstProfiledHydrationValidationResult => {
  const fragment = parse5.parseFragment(html);
  const elements = collectElements(fragment);
  const registryByTag = new Map(registry.map((entry) => [entry.tag, entry] as const));
  const denylist = new Set(denylistTags);
  const profileSsrTargets = new Set(ssrTargetTags);
  const hydrationKeys: string[] = [];
  const hydrationTags: string[] = [];
  const errors: string[] = [];

  for (const element of elements) {
    if (denylist.has(element.tagName)) {
      errors.push(`${profile} final HTML に ${element.tagName} を含めてはいけません`);
    }

    const key = getAttributeValue(element, 'data-hydration-key')?.trim();
    if (!key) {
      continue;
    }

    hydrationKeys.push(key);
    hydrationTags.push(element.tagName);

    const entry = registryByTag.get(key);
    if (!entry) {
      errors.push(`${profile} hydration root "${key}" は HYDRATION_REGISTRY に存在しません`);
      continue;
    }

    if (!entry.profiles.includes(profile)) {
      errors.push(
        `${profile} hydration root "${key}" は registry profiles ${entry.profiles.join(
          ', ',
        )} に含まれていません`,
      );
    }
  }

  for (const tag of profileSsrTargets) {
    const entry = registryByTag.get(tag);
    if (entry?.kind === 'custom-element' && !entry.profiles.includes(profile)) {
      errors.push(
        `${profile} SSR target "${tag}" は registry profiles ${entry.profiles.join(
          ', ',
        )} に含まれていません`,
      );
    }
  }

  return {
    hydrationKeys: unique(hydrationKeys),
    hydrationTags: unique(hydrationTags),
    errors,
  };
};
