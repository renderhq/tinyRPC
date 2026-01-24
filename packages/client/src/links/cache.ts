import type { TRPCLink } from '../links';

/**
 * Options for the SWR cache link.
 * @public
 */
export interface CacheLinkOptions {
  /**
   * Time to live for cached items in milliseconds.
   * @default 3000 (3 seconds)
   */
  ttl?: number;
}

/**
 * Provides Stale-While-Revalidate (SWR) caching functionality.
 * Intercepts query operations and returns cached values immediately if available,
 * while triggering a background refresh if the data is stale.
 * @public
 */
export function cacheLink(opts: CacheLinkOptions = {}): TRPCLink {
  const ttl = opts.ttl ?? 3000;
  const cache = new Map<string, { data: any; timestamp: number }>();

  return (linkOpts) => {
    const { op, next } = linkOpts;

    // Caching is only applied to idempotent query operations
    if (op.type !== 'query') {
      return next(op);
    }

    const key = JSON.stringify({ path: op.path, input: op.input });
    const cached = cache.get(key);
    const now = Date.now();

    if (cached) {
      const isStale = now - cached.timestamp > ttl;

      if (!isStale) {
        return Promise.resolve(cached.data);
      }

      // Stale-While-Revalidate: Return stale data immediately, refresh in background
      next(op)
        .then((res: any) => {
          if (!res.result || !res.result.error) {
            cache.set(key, { data: res, timestamp: Date.now() });
          }
        })
        .catch(() => {
          // Background refresh failed; retain stale data in cache for next attempt
        });

      return Promise.resolve(cached.data);
    }

    // Standard request for uncached data
    return next(op).then((res: any) => {
      if (!res.result || !res.result.error) {
        cache.set(key, { data: res, timestamp: Date.now() });
      }
      return res;
    });
  };
}
