import type { TRPCLink } from '../links.js';

export interface CacheLinkOptions {
    /**
     * Time to live in milliseconds.
     * @default 3000 (3 seconds)
     */
    ttl?: number;
}

/**
 * A link that provides Stale-While-Revalidate (SWR) caching for queries.
 * Returns cached data immediately if available, then refreshes it in the background.
 */
export function cacheLink(opts: CacheLinkOptions = {}): TRPCLink {
    const ttl = opts.ttl ?? 3000;
    const cache = new Map<string, { data: any; timestamp: number }>();

    return (linkOpts) => {
        const { op, next } = linkOpts;

        // Only cache queries
        if (op.type !== 'query') {
            return next(op);
        }

        const key = JSON.stringify({ path: op.path, input: op.input });
        const cached = cache.get(key);
        const now = Date.now();

        // If we have a cached value
        if (cached) {
            const isStale = now - cached.timestamp > ttl;

            if (!isStale) {
                // Return fresh cached data
                return Promise.resolve(cached.data);
            }

            // Data is stale, return it BUT also trigger a background refresh
            // This is the "Revalidate" part of SWR
            const refreshPromise = next(op).then((res: any) => {
                cache.set(key, { data: res, timestamp: Date.now() });
                return res;
            }).catch((err: any) => {
                // If refresh fails, we still returned the stale data, 
                // but we should probably log or handle it.
                return cached.data;
            });

            // Return the stale data immediately
            return Promise.resolve(cached.data);
        }

        // No cache, proceed as normal and populate cache
        return next(op).then((res: any) => {
            cache.set(key, { data: res, timestamp: Date.now() });
            return res;
        });
    };
}
