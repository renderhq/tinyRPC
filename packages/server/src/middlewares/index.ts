import { TRPCError } from '../errors.js';
import type { ProcedureParams, MiddlewareFunction } from '../types.js';

/**
 * Audit log middleware
 */
export function auditLogMiddleware<TParams extends ProcedureParams>(): MiddlewareFunction<TParams, TParams> {
    return async (opts) => {
        const { path, type } = opts;
        const start = Date.now();
        const result = await opts.next();
        const duration = Date.now() - start;

        console.log(`[AuditLog] ${type} ${path} - duration: ${duration}ms, ok: ${result.ok}`);

        return result;
    };
}

/**
 * Basic in-memory rate limiting middleware
 */
export function rateLimitMiddleware<TParams extends ProcedureParams>(opts: {
    limit: number;
    windowMs: number;
}): MiddlewareFunction<TParams, TParams> {
    const hits = new Map<string, { count: number; reset: number }>();

    return async (innerOpts) => {
        const { ctx, next } = innerOpts;
        const identifier = (ctx as any).req?.socket?.remoteAddress || (ctx as any).user?.id || 'anonymous';

        const now = Date.now();
        const state = hits.get(identifier) || { count: 0, reset: now + opts.windowMs };

        if (now > state.reset) {
            state.count = 0;
            state.reset = now + opts.windowMs;
        }

        state.count++;
        hits.set(identifier, state);

        if (state.count > opts.limit) {
            throw new TRPCError({
                code: 'TOO_MANY_REQUESTS',
                message: `Rate limit exceeded. Try again in ${Math.round((state.reset - now) / 1000)}s`,
            });
        }

        return next();
    };
}
