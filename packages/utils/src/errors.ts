import type { ApxErrorCode } from '@apx/types';

export class ApxError extends Error {
  public readonly code: ApxErrorCode;
  public readonly suggestion?: string;

  constructor(code: ApxErrorCode, message: string, suggestion?: string) {
    super(message);
    this.name = 'ApxError';
    this.code = code;
    this.suggestion = suggestion;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
