import type { AnyRouter, AnyProcedure, inferRouterContext } from './types.js';
import { callProcedure } from './middleware.js';

export type RouterCaller<TRouter extends AnyRouter> = {
    [K in keyof TRouter as K extends '_def' ? never : K]: TRouter[K] extends AnyProcedure
    ? {
        query: (input: TRouter[K]['_def']['_input_in']) => Promise<TRouter[K]['_def']['_output_out']>;
        mutate: (input: TRouter[K]['_def']['_input_in']) => Promise<TRouter[K]['_def']['_output_out']>;
    }
    : TRouter[K] extends AnyRouter
    ? RouterCaller<TRouter[K]>
    : never;
};

/**
 * Creates a "caller" for a router that can be used server-side
 * with full type safety, bypassing the network.
 */
export function createCallerFactory<TRouter extends AnyRouter>(router: TRouter) {
    return (ctx: inferRouterContext<TRouter>): RouterCaller<TRouter> => {
        const proxy = (path: string[]): any => {
            return new Proxy(() => { }, {
                get(_target, prop: string) {
                    if (prop === 'query' || prop === 'mutate') {
                        return (input: any) => {
                            const procedurePath = path.join('.');
                            // Find procedure in router
                            let current: any = router;
                            for (const segment of path) {
                                current = current[segment] ?? current._def?.procedures?.[segment];
                            }

                            if (!current?._def?.procedure) {
                                throw new Error(`Procedure not found: ${procedurePath}`);
                            }

                            return callProcedure({
                                procedure: current,
                                ctx,
                                input,
                                path: procedurePath,
                                type: current._def.type,
                            });
                        };
                    }
                    return proxy([...path, prop]);
                },
            });
        };

        return proxy([]);
    };
}
