import { ZodType } from 'zod';
import type { AnyRootConfig, ProcedureParams, Procedure, MiddlewareFunction } from './types.js';
import { Observable } from './observable.js';
/**
 * @internal
 */
export interface ProcedureBuilderDef<TParams extends ProcedureParams> {
    middlewares: MiddlewareFunction<any, any>[];
    inputParser?: ZodType<any>;
    outputParser?: ZodType<any>;
    meta?: TParams['_meta'];
}
/**
 * @internal
 */
export interface ProcedureBuilder<TParams extends ProcedureParams> {
    input<TNextInput>(schema: ZodType<TNextInput>): ProcedureBuilder<{
        _config: TParams['_config'];
        _ctx_out: TParams['_ctx_out'];
        _input_in: TNextInput;
        _input_out: TNextInput;
        _output_in: TParams['_output_in'];
        _output_out: TParams['_output_out'];
        _meta: TParams['_meta'];
    }>;
    output<TNextOutput>(schema: ZodType<TNextOutput>): ProcedureBuilder<{
        _config: TParams['_config'];
        _ctx_out: TParams['_ctx_out'];
        _input_in: TParams['_input_in'];
        _input_out: TParams['_input_out'];
        _output_in: TNextOutput;
        _output_out: TNextOutput;
        _meta: TParams['_meta'];
    }>;
    use<TNextContext>(fn: MiddlewareFunction<TParams, {
        _config: TParams['_config'];
        _ctx_out: TNextContext;
        _input_in: TParams['_input_in'];
        _input_out: TParams['_input_out'];
        _output_in: TParams['_output_in'];
        _output_out: TParams['_output_out'];
        _meta: TParams['_meta'];
    }>): ProcedureBuilder<{
        _config: TParams['_config'];
        _ctx_out: TNextContext;
        _input_in: TParams['_input_in'];
        _input_out: TParams['_input_out'];
        _output_in: TParams['_output_in'];
        _output_out: TParams['_output_out'];
        _meta: TParams['_meta'];
    }>;
    meta(meta: TParams['_meta']): ProcedureBuilder<TParams>;
    query<TOutput>(resolver: (opts: {
        ctx: TParams['_ctx_out'];
        input: TParams['_input_out'];
    }) => TOutput | Promise<TOutput>): Procedure<{
        _config: TParams['_config'];
        _ctx_out: TParams['_ctx_out'];
        _input_in: TParams['_input_in'];
        _input_out: TParams['_input_out'];
        _output_in: TOutput;
        _output_out: TOutput;
        _meta: TParams['_meta'];
    }>;
    mutation<TOutput>(resolver: (opts: {
        ctx: TParams['_ctx_out'];
        input: TParams['_input_out'];
    }) => TOutput | Promise<TOutput>): Procedure<{
        _config: TParams['_config'];
        _ctx_out: TParams['_ctx_out'];
        _input_in: TParams['_input_in'];
        _input_out: TParams['_input_out'];
        _output_in: TOutput;
        _output_out: TOutput;
        _meta: TParams['_meta'];
    }>;
    subscription<TOutput>(resolver: (opts: {
        ctx: TParams['_ctx_out'];
        input: TParams['_input_out'];
    }) => Observable<TOutput>): Procedure<{
        _config: TParams['_config'];
        _ctx_out: TParams['_ctx_out'];
        _input_in: TParams['_input_in'];
        _input_out: TParams['_input_out'];
        _output_in: TOutput;
        _output_out: TOutput;
        _meta: TParams['_meta'];
    }>;
    _def: ProcedureBuilderDef<TParams>;
}
/**
 * @internal
 */
export declare function createProcedureBuilder<TConfig extends AnyRootConfig>(): ProcedureBuilder<{
    _config: TConfig;
    _ctx_out: TConfig['ctx'];
    _input_in: any;
    _input_out: any;
    _output_in: any;
    _output_out: any;
    _meta: TConfig['meta'];
}>;
//# sourceMappingURL=procedure.d.ts.map