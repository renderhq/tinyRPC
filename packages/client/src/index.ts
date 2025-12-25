import type { AnyRouter } from '../../server/src/types.js';
import { createTRPCProxyClient } from './proxy.js';

export * from './proxy.js';
export * from './links.js';
export * from './types.js';

/**
 * @public
 * Standard entry point for creating a tRPC client in v10+.
 */
export const createTRPCClient = <TRouter extends AnyRouter>(opts: {
    links: any[];
}) => {
    return createTRPCProxyClient<TRouter>(opts);
};

/**
 * @public
 * Alias for creating a proxy client.
 */
export { createTRPCProxyClient };
