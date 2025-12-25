import { createProcedureBuilder } from './procedure.js';
import { createRouter, mergeRouters } from './router.js';
import { TRPCError } from './errors.js';
import type { AnyRootConfig, MiddlewareFunction, ProcedureParams, Router } from './types.js';

export * from './types.js';
export * from './errors.js';
export * from './router.js';
export * from './procedure.js';
export * from './middleware.js';
export * from './transformer.js';
export * from './dispatch.js';
export * from './errorUtils.js';
export * from './observable.js';
export * from './adapters/ws.js';
export * from './adapters/fetch.js';
export * from './middlewares/index.js';
export * from './caller.js';

/**
 * @internal
 */
class TRPCBuilder<TConfig extends AnyRootConfig> {
    constructor(public _config: TConfig) { }

    /**
     * Create a new procedure builder.
     */
    public get procedure() {
        return createProcedureBuilder<TConfig>();
    }

    /**
     * Create a new router.
     */
    public router = <TProcedures extends Record<string, any>>(
        procedures: TProcedures
    ): Router<TConfig> & TProcedures => {
        const router = createRouter(procedures);
        router._def.config = this._config;
        return router as any;
    };

    /**
     * Merge existing routers.
     */
    public mergeRouters = mergeRouters;

    /**
     * Create a reusable middleware.
     */
    public middleware = <TNewParams extends ProcedureParams>(
        fn: MiddlewareFunction<
            {
                _config: TConfig;
                _ctx_out: TConfig['ctx'];
                _input_in: any;
                _input_out: any;
                _output_in: any;
                _output_out: any;
                _meta: TConfig['meta'];
            },
            TNewParams
        >
    ): MiddlewareFunction<
        {
            _config: TConfig;
            _ctx_out: TConfig['ctx'];
            _input_in: any;
            _input_out: any;
            _output_in: any;
            _output_out: any;
            _meta: TConfig['meta'];
        },
        TNewParams
    > => {
        return fn;
    };
}

/**
 * @public
 */
export const initTRPC = {
    create: <
        TConfig extends AnyRootConfig = {
            ctx: {};
            meta: {};
            errorShape: any;
            transformer: any;
        }
    >(opts?: {
        transformer?: TConfig['transformer'];
        errorShape?: TConfig['errorShape'];
    }) => {
        const config: TConfig = {
            ctx: {} as any,
            meta: {} as any,
            ...opts,
        } as any;
        return new TRPCBuilder<TConfig>(config);
    },
};

export { TRPCError };
