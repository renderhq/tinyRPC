import type { TRPCLink } from './links.js';
import { executeLinkChain } from './links.js';
import type { AnyRouter } from '@tinyrpc/server';
import type { TRPCProxyClient } from './types.js';

let idCounter = 0;

/**
 * @internal
 */
export function createTRPCProxyClient<TRouter extends AnyRouter>(opts: {
    links: TRPCLink[];
    transformer?: any;
}): TRPCProxyClient<TRouter> {
    const { links, transformer: transformerOpts } = opts;

    const transformer = transformerOpts ? (
        typeof transformerOpts.serialize === 'function'
            ? { input: transformerOpts, output: transformerOpts }
            : transformerOpts
    ) : {
        input: { serialize: (v: any) => v },
        output: { deserialize: (v: any) => v }
    };

    function createProxy(path: string[]): any {
        return new Proxy(() => { }, {
            get(_target, prop: string) {
                if (['query', 'mutate', 'subscribe'].includes(prop)) {
                    return (input: any, clientOpts?: any) => {
                        const type = prop === 'query' ? 'query' : prop === 'mutate' ? 'mutation' : 'subscription';
                        const serializedInput = transformer.input.serialize ? transformer.input.serialize(input) : input;

                        const op = {
                            path: path.join('.'),
                            type: type as 'query' | 'mutation' | 'subscription',
                            input: serializedInput,
                            id: ++idCounter,
                            signal: clientOpts?.signal,
                        };

                        const chain = executeLinkChain({ links, op });

                        if (prop === 'subscribe') {
                            const transformed = chain.map((data: any) =>
                                transformer.output.deserialize ? transformer.output.deserialize(data) : data
                            );

                            if (clientOpts && (clientOpts.onData || clientOpts.onError || clientOpts.onComplete)) {
                                transformed.subscribe({
                                    next: clientOpts.onData,
                                    error: clientOpts.onError,
                                    complete: clientOpts.onComplete,
                                });
                            }
                            return transformed;
                        }

                        return chain.then((envelope: any) => {
                            const res = envelope.result;
                            if (res.error) {
                                if (res.error.data && transformer.output.deserialize) {
                                    res.error.data = transformer.output.deserialize(res.error.data);
                                }
                                throw res;
                            }
                            return transformer.output.deserialize ? transformer.output.deserialize(res.result.data) : res.result.data;
                        });
                    };
                }
                return createProxy([...path, prop]);
            },
        });
    }

    return createProxy([]);
}
