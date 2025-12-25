import type { TRPCLink } from './links.js';
import { executeLinkChain } from './links.js';
import type { AnyRouter } from '../../server/src/types.js';
import type { TRPCProxyClient } from './types.js';

let idCounter = 0;

/**
 * @internal
 */
export function createTRPCProxyClient<TRouter extends AnyRouter>(opts: {
    links: TRPCLink[];
}): TRPCProxyClient<TRouter> {
    const { links } = opts;

    function createProxy(path: string[]): any {
        return new Proxy(() => { }, {
            get(_target, prop: string) {
                if (['query', 'mutate', 'subscribe'].includes(prop)) {
                    return (input: any) => {
                        return executeLinkChain({
                            links,
                            op: {
                                path: path.join('.'),
                                type: prop === 'query' ? 'query' : prop === 'mutate' ? 'mutation' : 'subscription',
                                input,
                                id: ++idCounter,
                            },
                        }).then((res: any) => {
                            if (res.error) {
                                throw res;
                            }
                            return res.result.data;
                        });
                    };
                }
                return createProxy([...path, prop]);
            },
        });
    }

    return createProxy([]);
}
