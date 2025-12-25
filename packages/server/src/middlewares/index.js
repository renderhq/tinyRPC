import { TRPCError } from '../errors.js';
/**
 * Audit log middleware
 */
export function auditLogMiddleware() {
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
export function rateLimitMiddleware(opts) {
    const hits = new Map();
    return async (innerOpts) => {
        const { ctx, next } = innerOpts;
        const identifier = ctx.req?.socket?.remoteAddress || ctx.user?.id || 'anonymous';
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
//# sourceMappingURL=index.js.map