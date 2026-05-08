import type { DirectiveName } from '../types.js';

export type DirectiveUrlPolicyName =
  | 'external-web-url'
  | 'local-asset-url'
  | 'optional-url-like-text';

export interface DirectiveUrlAttributePolicy {
  readonly directiveName: DirectiveName;
  readonly attributeName: string;
  readonly policy: DirectiveUrlPolicyName;
}

export const directiveUrlAttributePolicies: readonly DirectiveUrlAttributePolicy[] = [
  { directiveName: 'link-card', attributeName: 'url', policy: 'external-web-url' },
  { directiveName: 'link-card', attributeName: 'image', policy: 'external-web-url' },
  { directiveName: 'score', attributeName: 'src', policy: 'local-asset-url' },
  { directiveName: 'preview-sandbox', attributeName: 'base-url', policy: 'local-asset-url' },
  { directiveName: 'translation', attributeName: 'original', policy: 'optional-url-like-text' },
  { directiveName: 'translation', attributeName: 'translated', policy: 'optional-url-like-text' },
  { directiveName: 'translation-overlay', attributeName: 'original', policy: 'optional-url-like-text' },
  { directiveName: 'translation-overlay', attributeName: 'translated', policy: 'optional-url-like-text' },
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

