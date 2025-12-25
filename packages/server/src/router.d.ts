import type { Router, AnyRootConfig } from './types.js';
/**
 * @public
 * Creates a tRPC router from a registry of procedures and sub-routers.
 */
export declare function createRouter<TProcedures extends Record<string, any>>(procedures: TProcedures): Router<AnyRootConfig> & TProcedures;
/**
 * @public
 * Merges multiple routers into a single root router.
 */
export declare function mergeRouters<TRoot extends Router<any>, TSub extends Router<any>>(root: TRoot, sub: TSub): TRoot & TSub;
//# sourceMappingURL=router.d.ts.map