import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { TRPCProxyClient } from '@tinyrpc/client';
import type { AnyRouter } from '@tinyrpc/server';

/**
 * Utility to traverse the client proxy based on a path array.
 */
function getClientPath(client: any, path: string[]) {
    return path.reduce((acc, segment) => acc[segment], client);
}

/**
 * Creates a React-specific proxy client for tinyRPC.
 * Provides hooks like .useQuery() and .useMutation() for a standard React integration.
 * @public
 */
export function createTRPCReact<TRouter extends AnyRouter>() {
    return function (client: TRPCProxyClient<TRouter>) {

        function createProxy(path: string[]): any {
            return new Proxy(() => { }, {
                get(_target, prop: string) {
                    if (prop === 'useQuery') {
                        return (input: any, opts?: any) => {
                            // Shift arguments if input is omitted and first arg looks like options
                            const isInputOptions =
                                input &&
                                typeof input === 'object' &&
                                ('enabled' in input ||
                                    'refetchInterval' in input ||
                                    'staleTime' in input ||
                                    'select' in input);

                            const actualInput = isInputOptions && !opts ? undefined : input;
                            const actualOpts = isInputOptions && !opts ? input : opts;

                            return useQuery({
                                queryKey: [path.join('.'), actualInput],
                                queryFn: () => getClientPath(client, path).query(actualInput),
                                ...actualOpts,
                            });
                        };
                    }

                    if (prop === 'useInfiniteQuery') {
                        return (input: any, opts?: any) => {
                            return useInfiniteQuery({
                                queryKey: [path.join('.'), input],
                                queryFn: ({ pageParam }: any) =>
                                    getClientPath(client, path).query({
                                        ...input,
                                        cursor: pageParam,
                                    }),
                                initialPageParam: opts?.initialCursor,
                                getNextPageParam: (lastPage: any) => lastPage.nextCursor,
                                ...opts,
                            });
                        };
                    }

                    if (prop === 'useMutation') {
                        return (opts?: any) => {
                            const procedure = getClientPath(client, path);
                            return useMutation({
                                mutationFn: (input: any) => procedure.mutate(input),
                                ...opts,
                            });
                        };
                    }

                    if (prop === 'useSubscription') {
                        return (
                            input: any,
                            opts: { onData?: (data: any) => void; onError?: (err: any) => void }
                        ) => {
                            const isInputOptions =
                                input &&
                                typeof input === 'object' &&
                                ('onData' in input || 'onError' in input || 'onComplete' in input);

                            const actualInput = isInputOptions && !opts ? undefined : input;
                            const actualOpts = isInputOptions && !opts ? input : opts;

                            useEffect(() => {
                                const sub = getClientPath(client, path).subscribe(actualInput, {
                                    onData: actualOpts?.onData,
                                    onError: actualOpts?.onError,
                                    onComplete: actualOpts?.onComplete,
                                });
                                return () => sub.unsubscribe();
                            }, [path.join('.'), JSON.stringify(actualInput)]);
                        };
                    }

                    if (prop === 'useUtils' || prop === 'useContext') {
                        return () => {
                            const queryClient = useQueryClient();
                            return {
                                invalidate: (input?: any) =>
                                    queryClient.invalidateQueries({ queryKey: [path.join('.'), input] }),
                                prefetch: (input: any) =>
                                    queryClient.prefetchQuery({
                                        queryKey: [path.join('.'), input],
                                        queryFn: () => getClientPath(client, path).query(input),
                                    }),
                                setData: (input: any, updater: any) =>
                                    queryClient.setQueryData([path.join('.'), input], updater),
                            };
                        };
                    }

                    return createProxy([...path, prop]);
                },
            });
        }

        return createProxy([]) as any;
    };
}
