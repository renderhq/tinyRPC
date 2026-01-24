import type { AnyRouter } from '@tinyrpc/server';
import { createTRPCProxyClient } from './proxy';

export * from './proxy';
export * from './links';
export * from './observable';
export { wsLink } from './links/ws';
export { httpBatchLink, httpLink } from './links';
export { dedupeLink } from './links/dedupe';
export { retryLink } from './links/retry';
export { loggerLink } from './links/logger';
export { cacheLink } from './links/cache';
export { splitLink } from './links/split';
export { timeoutLink } from './links/timeout';
export { TRPCClientError } from './TRPCClientError';
export * from './types';

/**
 * @public
 */
export const createTRPCClient = <TRouter extends AnyRouter>(opts: { links: any[] }) => {
    return createTRPCProxyClient<TRouter>(opts);
};

/**
 * @public
 */
export { createTRPCProxyClient };
