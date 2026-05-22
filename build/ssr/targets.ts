import {
  SSR_COMPONENT_DEFINITIONS,
  type SsrComponentProfile,
  type SsrComponentTag,
} from './target-definitions.js';

type ComponentDefinition = (typeof SSR_COMPONENT_DEFINITIONS)[number];
const pickTags = (
  predicate: (definition: ComponentDefinition) => boolean,
): readonly SsrComponentTag[] =>
  SSR_COMPONENT_DEFINITIONS.filter(predicate).map((definition) => definition.tag);

const hasProfile = (definition: ComponentDefinition, profile: SsrComponentProfile): boolean =>
  (definition.profiles as readonly SsrComponentProfile[]).includes(profile);

export const SSR_SHADOW_TARGET_TAGS = pickTags((definition) => definition.ssr === 'shadow');
export const SSR_LIGHT_TARGET_TAGS = pickTags((definition) => definition.ssr === 'light');
export const SSR_TARGET_TAGS = [...SSR_SHADOW_TARGET_TAGS, ...SSR_LIGHT_TARGET_TAGS] as const;

export type SsrShadowTargetTag = (typeof SSR_SHADOW_TARGET_TAGS)[number];
export type SsrLightTargetTag = (typeof SSR_LIGHT_TARGET_TAGS)[number];
export type SsrTargetTag = (typeof SSR_TARGET_TAGS)[number];

export const SSR_NOTE_TARGET_TAGS = pickTags((definition) => hasProfile(definition, 'note'));
export const SSR_PAGE_TARGET_TAGS = pickTags((definition) => hasProfile(definition, 'page'));
export const SSR_SHELL_TARGET_TAGS = pickTags((definition) => hasProfile(definition, 'shell'));
