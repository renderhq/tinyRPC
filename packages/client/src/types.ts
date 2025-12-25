import type { AnyRouter, AnyProcedure, Procedure } from '../../server/src/types.js';

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
            input: inferProcedureInput<TRouter[K]>
        ) => Promise<inferProcedureOutput<TRouter[K]>>;
        mutate: (
            input: inferProcedureInput<TRouter[K]>
        ) => Promise<inferProcedureOutput<TRouter[K]>>;
        subscribe: (
            input: inferProcedureInput<TRouter[K]>
        ) => Promise<inferProcedureOutput<TRouter[K]>>;
    }
    : TRouter[K] extends AnyRouter
    ? TRPCProxyClient<TRouter[K]>
    : never;
};

/**
 * Inference helpers for the client
 */
export type inferRouterInputs<TRouter extends AnyRouter> = {
    [K in keyof TRPCProxyClient<TRouter>]: TRPCProxyClient<TRouter>[K] extends { query: any }
    ? inferProcedureInput<TRouter[K]>
    : TRPCProxyClient<TRouter>[K] extends object
    ? inferRouterInputs<TRouter[K] & AnyRouter>
    : never;
};

export type inferRouterOutputs<TRouter extends AnyRouter> = {
    [K in keyof TRPCProxyClient<TRouter>]: TRPCProxyClient<TRouter>[K] extends { query: any }
    ? inferProcedureOutput<TRouter[K]>
    : TRPCProxyClient<TRouter>[K] extends object
    ? inferRouterOutputs<TRouter[K] & AnyRouter>
    : never;
};
