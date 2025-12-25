import { ZodType } from 'zod';
import { Observable } from './observable.js';
/**
 * @internal
 */
export function createProcedureBuilder() {
    return createNewBuilder({
        middlewares: [],
    });
}
function createNewBuilder(def) {
    return {
        _def: def,
        input(schema) {
            return createNewBuilder({
                ...def,
                inputParser: schema,
            });
        },
        output(schema) {
            return createNewBuilder({
                ...def,
                outputParser: schema,
            });
        },
        use(fn) {
            return createNewBuilder({
                ...def,
                middlewares: [...def.middlewares, fn],
            });
        },
        meta(meta) {
            return createNewBuilder({
                ...def,
                meta,
            });
        },
        query(resolver) {
            return createProcedure(def, 'query', resolver);
        },
        mutation(resolver) {
            return createProcedure(def, 'mutation', resolver);
        },
        subscription(resolver) {
            return createProcedure(def, 'subscription', resolver);
        },
    };
}
function createProcedure(def, type, resolver) {
    return {
        _def: {
            ...def,
            procedure: true,
            type,
            resolver: (opts) => {
                if (type === 'subscription') {
                    return resolver(opts);
                }
                return Promise.resolve(resolver(opts));
            },
        },
    };
}
//# sourceMappingURL=procedure.js.map