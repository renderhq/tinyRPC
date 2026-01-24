import type { TRPCLink } from '../links';

/**
 * Deduplicates concurrent identical query requests.
 * Ensures that if multiple identical queries are inflight, only one network request is made.
 * @public
 */
export function dedupeLink(): TRPCLink {
  const inflight = new Map<string, Promise<any>>();

  return (opts) => {
    const { op, next } = opts;

    // Deduplication is only safe for side-effect-free query operations
    if (op.type !== 'query') {
      return next(op);
    }

    const key = JSON.stringify({ path: op.path, input: op.input });

    const active = inflight.get(key);
    if (active) {
      return active;
    }

    const result = next(op);

    if (result instanceof Promise) {
      inflight.set(key, result);
      return result.finally(() => {
        inflight.delete(key);
      });
    }

    return result;
  };
}
