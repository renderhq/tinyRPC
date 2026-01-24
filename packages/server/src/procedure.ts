import { ZodType } from 'zod';
import type {
  AnyRootConfig,
  ProcedureParams,
  Procedure,
  ProcedureType,
  MiddlewareFunction,
} from './types';

import { Observable } from './observable';

/**
 * Internal state of a procedure builder.
 * @internal
 */
export interface ProcedureBuilderDef<TParams extends ProcedureParams> {
  middlewares: MiddlewareFunction<any, any>[];
  inputParser?: ZodType<any>;
  outputParser?: ZodType<any>;
  meta?: TParams['_meta'];
}

/**
 * API for building a procedure with input validation, middleware, and resolvers.
 * @public
 */
export interface ProcedureBuilder<TParams extends ProcedureParams> {
  /**
   * Add an input parser to the procedure.
   */
  input<TNextInput>(schema: ZodType<TNextInput>): ProcedureBuilder<{
    _config: TParams['_config'];
    _ctx_out: TParams['_ctx_out'];
    _input_in: TNextInput;
    _input_out: TNextInput;
    _output_in: TParams['_output_in'];
    _output_out: TParams['_output_out'];
    _meta: TParams['_meta'];
  }>;

  /**
   * Add an output parser to the procedure.
   */
  output<TNextOutput>(schema: ZodType<TNextOutput>): ProcedureBuilder<{
    _config: TParams['_config'];
    _ctx_out: TParams['_ctx_out'];
    _input_in: TParams['_input_in'];
    _input_out: TParams['_input_out'];
    _output_in: TNextOutput;
    _output_out: TNextOutput;
    _meta: TParams['_meta'];
  }>;

  /**
   * Add a middleware to the procedure chain.
   */
  use<TNextContext>(
    fn: MiddlewareFunction<
      TParams,
      {
        _config: TParams['_config'];
        _ctx_out: TNextContext;
        _input_in: TParams['_input_in'];
        _input_out: TParams['_input_out'];
        _output_in: TParams['_output_in'];
        _output_out: TParams['_output_out'];
        _meta: TParams['_meta'];
      }
    >
  ): ProcedureBuilder<{
    _config: TParams['_config'];
    _ctx_out: TNextContext;
    _input_in: TParams['_input_in'];
    _input_out: TParams['_input_out'];
    _output_in: TParams['_output_in'];
    _output_out: TParams['_output_out'];
    _meta: TParams['_meta'];
  }>;

  /**
   * Attach metadata to the procedure.
   */
  meta(meta: TParams['_meta']): ProcedureBuilder<TParams>;

  /**
   * Define a query procedure (idempotent, read-only).
   */
  query<TOutput>(
    resolver: (opts: {
      ctx: TParams['_ctx_out'];
      input: TParams['_input_out'];
    }) => TOutput | Promise<TOutput>
  ): Procedure<{
    _config: TParams['_config'];
    _ctx_out: TParams['_ctx_out'];
    _input_in: TParams['_input_in'];
    _input_out: TParams['_input_out'];
    _output_in: TOutput;
    _output_out: TOutput;
    _meta: TParams['_meta'];
  }>;

  /**
   * Define a mutation procedure (side-effecting, write).
   */
  mutation<TOutput>(
    resolver: (opts: {
      ctx: TParams['_ctx_out'];
      input: TParams['_input_out'];
    }) => TOutput | Promise<TOutput>
  ): Procedure<{
    _config: TParams['_config'];
    _ctx_out: TParams['_ctx_out'];
    _input_in: TParams['_input_in'];
    _input_out: TParams['_input_out'];
    _output_in: TOutput;
    _output_out: TOutput;
    _meta: TParams['_meta'];
  }>;

  /**
   * Define a subscription procedure (real-time).
   */
  subscription<TOutput>(
    resolver: (opts: {
      ctx: TParams['_ctx_out'];
      input: TParams['_input_out'];
    }) => Observable<TOutput>
  ): Procedure<{
    _config: TParams['_config'];
    _ctx_out: TParams['_ctx_out'];
    _input_in: TParams['_input_in'];
    _input_out: TParams['_input_out'];
    _output_in: TOutput;
    _output_out: TOutput;
    _meta: TParams['_meta'];
  }>;

  /** @internal */
  _def: ProcedureBuilderDef<TParams>;
}

/**
 * Creates a new procedure builder.
 * @internal
 */
export function createProcedureBuilder<TConfig extends AnyRootConfig>(): ProcedureBuilder<{
  _config: TConfig;
  _ctx_out: TConfig['ctx'];
  _input_in: any;
  _input_out: any;
  _output_in: any;
  _output_out: any;
  _meta: TConfig['meta'];
}> {
  return createNewBuilder({
    middlewares: [],
  });
}

function createNewBuilder(def: any): ProcedureBuilder<any> {
  return {
    _def: def,
    input(schema: any) {
      return createNewBuilder({
        ...def,
        inputParser: schema,
      });
    },
    output(schema: any) {
      return createNewBuilder({
        ...def,
        outputParser: schema,
      });
    },
    use(fn: any) {
      return createNewBuilder({
        ...def,
        middlewares: [...def.middlewares, fn],
      });
    },
    meta(meta: any) {
      return createNewBuilder({
        ...def,
        meta,
      });
    },
    query(resolver: any) {
      return createProcedure(def, 'query', resolver);
    },
    mutation(resolver: any) {
      return createProcedure(def, 'mutation', resolver);
    },
    subscription(resolver: any) {
      return createProcedure(def, 'subscription', resolver);
    },
  } as any;
}

function createProcedure<TParams extends ProcedureParams>(
  def: ProcedureBuilderDef<TParams>,
  type: ProcedureType,
  resolver: (opts: any) => any
): Procedure<TParams> {
  return {
    _def: {
      ...(def as any),
      procedure: true,
      type,
      resolver: (opts: any) => {
        if (type === 'subscription') {
          return resolver(opts);
        }
        return Promise.resolve(resolver(opts));
      },
    },
  };
}
