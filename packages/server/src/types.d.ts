import { ZodType } from 'zod';
import { TRPCError } from './errors.js';
export type MaybePromise<T> = T | Promise<T>;
/**
 * @internal
 */
export interface AnyRootConfig {
    ctx: any;
    meta: any;
    errorShape?: any;
    transformer?: any;
}
/**
 * @internal
 */
export interface ProcedureParams<TConfig extends AnyRootConfig = AnyRootConfig, TContext = any, TInputIn = any, TInputOut = any, TOutputIn = any, TOutputOut = any, TMeta = any> {
    _config: TConfig;
    _ctx_out: TContext;
    _input_in: TInputIn;
    _input_out: TInputOut;
    _output_in: TOutputIn;
    _output_out: TOutputOut;
    _meta: TMeta;
}
export type ProcedureType = 'query' | 'mutation' | 'subscription';
/**
 * @internal
 */
export interface MiddlewareOptions<TParams extends ProcedureParams> {
    ctx: TParams['_ctx_out'];
    input: TParams['_input_out'];
    meta: TParams['_meta'] | undefined;
    path: string;
    type: ProcedureType;
    rawInput: unknown;
    next: {
        (): Promise<MiddlewareResult<TParams>>;
        <TNextContext>(opts: {
            ctx: TNextContext;
        }): Promise<MiddlewareResult<{
            _config: TParams['_config'];
            _ctx_out: TNextContext;
            _input_in: TParams['_input_in'];
            _input_out: TParams['_input_out'];
            _output_in: TParams['_output_in'];
            _output_out: TParams['_output_out'];
            _meta: TParams['_meta'];
        }>>;
    };
}
/**
 * @internal
 */
export interface MiddlewareResult<TParams extends ProcedureParams> {
    readonly ok: boolean;
    readonly data?: unknown;
    readonly ctx?: TParams['_ctx_out'];
    readonly error?: TRPCError;
}
/**
 * @internal
 */
export type MiddlewareFunction<TParams extends ProcedureParams, TNewParams extends ProcedureParams> = (opts: MiddlewareOptions<TParams>) => Promise<MiddlewareResult<TNewParams>>;
import { Observable } from './observable.js';
/**
 * @internal
 */
export interface Procedure<TParams extends ProcedureParams> {
    _def: {
        procedure: true;
        type: ProcedureType;
        resolver: (opts: {
            ctx: TParams['_ctx_out'];
            input: TParams['_input_out'];
        }) => Promise<TParams['_output_out']> | Observable<TParams['_output_out']>;
        inputParser?: ZodType<any>;
        outputParser?: ZodType<any>;
        middlewares: MiddlewareFunction<any, any>[];
        meta?: TParams['_meta'];
    };
}
/**
 * @internal
 */
export interface RouterDef<TConfig extends AnyRootConfig> {
    config: TConfig;
    procedures: Record<string, Procedure<any> | Router<any>>;
}
/**
 * @internal
 */
export interface Router<TConfig extends AnyRootConfig = AnyRootConfig> {
    _def: RouterDef<TConfig>;
    [key: string]: any;
}
export type AnyProcedure = Procedure<any>;
export type AnyRouter = Router<any>;
/**
 * @internal
 */
export type TRPCResponse<T = any> = {
    result: {
        data: T;
    };
} | {
    error: {
        message: string;
        code: number;
        data?: {
            code: string;
            httpStatus: number;
            stack?: string | undefined;
            path?: string | undefined;
        };
    };
};
export type inferRouterContext<TRouter extends AnyRouter> = TRouter['_def']['config']['ctx'];
export type inferRouterMeta<TRouter extends AnyRouter> = TRouter['_def']['config']['meta'];
//# sourceMappingURL=types.d.ts.map