import { Observable } from './observable.js';

/**
 * @public
 */
export interface Operation {
    path: string;
    type: 'query' | 'mutation' | 'subscription';
    input: any;
    id: number;
    context?: any;
    signal?: AbortSignal;
}

/**
 * @public
 */
export interface TRPCLink {
    (opts: {
        op: Operation;
        next: (op: Operation) => any;
    }): any;
}

/**
 * @internal
 */
export function executeLinkChain(opts: {
    links: TRPCLink[];
    op: Operation;
}): any {
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
 * @public
 */
export interface HTTPLinkOptions {
    url: string;
    headers?: any | (() => any | Promise<any>);
}

async function getHeaders(opts: HTTPLinkOptions) {
    const { headers } = opts;
    if (!headers) return {};
    if (typeof headers === 'function') return await headers();
    return headers;
}

/**
 * @public
 */
export function httpLink(opts: HTTPLinkOptions): TRPCLink {
    return async ({ op }) => {
        const { path, type, input } = op;
        const url = `${opts.url}/${path}?batch=false`;

        const method = type === 'query' ? 'GET' : 'POST';
        const body = type === 'query' ? undefined : JSON.stringify(input);

        const finalUrl = type === 'query'
            ? `${url}&input=${encodeURIComponent(JSON.stringify(input))}`
            : url;

        const headers = await getHeaders(opts);

        const res = await fetch(finalUrl, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers,
            },
            ...(body ? { body } : {}),
            signal: op.signal ?? null,
        });

        return res.json();
    };
}

/**
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
                    const chunks: typeof fullBatch[] = [];

                    for (let i = 0; i < fullBatch.length; i += maxBatchSize) {
                        chunks.push(fullBatch.slice(i, i + maxBatchSize));
                    }

                    await Promise.all(chunks.map(async (currentBatch) => {
                        const paths = currentBatch.map(b => b.op.path).join(',');
                        const inputs = currentBatch.map(b => b.op.input);

                        // If any op is a mutation, we should use POST
                        const hasMutation = currentBatch.some(b => b.op.type === 'mutation');
                        const method = hasMutation ? 'POST' : 'GET';

                        const url = method === 'GET'
                            ? `${opts.url}/${paths}?batch=true&input=${encodeURIComponent(JSON.stringify(inputs))}`
                            : `${opts.url}/${paths}?batch=true`;

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

                            if (Array.isArray(json)) {
                                currentBatch.forEach((b, i) => b.resolve(json[i]));
                            } else {
                                currentBatch.forEach(b => b.resolve(json));
                            }
                        } catch (err) {
                            currentBatch.forEach(b => b.reject(err));
                        }
                    }));
                }, 0);
            }
        });
    };
}
