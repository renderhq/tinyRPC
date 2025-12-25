import { TRPCError } from './errors.js';
import type { Procedure, MiddlewareResult, ProcedureType } from './types.js';

/**
 * @internal
 * The core execution engine for a tRPC procedure.
 * Processes input validation, runs the middleware chain, and finally the resolver.
 */
export async function callProcedure(opts: {
    procedure: Procedure<any>;
    ctx: any;
    input: any;
    path: string;
    type: ProcedureType;
}): Promise<any> {
    const { procedure, ctx, input: rawInput, path, type } = opts;
    const { middlewares, resolver, inputParser, meta } = procedure._def;

    // 1. Input Validation (tRPC internal style)
    let validatedInput = rawInput;
    if (inputParser && typeof inputParser.parse === 'function') {
        try {
            validatedInput = inputParser.parse(rawInput);
        } catch (cause: any) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Input validation failed',
                cause,
            });
        }
    }

    /**
     * Recursive runner for the middleware chain.
     * Matches the v10 internal execution loop.
     */
    const runner = async (
        index: number,
        currentCtx: any
    ): Promise<MiddlewareResult<any>> => {
        // End of chain reached, execute the actual resolver
        if (index === middlewares.length) {
            try {
                const data = await resolver({ ctx: currentCtx, input: validatedInput });
                return { ok: true, data, ctx: currentCtx };
            } catch (err: any) {
                return {
                    ok: false,
                    error:
                        err instanceof TRPCError
                            ? err
                            : new TRPCError({
                                code: 'INTERNAL_SERVER_ERROR',
                                message: err.message,
                                cause: err,
                            }),
                };
            }
        }

        const mw = middlewares[index]!;

        /**
         * Provide the 'next' function to the middleware.
         * Allows context transformation and continuation.
         */
        const next = async (nextOpts?: { ctx?: any }) => {
            const nextCtx =
                nextOpts && 'ctx' in nextOpts
                    ? { ...currentCtx, ...nextOpts.ctx }
                    : currentCtx;
            return runner(index + 1, nextCtx);
        };

        try {
            return await mw({
                ctx: currentCtx,
                input: validatedInput,
                meta,
                path,
                type,
                rawInput,
                next: next as any,
            });
        } catch (err: any) {
            return {
                ok: false,
                error:
                    err instanceof TRPCError
                        ? err
                        : new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: err.message,
                            cause: err,
                        }),
            };
        }
    };

    // Start the middleware chain
    const result = await runner(0, ctx);

    // tRPC internal result handling
    if (!result.ok) {
        throw result.error;
    }

    return result.data;
}
