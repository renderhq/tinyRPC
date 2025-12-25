import { createProcedureBuilder } from './procedure.js';
import { createRouter, mergeRouters } from './router.js';
import { TRPCError } from './errors.js';
import type { AnyRootConfig, MiddlewareFunction, ProcedureParams } from './types.js';

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
export * from './middlewares/index.js';

/**
 * @internal
 */
class TRPCBuilder<TConfig extends AnyRootConfig> {
    /**
     * Create a new procedure builder.
     */
    public get procedure() {
        return createProcedureBuilder<TConfig>();
    }

    /**
     * Create a new router.
     */
    public router = createRouter;

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
    >() => new TRPCBuilder<TConfig>(),
};

export { TRPCError };
