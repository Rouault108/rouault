import type { NotePolicyContext } from '../policy/note-policy-context.js';
import type { DirectivePayload } from '../payload/payload-types.js';
import type { DirectiveName, MdastNode, VFileLike } from '../types.js';

export interface DirectiveValidationInput {
  readonly node: MdastNode;
  readonly name: DirectiveName;
  readonly payload: DirectivePayload | undefined;
  readonly file?: VFileLike;
  readonly policyContext: NotePolicyContext;
  readonly parentDirectiveName?: DirectiveName;
}
