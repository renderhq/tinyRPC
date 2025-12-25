import type { Router, AnyRootConfig, RouterDef } from './types.js';

/**
 * @public
 * Creates a tRPC router from a registry of procedures and sub-routers.
 */
export function createRouter<TProcedures extends Record<string, any>>(
    procedures: TProcedures
): Router<AnyRootConfig> & TProcedures {
    const router = {
        _def: {
            config: null as any,
            procedures: procedures as any,
        } as RouterDef<any>,
        ...procedures,
    };

    return router as any;
}

/**
 * @public
 * Merges multiple routers into a single root router.
 */
export function mergeRouters<TRoot extends Router<any>, TSub extends Router<any>>(
    root: TRoot,
    sub: TSub
): TRoot & TSub {
    return {
        ...root,
        ...sub,
        _def: {
            ...root._def,
            procedures: {
                ...root._def.procedures,
                ...sub._def.procedures,
            },
        },
    } as any;
}
