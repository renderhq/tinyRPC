export type TRPC_ERROR_CODE_KEY =
    | 'PARSE_ERROR'
    | 'BAD_REQUEST'
    | 'UNAUTHORIZED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'METHOD_NOT_SUPPORTED'
    | 'TIMEOUT'
    | 'CONFLICT'
    | 'PRECONDITION_FAILED'
    | 'PAYLOAD_TOO_LARGE'
    | 'UNPROCESSABLE_CONTENT'
    | 'TOO_MANY_REQUESTS'
    | 'CLIENT_CLOSED_REQUEST'
    | 'INTERNAL_SERVER_ERROR'
    | 'NOT_IMPLEMENTED';

export class TRPCError extends Error {
    public readonly code: TRPC_ERROR_CODE_KEY;
    public readonly cause?: Error;

    constructor(opts: {
        message?: string;
        code: TRPC_ERROR_CODE_KEY;
        cause?: Error;
    }) {
        super(opts.message ?? opts.code);
        this.code = opts.code;
        if (opts.cause) {
            this.cause = opts.cause;
        }
        this.name = 'TRPCError';
        Object.setPrototypeOf(this, TRPCError.prototype);
    }
}
