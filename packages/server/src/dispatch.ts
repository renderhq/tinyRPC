import { TRPCError } from './errors.js';
import { callProcedure } from './middleware.js';
import type { Router, AnyProcedure, TRPCResponse } from './types.js';
import { transformTRPCResponse, getHTTPStatusCode } from './errorUtils.js';
import { getTransformer } from './transformer.js';

/**
 * @internal
 */
export async function resolveHTTPResponse(opts: {
    router: Router<any>;
    path: string;
    ctx: any;
    input: any;
    isBatch: boolean;
}): Promise<{ body: TRPCResponse | TRPCResponse[]; status: number; headers?: Record<string, string> }> {
    const { router, path, ctx, input, isBatch } = opts;
    const transformer = getTransformer(router._def.config?.transformer);

    const paths = isBatch ? path.split(',') : [path];
    const inputs = isBatch ? (Array.isArray(input) ? input : [input]) : [input];

    const allMetrics: any[] = [];
    const results = await Promise.all(
        paths.map(async (p, index) => {
            try {
                const rawInput = inputs[index];
                // Deserialize input
                const procedureInput = transformer.input.deserialize(rawInput);
                const result = await dispatch({ router, path: p, ctx, input: procedureInput });

                if (result._metrics) {
                    allMetrics.push({ path: p, ...result._metrics });
                }

                // Serialize data
                return { result: { data: transformer.output.serialize(result.data) } };
            } catch (err: any) {
                const trpcError =
                    err instanceof TRPCError
                        ? err
                        : new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: err.message,
                            cause: err,
                        });

                if ((trpcError as any)._metrics) {
                    allMetrics.push({ path: p, ...(trpcError as any)._metrics });
                }

                const response = transformTRPCResponse(trpcError, p);
                if ('error' in response && response.error.data) {
                    response.error.data = transformer.output.serialize(response.error.data);
                }
                return response;
            }
        })
    );

    const result = isBatch ? results : (results[0] as TRPCResponse);
    return {
        body: result,
        status: isBatch ? 200 : ('error' in result ? result.error.data?.httpStatus ?? 500 : 200),
        headers: allMetrics.length > 0 ? {
            'X-TinyRPC-Trace': JSON.stringify(isBatch ? allMetrics : allMetrics[0])
        } : undefined as any
    };
}


/**
 * @public
 */
export interface CORSOptions {
    origin?: string | string[] | ((origin: string) => boolean);
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAge?: number;
}

/**
 * @internal
 */
export function createHTTPHandler(opts: {
    router: Router<any>;
    createContext: (req: any, res: any) => Promise<any> | any;
    cors?: CORSOptions | boolean;
}) {
    return async (req: any, res: any) => {
        const { router, createContext, cors } = opts;

        // Handle CORS
        if (cors) {
            const corsOpts: CORSOptions = cors === true ? {} : cors;
            const requestOrigin = req.headers.origin || req.headers.referer;

            // Set Access-Control-Allow-Origin
            if (corsOpts.origin) {
                if (typeof corsOpts.origin === 'function') {
                    if (requestOrigin && corsOpts.origin(requestOrigin)) {
                        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
                    }
                } else if (Array.isArray(corsOpts.origin)) {
                    if (requestOrigin && corsOpts.origin.includes(requestOrigin)) {
                        res.setHeader('Access-Control-Allow-Origin', requestOrigin);
                    }
                } else {
                    res.setHeader('Access-Control-Allow-Origin', corsOpts.origin);
                }
            } else {
                res.setHeader('Access-Control-Allow-Origin', '*');
            }

            // Set other CORS headers
            res.setHeader(
                'Access-Control-Allow-Methods',
                (corsOpts.methods || ['GET', 'POST', 'OPTIONS']).join(', ')
            );
            res.setHeader(
                'Access-Control-Allow-Headers',
                (corsOpts.allowedHeaders || ['Content-Type', 'Authorization']).join(', ')
            );

            if (corsOpts.credentials) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }

            if (corsOpts.exposedHeaders) {
                res.setHeader('Access-Control-Expose-Headers', corsOpts.exposedHeaders.join(', '));
            }

            if (corsOpts.maxAge) {
                res.setHeader('Access-Control-Max-Age', String(corsOpts.maxAge));
            }

            // Handle preflight
            if (req.method === 'OPTIONS') {
                res.statusCode = 204;
                res.end();
                return;
            }
        }

        // Extract path and batch status
        const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
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
            if (req.body) {
                input = req.body;
            } else {
                // Read body from stream
                const buffers = [];
                for await (const chunk of req) {
                    buffers.push(chunk);
                }
                const bodyString = Buffer.concat(buffers).toString();
                try {
                    input = bodyString ? JSON.parse(bodyString) : {};
                } catch {
                    input = {};
                }
            }
        }

        try {
            const ctx = await createContext(req, res);
            const { body, status, headers } = await resolveHTTPResponse({
                router,
                path,
                ctx,
                input,
                isBatch,
            });

            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            if (headers) {
                for (const [key, value] of Object.entries(headers)) {
                    res.setHeader(key, value);
                }
            }
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
