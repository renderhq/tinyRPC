export class TRPCError extends Error {
    code;
    cause;
    constructor(opts) {
        super(opts.message ?? opts.code);
        this.code = opts.code;
        if (opts.cause) {
            this.cause = opts.cause;
        }
        this.name = 'TRPCError';
        Object.setPrototypeOf(this, TRPCError.prototype);
    }
}
//# sourceMappingURL=errors.js.map