import type { TRPCLink } from '../links.js';

/**
 * Deduplicates concurrent identical query requests.
 * Only 'query' operations are deduplicated.
 */
export function dedupeLink(): TRPCLink {
    const inflight = new Map<string, Promise<any>>();

    return (opts) => {
        const { op, next } = opts;

        if (op.type !== 'query') {
            return next(op);
        }

        const key = JSON.stringify({ path: op.path, input: op.input });

        const active = inflight.get(key);
        if (active) {
            return active;
        }

        const result = next(op);

        // We only deduplicate Promises (queries/mutations)
        if (result instanceof Promise) {
            inflight.set(key, result);
            return result.finally(() => {
                inflight.delete(key);
            });
        }

        return result;
    };
}
