import type { TRPCLink } from '../links';

/**
 * Options for the retry link.
 * @public
 */
export interface RetryLinkOptions {
  /**
   * Maximum number of retry attempts.
   * @default 3
   */
  attempts?: number;
  /**
   * Initial delay in milliseconds before the first retry.
   * @default 1000
   */
  delay?: number;
}

/**
 * Automatically retries idempotent query requests using exponential backoff with jitter.
 * Prevents "thundering herd" issues by introducing randomness into the retry timing.
 * @public
 */
export function retryLink(opts: RetryLinkOptions = {}): TRPCLink {
  const maxAttempts = opts.attempts ?? 3;
  const initialDelay = opts.delay ?? 1000;

  return (linkOpts) => {
    const { op, next } = linkOpts;

    // Retries are only applied to idempotent query operations
    if (op.type !== 'query') {
      return next(op);
    }

    async function attempt(retryCount: number): Promise<any> {
      try {
        const res = await next(op);

        // If the server returned an error envelope, we should also retry
        if (res.result && res.result.error) {
          if (retryCount >= maxAttempts) {
            return res;
          }
          await new Promise((resolve) => setTimeout(resolve, calculateDelay(retryCount)));
          return attempt(retryCount + 1);
        }

        return res;
      } catch (err) {
        if (retryCount >= maxAttempts) {
          throw err;
        }

        await new Promise((resolve) => setTimeout(resolve, calculateDelay(retryCount)));
        return attempt(retryCount + 1);
      }
    }

    function calculateDelay(retryCount: number): number {
      // Exponential backoff with jitter calculation
      const backoff = Math.pow(2, retryCount) * initialDelay;
      const jitter = backoff * 0.2 * (Math.random() * 2 - 1);
      return backoff + jitter;
    }

    return attempt(0);
  };
}
