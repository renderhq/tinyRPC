import type { TRPCLink } from '../links.js';

/**
 * A link that logs the execution trace of each operation to the browser console.
 * Helps developers visualize performance bottlenecks in real-time.
 */
export function loggerLink(): TRPCLink {
    return (opts) => {
        const { op, next } = opts;

        const result = next(op);

        if (result instanceof Promise) {
            return result.then((res: any) => {
                if (res.trace) {
                    const { durationMs, steps, path } = res.trace;

                    console.groupCollapsed(
                        `%c tinyRPC Trace: ${op.path} %c (${durationMs.toFixed(2)}ms)`,
                        'color: #00ff00; font-weight: bold;',
                        'color: #888; font-weight: normal;'
                    );

                    if (steps && steps.length > 0) {
                        console.table(steps.map((s: any) => ({
                            Step: s.name,
                            'Duration (ms)': s.durationMs.toFixed(2),
                        })));
                    }

                    console.log('Total Duration:', durationMs.toFixed(2), 'ms');
                    console.groupEnd();
                }
                return res;
            });
        }

        return result;
    };
}
