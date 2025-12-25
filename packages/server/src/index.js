import { createProcedureBuilder } from './procedure.js';
import { createRouter, mergeRouters } from './router.js';
import { TRPCError } from './errors.js';
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
class TRPCBuilder {
    /**
     * Create a new procedure builder.
     */
    get procedure() {
        return createProcedureBuilder();
    }
    /**
     * Create a new router.
     */
    router = createRouter;
    /**
     * Merge existing routers.
     */
    mergeRouters = mergeRouters;
    /**
     * Create a reusable middleware.
     */
    middleware = (fn) => {
        return fn;
    };
}
/**
 * @public
 */
export const initTRPC = {
    create: () => new TRPCBuilder(),
};
export { TRPCError };
//# sourceMappingURL=index.js.map