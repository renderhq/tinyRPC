import { TRPCError } from '../errors';
import type { ProcedureParams, MiddlewareFunction } from '../types';

/**
 * A middleware that logs procedure execution timing and status to the server console.
 * @public
 */
export function auditLogMiddleware<TParams extends ProcedureParams>(): MiddlewareFunction<
  TParams,
  TParams
> {
  return async (opts) => {
    const { path, type } = opts;
    const start = performance.now();
    const result = await opts.next();
    const duration = performance.now() - start;

    const status = result.ok ? 'OK' : 'ERROR';
    console.log(`[tinyRPC] ${status} ${type} ${path} (${duration.toFixed(2)}ms)`);

    return result;
  };
}

/**
 * Basic in-memory rate limiting middleware.
 * Identifies clients by context request metadata or authenticated user ID.
 * @public
 */
export function rateLimitMiddleware<TParams extends ProcedureParams>(opts: {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** The rate limiting window in milliseconds */
  windowMs: number;
}): MiddlewareFunction<TParams, TParams> {
  const hits = new Map<string, { count: number; reset: number }>();

  return async (innerOpts) => {
    const { ctx, next } = innerOpts;
    const identifier =
      (ctx as any).req?.socket?.remoteAddress || (ctx as any).user?.id || 'anonymous';

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
        message: `Rate limit exceeded. Retry in ${Math.ceil((state.reset - now) / 1000)}s`,
      });
    }

    return next();
  };
}
