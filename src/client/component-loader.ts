import {
  COMPONENT_DEFINITION_BY_TAG,
  COMPONENT_SELECTOR,
  COMPONENT_TAGS,
  getComponentDefinitionsForProfile,
  isComponentTag,
  type ComponentProfile,
  type ComponentTag,
} from './component-manifest.js';

const loadedTagPromises = new Map<ComponentTag, Promise<void>>();

const collectPresentTags = (root: ParentNode): readonly ComponentTag[] => {
  if (COMPONENT_TAGS.length === 0) {
    return [];
  }

  const tags = new Set<ComponentTag>();

  if (root instanceof Element && isComponentTag(root.localName)) {
    tags.add(root.localName);
  }

  for (const element of root.querySelectorAll(COMPONENT_SELECTOR)) {
    if (isComponentTag(element.localName)) {
      tags.add(element.localName);
    }
  }

  return [...tags];
};

export const ensureComponentLoaded = async (
  tag: ComponentTag,
  root: ParentNode = document,
): Promise<void> => {
  const definition = COMPONENT_DEFINITION_BY_TAG[tag];

  let pending = loadedTagPromises.get(tag);
  if (!pending) {
    pending = definition.loader().then(() => undefined);
    loadedTagPromises.set(tag, pending);
  }

  await pending;
  definition.postHydrate?.(root);
};

export const ensureComponentsForRoot = async (root: ParentNode = document): Promise<void> => {
  const tags = collectPresentTags(root);
  await Promise.all(tags.map(async (tag) => ensureComponentLoaded(tag, root)));
};

export const prefetchProfile = async (profile: ComponentProfile): Promise<void> => {
  const definitions = getComponentDefinitionsForProfile(profile);
  await Promise.all(definitions.map(async (definition) => ensureComponentLoaded(definition.tag)));
};