import type { TRPCLink } from '../links';

/**
 * Options for the timeout link.
 * @public
 */
export interface TimeoutLinkOptions {
    /**
     * Timeout in milliseconds.
     * @default 5000 (5 seconds)
     */
    timeout: number;
}

/**
 * Automatically aborts requests that take longer than the specified timeout.
 * Useful for preventing "hanging" requests from consuming resources indefinitely.
 * @public
 */
export function timeoutLink(opts: TimeoutLinkOptions): TRPCLink {
    const timeoutMs = opts.timeout;

    return (linkOpts) => {
        const { op, next } = linkOpts;

        // We only apply timeouts to query and mutation operations.
        // Subscriptions are long-lived and intentional, so they are excluded.
        if (op.type === 'subscription') {
            return next(op);
        }

        return new Promise((resolve, reject) => {
            const controller = new AbortController();
            const signal = controller.signal;

            // Merge signals if one already exists
            if (op.signal) {
                op.signal.addEventListener('abort', () => controller.abort());
            }

            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error(`Operation timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            const opWithSignal = { ...op, signal };

            next(opWithSignal)
                .then((res: any) => {
                    clearTimeout(timeoutId);
                    resolve(res);
                })
                .catch((err: any) => {
                    clearTimeout(timeoutId);
                    reject(err);
                });
        });
    };
}
