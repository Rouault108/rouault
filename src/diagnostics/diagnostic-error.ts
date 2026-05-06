export interface DiagnosticErrorDetail {
  readonly code: string;
  readonly message: string;
}

export class DiagnosticError extends Error {
  readonly code: string;

  constructor(detail: DiagnosticErrorDetail) {
    super(detail.message);
    this.name = 'DiagnosticError';
    this.code = detail.code;
  }
}
