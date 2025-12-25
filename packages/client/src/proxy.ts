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
                    return (input: any, opts?: any) => {
                        const type = prop === 'query' ? 'query' as const : prop === 'mutate' ? 'mutation' as const : 'subscription' as const;
                        const op = {
                            path: path.join('.'),
                            type,
                            input,
                            id: ++idCounter,
                        };

                        if (prop === 'subscribe') {
                            const observable = executeLinkChain({ links, op });
                            if (opts && (opts.onData || opts.onError || opts.onComplete)) {
                                observable.subscribe({
                                    next: opts.onData,
                                    error: opts.onError,
                                    complete: opts.onComplete,
                                });
                            }
                            return observable;
                        }

                        return executeLinkChain({ links, op }).then((res: any) => {
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
