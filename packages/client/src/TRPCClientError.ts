/**
 * Represents an error that occurred on the tinyRPC client.
 * Wraps server-side errors into a standard format.
 * @public
 */
export class TRPCClientError extends Error {
    public readonly code: string;
    public readonly data: any;

    constructor(message: string, opts?: { code: string; data?: any; cause?: Error }) {
        super(message);
        this.name = 'TRPCClientError';
        this.code = opts?.code ?? 'UNKNOWN';
        this.data = opts?.data;
        if (opts?.cause) {
            this.cause = opts.cause;
        }

        // Fix for older environments
        Object.setPrototypeOf(this, TRPCClientError.prototype);
    }

    /**
   * Static helper to create a TRPCClientError from a server response envelope.
   */
    public static from(res: any): TRPCClientError {
        const error = res.error;
        if (typeof error === 'string') {
            return new TRPCClientError(error, { code: 'UNKNOWN' });
        }
        return new TRPCClientError(error.message || 'Unknown error', {
            code: error.data?.code ?? error.code ?? 'UNKNOWN',
            data: error.data,
        });
    }
}
