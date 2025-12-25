import type { TRPC_ERROR_CODE_KEY } from './errors.js';
import { TRPCError } from './errors.js';
/**
 * @internal
 */
export declare function getHTTPStatusCode(code: TRPC_ERROR_CODE_KEY): number;
/**
 * @internal
 */
export declare function transformTRPCResponse(err: TRPCError, path?: string): {
    error: {
        message: string;
        code: number;
        data: {
            code: TRPC_ERROR_CODE_KEY;
            httpStatus: number;
            path: string | undefined;
            stack: string | undefined;
        };
    };
};
//# sourceMappingURL=errorUtils.d.ts.map