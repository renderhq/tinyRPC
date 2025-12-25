export type TRPC_ERROR_CODE_KEY = 'PARSE_ERROR' | 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'METHOD_NOT_SUPPORTED' | 'TIMEOUT' | 'CONFLICT' | 'PRECONDITION_FAILED' | 'PAYLOAD_TOO_LARGE' | 'UNPROCESSABLE_CONTENT' | 'TOO_MANY_REQUESTS' | 'CLIENT_CLOSED_REQUEST' | 'INTERNAL_SERVER_ERROR' | 'NOT_IMPLEMENTED';
export declare class TRPCError extends Error {
    readonly code: TRPC_ERROR_CODE_KEY;
    readonly cause?: Error;
    constructor(opts: {
        message?: string;
        code: TRPC_ERROR_CODE_KEY;
        cause?: Error;
    });
}
//# sourceMappingURL=errors.d.ts.map