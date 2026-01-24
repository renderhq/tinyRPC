import { TRPC_ERROR_CODES, type TRPCErrorCode } from './errorCodes';

/**
 * Custom error class for tinyRPC procedures.
 * Supports standard JSON-RPC 2.0 error codes and HTTP mapping.
 * @public
 */
export class TRPCError extends Error {
  public readonly code: TRPCErrorCode;
  public readonly numericCode: number;
  public readonly cause?: Error;

  constructor(opts: { message?: string; code: TRPCErrorCode; cause?: Error }) {
    super(opts.message ?? opts.code);
    this.code = opts.code;
    this.numericCode = TRPC_ERROR_CODES[opts.code];

    if (opts.cause) {
      this.cause = opts.cause;
    }

    this.name = 'TRPCError';
    Object.setPrototypeOf(this, TRPCError.prototype);
  }
}

export type { TRPCErrorCode };
