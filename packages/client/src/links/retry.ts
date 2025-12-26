import type { TRPCLink, Operation } from '../links.js';

export interface RetryLinkOptions {
    attempts?: number;
    delay?: number; // Initial delay in ms
}

/**
 * Automatically retries idempotent 'query' requests with exponential backoff and jitter.
 */
export function retryLink(opts: RetryLinkOptions = {}): TRPCLink {
    const maxAttempts = opts.attempts ?? 3;
    const initialDelay = opts.delay ?? 1000;

    return (linkOpts) => {
        const { op, next } = linkOpts;

        // Only retry queries (idempotent operations)
        if (op.type !== 'query') {
            return next(op);
        }

        async function attempt(retryCount: number): Promise<any> {
            try {
                return await next(op);
            } catch (err) {
                if (retryCount >= maxAttempts) {
                    throw err;
                }

                // Exponential backoff: 2^n * initialDelay
                const backoff = Math.pow(2, retryCount) * initialDelay;
                // Add jitter: ±20%
                const jitter = backoff * 0.2 * (Math.random() * 2 - 1);
                const delay = backoff + jitter;

                await new Promise((resolve) => setTimeout(resolve, delay));
                return attempt(retryCount + 1);
            }
        }

        return attempt(0);
    };
}
