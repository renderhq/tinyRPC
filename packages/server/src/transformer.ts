/**
 * @internal
 */
export interface DataTransformer {
  serialize(obj: any): any;
  deserialize(obj: any): any;
}

/**
 * @internal
 */
export interface CombinedDataTransformer {
  input: DataTransformer;
  output: DataTransformer;
}

/**
 * @internal
 */
export type DataTransformerOptions = DataTransformer | CombinedDataTransformer;

/**
 * Default transformer that does nothing.
 */
export const defaultTransformer: DataTransformer = {
  serialize: (obj) => obj,
  deserialize: (obj) => obj,
};

/**
 * @internal
 */
export function getTransformer(transformer?: DataTransformerOptions): CombinedDataTransformer {
  if (!transformer) {
    return {
      input: defaultTransformer,
      output: defaultTransformer,
    };
  }
  if ('input' in transformer && 'output' in transformer) {
    return transformer;
  }
  return {
    input: transformer,
    output: transformer,
  };
}
