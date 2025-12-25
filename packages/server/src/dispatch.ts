import { TRPCError } from './errors.js';
import { callProcedure } from './middleware.js';
import type { Router, AnyProcedure, TRPCResponse } from './types.js';
import { transformTRPCResponse, getHTTPStatusCode } from './errorUtils.js';

/**
 * @internal
 */
export async function resolveHTTPResponse(opts: {
    router: Router<any>;
    path: string;
    ctx: any;
    input: any;
    isBatch: boolean;
}): Promise<{ body: TRPCResponse | TRPCResponse[]; status: number }> {
    const { router, path, ctx, input, isBatch } = opts;

    const paths = isBatch ? path.split(',') : [path];
    const inputs = isBatch ? (Array.isArray(input) ? input : [input]) : [input];

    const results = await Promise.all(
        paths.map(async (p, index) => {
            try {
                const procedureInput = inputs[index];
                const data = await dispatch({ router, path: p, ctx, input: procedureInput });
                return { result: { data } };
            } catch (err: any) {
                const trpcError =
                    err instanceof TRPCError
                        ? err
                        : new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: err.message,
                            cause: err,
                        });
                return transformTRPCResponse(trpcError, p);
            }
        })
    );

    const result = isBatch ? results : (results[0] as TRPCResponse);
    return {
        body: result,
        status: isBatch ? 200 : ('error' in result ? result.error.data?.httpStatus ?? 500 : 200),
    };
}

/**
 * @internal
 */
export function createHTTPHandler(opts: {
    router: Router<any>;
    createContext: (req: any, res: any) => Promise<any> | any;
}) {
    return async (req: any, res: any) => {
        const { router, createContext } = opts;
        // Extract path and batch status
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
        // Strip the base path (e.g., /trpc) if it exists
        const path = url.pathname.startsWith('/trpc')
            ? url.pathname.slice(5).replace(/^\//, '')
            : url.pathname.replace(/^\//, '');

        const isBatch = url.searchParams.get('batch') === 'true';

        let input = {};
        if (req.method === 'GET') {
            const inputQuery = url.searchParams.get('input');
            try {
                input = inputQuery ? JSON.parse(inputQuery) : {};
            } catch {
                input = {};
            }
        } else {
            input = req.body ?? {};
        }

        try {
            const ctx = await createContext(req, res);
            const { body, status } = await resolveHTTPResponse({
                router,
                path,
                ctx,
                input,
                isBatch,
            });

            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(body));
        } catch (err: any) {
            const trpcError = err instanceof TRPCError ? err : new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: err.message,
            });
            const body = transformTRPCResponse(trpcError, path);
            res.statusCode = getHTTPStatusCode(trpcError.code);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(body));
        }
    };
}

/**
 * @internal
 */
async function dispatch(opts: {
    router: Router<any>;
    path: string;
    ctx: any;
    input: any;
}) {
    const { router, path, ctx, input } = opts;
    const pathArray = path.split('.');

    let current: any = router;
    for (const segment of pathArray) {
        if (!current || typeof current !== 'object') {
            throw new TRPCError({
                code: 'NOT_FOUND',
                message: `Invalid path segment: ${segment}`
            });
        }
        current = current[segment] ?? current._def?.procedures?.[segment];
    }

    if (!current?._def?.procedure) {
        throw new TRPCError({
            code: 'NOT_FOUND',
            message: `Procedure not found: ${path}`
        });
    }

    return callProcedure({
        procedure: current as AnyProcedure,
        ctx,
        input,
        path,
        type: current._def.type,
    });
}
