import { TRPCError } from './errors';
import type { Procedure, MiddlewareResult, ProcedureType } from './types';

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
  const { middlewares, resolver, inputParser, outputParser, meta } = procedure._def;

  const steps: { name: string; durationMs: number }[] = [];
  const totalStart = performance.now();

  // 1. Input Validation (tRPC internal style)
  let validatedInput = rawInput;
  if (inputParser && typeof inputParser.parseAsync === 'function') {
    const start = performance.now();
    try {
      validatedInput = await inputParser.parseAsync(rawInput);
      steps.push({ name: 'input-validation', durationMs: performance.now() - start });
    } catch (cause: any) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: cause?.issues
          ? cause.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
          : 'Input validation failed',
        cause,
      });
    }
  } else if (inputParser && typeof inputParser.parse === 'function') {
    const start = performance.now();
    try {
      validatedInput = inputParser.parse(rawInput);
      steps.push({ name: 'input-validation', durationMs: performance.now() - start });
    } catch (cause: any) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: cause?.issues
          ? cause.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
          : 'Input validation failed',
        cause,
      });
    }
  }

  /**
   * Recursive runner for the middleware chain.
   * Matches the v10 internal execution loop.
   */
  const runner = async (index: number, currentCtx: any): Promise<MiddlewareResult<any>> => {
    // End of chain reached, execute the actual resolver
    if (index === middlewares.length) {
      const start = performance.now();
      try {
        let data = await resolver({ ctx: currentCtx, input: validatedInput });

        // 2. Output Validation
        if (outputParser && typeof outputParser.parseAsync === 'function') {
          const outputStart = performance.now();
          try {
            data = await outputParser.parseAsync(data);
            steps.push({ name: 'output-validation', durationMs: performance.now() - outputStart });
          } catch (cause: any) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: cause?.issues
                ? cause.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
                : 'Output validation failed',
              cause,
            });
          }
        } else if (outputParser && typeof outputParser.parse === 'function') {
          const outputStart = performance.now();
          try {
            data = outputParser.parse(data);
            steps.push({ name: 'output-validation', durationMs: performance.now() - outputStart });
          } catch (cause: any) {
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: cause?.issues
                ? cause.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`).join(', ')
                : 'Output validation failed',
              cause,
            });
          }
        }

        steps.push({ name: 'resolver', durationMs: performance.now() - start });
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
    const mwStart = performance.now();

    /**
     * Provide the 'next' function to the middleware.
     * Allows context transformation and continuation.
     */
    const next = async (nextOpts?: { ctx?: any }) => {
      const nextCtx =
        nextOpts && 'ctx' in nextOpts ? { ...currentCtx, ...nextOpts.ctx } : currentCtx;
      return runner(index + 1, nextCtx);
    };

    try {
      const result = await mw({
        ctx: currentCtx,
        input: validatedInput,
        meta,
        path,
        type,
        rawInput,
        next: next as any,
      });
      steps.push({ name: `middleware-${index}`, durationMs: performance.now() - mwStart });
      return result;
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

  const metrics = {
    durationMs: performance.now() - totalStart,
    steps,
  };

  // tRPC internal result handling
  if (!result.ok) {
    const error = result.error!;
    (error as any)._metrics = metrics;
    throw error;
  }

  // Attach metrics secretly to the returned data if it's an object,
  // though it's better to return it as part of the structure in dispatch.ts
  (result as any)._metrics = metrics;

  return result;
}
