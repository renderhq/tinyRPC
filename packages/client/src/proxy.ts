import type { TRPCLink } from './links';
import { executeLinkChain } from './links';
import type { AnyRouter } from '@tinyrpc/server';
import type { TRPCProxyClient } from './types';
import { map } from './observable';
import { TRPCClientError } from './TRPCClientError';

let idCounter = 0;

/**
 * @internal
 */
export function createTRPCProxyClient<TRouter extends AnyRouter>(opts: {
    links: TRPCLink[];
    transformer?: any;
}): TRPCProxyClient<TRouter> {
    const { links, transformer: transformerOpts } = opts;

    const transformer = transformerOpts
        ? typeof transformerOpts.serialize === 'function'
            ? { input: transformerOpts, output: transformerOpts }
            : transformerOpts
        : {
            input: { serialize: (v: any) => v },
            output: { deserialize: (v: any) => v },
        };

    function createProxy(path: string[]): any {
        return new Proxy(() => { }, {
            get(_target, prop: string) {
                if (['query', 'mutate', 'subscribe'].includes(prop)) {
                    return (input: any, clientOpts?: any) => {
                        const isSubscribe = prop === 'subscribe';
                        let actualInput = input;
                        let actualOpts = clientOpts;

                        // Handle shifted arguments if input is omitted for subscriptions
                        if (
                            isSubscribe &&
                            !clientOpts &&
                            input &&
                            typeof input === 'object' &&
                            (input.onData || input.onError || input.onComplete)
                        ) {
                            actualInput = undefined;
                            actualOpts = input;
                        }

                        const type =
                            prop === 'query' ? 'query' : prop === 'mutate' ? 'mutation' : 'subscription';
                        const serializedInput = transformer.input.serialize
                            ? transformer.input.serialize(actualInput)
                            : actualInput;

                        const op = {
                            path: path.join('.'),
                            type: type as 'query' | 'mutation' | 'subscription',
                            input: serializedInput,
                            id: ++idCounter,
                            signal: actualOpts?.signal,
                        };

                        const chain = executeLinkChain({ links, op });

                        if (isSubscribe) {
                            const transformed = chain.pipe(
                                map((data: any) =>
                                    transformer.output.deserialize ? transformer.output.deserialize(data) : data
                                )
                            );

                            if (
                                actualOpts &&
                                (actualOpts.onData || actualOpts.onError || actualOpts.onComplete)
                            ) {
                                return transformed.subscribe({
                                    next: actualOpts.onData,
                                    error: actualOpts.onError,
                                    complete: actualOpts.onComplete,
                                });
                            }
                            return transformed;
                        }

                        // ... inside createTRPCProxyClient ...
                        return chain.then((envelope: any) => {
                            const res = envelope.result;
                            if (res.error) {
                                if (res.error.data && transformer.output.deserialize) {
                                    res.error.data = transformer.output.deserialize(res.error.data);
                                }
                                throw TRPCClientError.from(res);
                            }
                            return transformer.output.deserialize
                                ? transformer.output.deserialize(res.result.data)
                                : res.result.data;
                        });
                    };
                }
                return createProxy([...path, prop]);
            },
        });
    }

    return createProxy([]);
}
