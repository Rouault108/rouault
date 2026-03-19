import type { DirectiveName, MdastNode, VFileLike } from '../types';

export interface DirectiveValidationContext {
  readonly file?: VFileLike;
  readonly parentType?: string;
}

export interface DirectiveValidator {
  readonly name: DirectiveName;
  validate(node: MdastNode, context: DirectiveValidationContext): void;
}
