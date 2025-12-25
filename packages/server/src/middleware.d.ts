import type { Procedure, ProcedureType } from './types.js';
/**
 * @internal
 * The core execution engine for a tRPC procedure.
 * Processes input validation, runs the middleware chain, and finally the resolver.
 */
export declare function callProcedure(opts: {
    procedure: Procedure<any>;
    ctx: any;
    input: any;
    path: string;
    type: ProcedureType;
}): Promise<any>;
//# sourceMappingURL=middleware.d.ts.map