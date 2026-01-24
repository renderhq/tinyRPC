import { Observable } from './observable';

/**
 * Represents a single procedure execution.
 * @public
 */
export interface Operation {
    /** The procedure path (e.g., 'user.getById') */
    path: string;
    /** The type of operation */
    type: 'query' | 'mutation' | 'subscription';
    /** The input data for the procedure */
    input: any;
    /** Unique operation identifier */
    id: number;
    /** Custom context passed through the link chain */
    context?: any;
    /** AbortSignal for request cancellation */
    signal?: AbortSignal;
}

/**
 * Definition for a tinyRPC Link, which intercepts and processes operations.
 * @public
 */
export interface TRPCLink {
    (opts: { op: Operation; next: (op: Operation) => any }): any;
}

/**
 * Orchestrates the execution of a link chain.
 * @internal
 */
export function executeLinkChain(opts: { links: TRPCLink[]; op: Operation }): any {
    const execute = (index: number, op: Operation): any => {
        const link = opts.links[index];
        if (!link) {
            throw new Error(`Link chain exhausted. Path: ${op.path}`);
        }

        return link({
            op,
            next: (nextOp) => execute(index + 1, nextOp),
        });
    };

    return execute(0, opts.op);
}

/**
 * Configuration options for HTTP-based links.
 * @public
 */
export interface HTTPLinkOptions {
    /** The base URL of the tRPC endpoint */
    url: string;
    /** Custom headers or a function that returns headers */
    headers?: any | (() => any | Promise<any>);
}

async function getHeaders(opts: HTTPLinkOptions) {
    const { headers } = opts;
    if (!headers) return {};
    if (typeof headers === 'function') return await headers();
    return headers;
}

/**
 * A link that sends requests over HTTP using the Fetch API.
 * @public
 */
export function httpLink(opts: HTTPLinkOptions): TRPCLink {
    return async ({ op }) => {
        const { path, type, input } = op;
        const baseUrl = opts.url.endsWith('/') ? opts.url.slice(0, -1) : opts.url;
        const method = type === 'query' ? 'GET' : 'POST';

        let url = `${baseUrl}/${path}?batch=false`;
        let body: string | undefined;

        if (type === 'query') {
            url += `&input=${encodeURIComponent(JSON.stringify(input))}`;
        } else {
            body = JSON.stringify(input);
        }

        const headers = await getHeaders(opts);

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            ...(body ? { body } : {}),
            signal: op.signal ?? null,
        });

        const json = await res.json();
        const traceHeader = res.headers.get('X-TinyRPC-Trace');

        return {
            result: json,
            trace: traceHeader ? JSON.parse(traceHeader) : undefined,
        };
    };
}

/**
 * A link that batches multiple HTTP requests into a single network call.
 * @public
 */
export function httpBatchLink(opts: HTTPLinkOptions & { maxBatchSize?: number }): TRPCLink {
    let batch: { op: Operation; resolve: (v: any) => void; reject: (v: any) => void }[] = [];
    let timer: any = null;

    return async ({ op }) => {
        return new Promise((resolve, reject) => {
            batch.push({ op, resolve, reject });

            if (!timer) {
                timer = setTimeout(async () => {
                    const fullBatch = [...batch];
                    batch = [];
                    timer = null;

                    const maxBatchSize = opts.maxBatchSize ?? Infinity;
                    const chunks: (typeof fullBatch)[] = [];

                    for (let i = 0; i < fullBatch.length; i += maxBatchSize) {
                        chunks.push(fullBatch.slice(i, i + maxBatchSize));
                    }

                    await Promise.all(
                        chunks.map(async (currentBatch) => {
                            const paths = currentBatch.map((b) => b.op.path).join(',');
                            const inputs = currentBatch.map((b) => b.op.input);

                            const hasMutation = currentBatch.some((b) => b.op.type === 'mutation');
                            const method = hasMutation ? 'POST' : 'GET';
                            const baseUrl = opts.url.endsWith('/') ? opts.url.slice(0, -1) : opts.url;

                            const url =
                                method === 'GET'
                                    ? `${baseUrl}/${paths}?batch=true&input=${encodeURIComponent(JSON.stringify(inputs))}`
                                    : `${baseUrl}/${paths}?batch=true`;

                            try {
                                const headers = await getHeaders(opts);
                                const res = await fetch(url, {
                                    method,
                                    headers: {
                                        'Content-Type': 'application/json',
                                        ...headers,
                                    },
                                    body: method === 'POST' ? JSON.stringify(inputs) : null,
                                    signal: currentBatch[0]?.op.signal ?? null,
                                });
                                const json = await res.json();
                                const traceHeader = res.headers.get('X-TinyRPC-Trace');
                                const trace = traceHeader ? JSON.parse(traceHeader) : undefined;

                                if (Array.isArray(json)) {
                                    currentBatch.forEach((b, i) =>
                                        b.resolve({
                                            result: json[i],
                                            trace: Array.isArray(trace) ? trace[i] : trace,
                                        })
                                    );
                                } else {
                                    currentBatch.forEach((b) =>
                                        b.resolve({
                                            result: json,
                                            trace,
                                        })
                                    );
                                }
                            } catch (err) {
                                currentBatch.forEach((b) => b.reject(err));
                            }
                        })
                    );
                }, 0);
            }
        });
    };
}
