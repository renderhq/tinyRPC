import type { MiddlewareFunction } from '../types.js';
/**
 * Audit log middleware
 */
export declare function auditLogMiddleware(): MiddlewareFunction<any, any>;
/**
 * Basic in-memory rate limiting middleware
 */
export declare function rateLimitMiddleware(opts: {
    limit: number;
    windowMs: number;
}): MiddlewareFunction<any, any>;
//# sourceMappingURL=index.d.ts.map