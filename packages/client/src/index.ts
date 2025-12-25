import type { AnyRouter } from '../../server/src/types.js';
import { createTRPCProxyClient } from './proxy.js';

export * from './proxy.js';
export * from './links.js';
export * from './observable.js';
export { wsLink } from './links/ws.js';
export * from './types.js';

/**
 * @public
 */
export const createTRPCClient = <TRouter extends AnyRouter>(opts: {
    links: any[];
}) => {
    return createTRPCProxyClient<TRouter>(opts);
};

/**
 * @public
 */
export { createTRPCProxyClient };
