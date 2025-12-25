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
declare class TRPCBuilder<TConfig extends AnyRootConfig> {
    /**
     * Create a new procedure builder.
     */
    get procedure(): import("./procedure.js").ProcedureBuilder<{
        _config: TConfig;
        _ctx_out: TConfig["ctx"];
        _input_in: any;
        _input_out: any;
        _output_in: any;
        _output_out: any;
        _meta: TConfig["meta"];
    }>;
    /**
     * Create a new router.
     */
    router: typeof createRouter;
    /**
     * Merge existing routers.
     */
    mergeRouters: typeof mergeRouters;
    /**
     * Create a reusable middleware.
     */
    middleware: <TNewParams extends ProcedureParams>(fn: MiddlewareFunction<{
        _config: TConfig;
        _ctx_out: TConfig["ctx"];
        _input_in: any;
        _input_out: any;
        _output_in: any;
        _output_out: any;
        _meta: TConfig["meta"];
    }, TNewParams>) => MiddlewareFunction<{
        _config: TConfig;
        _ctx_out: TConfig["ctx"];
        _input_in: any;
        _input_out: any;
        _output_in: any;
        _output_out: any;
        _meta: TConfig["meta"];
    }, TNewParams>;
}
/**
 * @public
 */
export declare const initTRPC: {
    create: <TConfig extends AnyRootConfig = {
        ctx: {};
        meta: {};
        errorShape: any;
        transformer: any;
    }>() => TRPCBuilder<TConfig>;
};
export { TRPCError };
//# sourceMappingURL=index.d.ts.map