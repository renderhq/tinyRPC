/**
 * @public
 * Creates a tRPC router from a registry of procedures and sub-routers.
 */
export function createRouter(procedures) {
    const router = {
        _def: {
            config: null,
            procedures: procedures,
        },
        ...procedures,
    };
    return router;
}
/**
 * @public
 * Merges multiple routers into a single root router.
 */
export function mergeRouters(root, sub) {
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
    };
}
//# sourceMappingURL=router.js.map