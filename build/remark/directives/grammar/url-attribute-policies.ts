import type { DirectiveName } from '../types.js';

export type DirectiveUrlPolicyName =
  | 'classified-link-card-url'
  | 'media-image-url'
  | 'score-media-url'
  | 'preview-resource-url'
  | 'optional-url-like-text';

export interface DirectiveUrlAttributePolicy {
  readonly directiveName: DirectiveName;
  readonly attributeName: string;
  readonly policy: DirectiveUrlPolicyName;
}

export const directiveUrlAttributePolicies: readonly DirectiveUrlAttributePolicy[] = [
  { directiveName: 'link-card', attributeName: 'url', policy: 'classified-link-card-url' },
  { directiveName: 'link-card', attributeName: 'image', policy: 'media-image-url' },
  { directiveName: 'score', attributeName: 'src', policy: 'score-media-url' },
  { directiveName: 'preview-sandbox', attributeName: 'base-url', policy: 'preview-resource-url' },
  { directiveName: 'translation', attributeName: 'original', policy: 'optional-url-like-text' },
  { directiveName: 'translation', attributeName: 'translated', policy: 'optional-url-like-text' },
  {
    directiveName: 'translation-overlay',
    attributeName: 'original',
    policy: 'optional-url-like-text',
  },
  {
    directiveName: 'translation-overlay',
    attributeName: 'translated',
    policy: 'optional-url-like-text',
  },
] as const;

const policyByDirectiveAndAttribute = new Map<string, DirectiveUrlPolicyName>(
  directiveUrlAttributePolicies.map((entry) => [
    `${entry.directiveName}:${entry.attributeName}`,
    entry.policy,
  ]),
);

export const getDirectiveUrlAttributePolicy = (
  directiveName: DirectiveName,
  attributeName: string,
): DirectiveUrlPolicyName | undefined =>
  policyByDirectiveAndAttribute.get(`${directiveName}:${attributeName}`);
