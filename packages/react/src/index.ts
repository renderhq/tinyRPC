import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { TRPCProxyClient } from '@tinyrpc/client';
import type { AnyRouter } from '@tinyrpc/server';

/**
 * Utility to parse input and options arguments for hooks
 */
function parseArguments<T>(input: any, opts?: any) {
  const isInputOptions =
    input &&
    typeof input === 'object' &&
    ('enabled' in input ||
      'refetchInterval' in input ||
      'staleTime' in input ||
      'select' in input ||
      'onData' in input ||
      'onError' in input ||
      'onComplete' in input);

  return {
    actualInput: isInputOptions && !opts ? undefined : input,
    actualOpts: isInputOptions && !opts ? input : opts,
  };
}

/**
 * Hook name constants for better maintainability
 */
const HOOK_NAMES = {
  USE_QUERY: 'useQuery',
  USE_MUTATION: 'useMutation',
  USE_SUBSCRIPTION: 'useSubscription',
  USE_UTILS: 'useUtils',
  USE_CONTEXT: 'useContext',
} as const;

/**
 * Utility to traverse the client proxy based on a path array.
 */
function getClientPath(client: any, path: string[]) {
  return path.reduce((acc: any, segment) => acc[segment], client);
}

/**
 * Creates a React-specific proxy client for tinyRPC.
 * Provides hooks like .useQuery() and .useMutation() for a standard React integration.
 *
 * @example
 * ```typescript
 * const createHooks = createTRPCReact<typeof router>();
 * const trpc = createHooks(client);
 * const data = trpc.getUser.useQuery({ id: '123' });
 * ```
 *
 * @public
 */
export function createTRPCReact<TRouter extends AnyRouter>() {
  return function (client: TRPCProxyClient<TRouter>) {
    function createProxy(path: string[]): any {
      return new Proxy(Object.create(null), {
        get(_target, prop: string) {
          if (prop === HOOK_NAMES.USE_QUERY) {
            return (input: any, opts?: any) => {
              const { actualInput, actualOpts } = parseArguments(input, opts);
              const queryPath = useMemo(() => path.join('.'), [path]);

              return useQuery({
                queryKey: [queryPath, actualInput],
                queryFn: () => getClientPath(client, path).query(actualInput),
                ...actualOpts,
              });
            };
          }

          if (prop === 'useInfiniteQuery') {
            return (input: any, opts?: any) => {
              const queryPath = useMemo(() => path.join('.'), [path]);

              return useInfiniteQuery({
                queryKey: [queryPath, input],
                queryFn: ({ pageParam }: any) =>
                  getClientPath(client, path).query({
                    ...input,
                    cursor: pageParam,
                  }),
                initialPageParam: opts?.initialCursor,
                getNextPageParam: (lastPage: any) => lastPage?.nextCursor,
                ...opts,
              });
            };
          }

          if (prop === HOOK_NAMES.USE_MUTATION) {
            return (opts?: any) => {
              const procedure = getClientPath(client, path);

              if (!procedure || typeof procedure.mutate !== 'function') {
                throw new Error(`Procedure ${path.join('.')} not found or not a mutation`);
              }

              return useMutation({
                mutationFn: (input: any) => procedure.mutate(input),
                ...opts,
              });
            };
          }

          if (prop === HOOK_NAMES.USE_SUBSCRIPTION) {
            return (
              input: any,
              opts: {
                onData?: (data: any) => void;
                onError?: (err: any) => void;
                onComplete?: () => void;
              }
            ) => {
              const { actualInput, actualOpts } = parseArguments(input, opts);
              const queryPath = useMemo(() => path.join('.'), [path]);
              const inputKey = useMemo(() => JSON.stringify(actualInput), [actualInput]);

              useEffect(() => {
                const procedure = getClientPath(client, path);

                if (!procedure || typeof procedure.subscribe !== 'function') {
                  console.error(`Procedure ${queryPath} not found or not a subscription`);
                  return;
                }

                const subscription = procedure.subscribe(actualInput, {
                  onData: actualOpts?.onData,
                  onError: actualOpts?.onError,
                  onComplete: actualOpts?.onComplete,
                });

                return () => {
                  try {
                    subscription.unsubscribe();
                  } catch (error) {
                    console.warn(`Failed to unsubscribe from ${queryPath}:`, error);
                  }
                };
              }, [
                queryPath,
                inputKey,
                actualOpts?.onData,
                actualOpts?.onError,
                actualOpts?.onComplete,
              ]);
            };
          }

          if (prop === HOOK_NAMES.USE_UTILS || prop === HOOK_NAMES.USE_CONTEXT) {
            return () => {
              const queryClient = useQueryClient();
              const queryPath = useMemo(() => path.join('.'), [path]);

              return {
                invalidate: (input?: any) =>
                  queryClient.invalidateQueries({ queryKey: [queryPath, input] }),
                prefetch: (input: any) =>
                  queryClient.prefetchQuery({
                    queryKey: [queryPath, input],
                    queryFn: () => getClientPath(client, path).query(input),
                  }),
                setData: (input: any, updater: any) =>
                  queryClient.setQueryData([queryPath, input], updater),
                invalidateQueries: (input?: any) =>
                  queryClient.invalidateQueries({ queryKey: [queryPath, input] }),
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
