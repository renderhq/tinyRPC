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
                    const currentBatch = [...batch];
                    batch = [];
                    timer = null;

                    const paths = currentBatch.map(b => b.op.path).join(',');
                    const inputs = currentBatch.map(b => b.op.input);

                    const url = `${opts.url}/${paths}?batch=true&input=${encodeURIComponent(JSON.stringify(inputs))}`;

                    try {
                        const headers = await getHeaders(opts);
                        const res = await fetch(url, {
                            headers: {
                                'Content-Type': 'application/json',
                                ...headers,
                            },
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
                }, 0);
            }
        });
    };
}
