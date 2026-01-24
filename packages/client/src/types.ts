import type { AnyRouter, AnyProcedure, Procedure, Unsubscribable } from '@tinyrpc/server';
import { Observable } from '@tinyrpc/server';

/**
 * @internal
 */
export type inferProcedureInput<TProcedure extends AnyProcedure> =
  TProcedure extends Procedure<infer TParams> ? TParams['_input_in'] : never;

/**
 * @internal
 */
export type inferProcedureOutput<TProcedure extends AnyProcedure> =
  TProcedure extends Procedure<infer TParams> ? TParams['_output_out'] : never;

/**
 * @internal
 */
export type TRPCProxyClient<TRouter extends AnyRouter> = {
  [K in keyof TRouter as K extends '_def' ? never : K]: TRouter[K] extends AnyProcedure
    ? {
        query: (
          ...args: inferProcedureInput<TRouter[K]> extends undefined | void
            ? [input?: inferProcedureInput<TRouter[K]>]
            : [input: inferProcedureInput<TRouter[K]>]
        ) => Promise<inferProcedureOutput<TRouter[K]>>;
        mutate: (
          ...args: inferProcedureInput<TRouter[K]> extends undefined | void
            ? [input?: inferProcedureInput<TRouter[K]>]
            : [input: inferProcedureInput<TRouter[K]>]
        ) => Promise<inferProcedureOutput<TRouter[K]>>;
        subscribe: (
          ...args: inferProcedureInput<TRouter[K]> extends undefined | void
            ? [
                input?: inferProcedureInput<TRouter[K]>,
                opts?: {
                  onData?: (data: inferProcedureOutput<TRouter[K]>) => void;
                  onError?: (err: any) => void;
                  onComplete?: () => void;
                },
              ]
            : [
                input: inferProcedureInput<TRouter[K]>,
                opts?: {
                  onData?: (data: inferProcedureOutput<TRouter[K]>) => void;
                  onError?: (err: any) => void;
                  onComplete?: () => void;
                },
              ]
        ) => Unsubscribable;
      }
    : TRouter[K] extends AnyRouter
      ? TRPCProxyClient<TRouter[K]>
      : never;
};

/**
 * Inference helpers for the client
 */
export type inferRouterInputs<TRouter extends AnyRouter> = {
  [K in keyof TRPCProxyClient<TRouter> as K extends '_def'
    ? never
    : K]: TRouter[K] extends AnyProcedure
    ? inferProcedureInput<TRouter[K]>
    : TRouter[K] extends AnyRouter
      ? inferRouterInputs<TRouter[K]>
      : never;
};

export type inferRouterOutputs<TRouter extends AnyRouter> = {
  [K in keyof TRPCProxyClient<TRouter> as K extends '_def'
    ? never
    : K]: TRouter[K] extends AnyProcedure
    ? inferProcedureOutput<TRouter[K]>
    : TRouter[K] extends AnyRouter
      ? inferRouterOutputs<TRouter[K]>
      : never;
};
