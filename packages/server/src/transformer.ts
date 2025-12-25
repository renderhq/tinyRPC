export interface DataTransformer {
    serialize(obj: any): any;
    deserialize(obj: any): any;
}

/**
 * @internal
 * The default transformer is a passthrough.
 */
export const defaultTransformer: DataTransformer = {
    serialize: (obj) => obj,
    deserialize: (obj) => obj,
};

/**
 * @internal
 * Check if the provided object is a valid transformer.
 */
export function isTransformer(obj: any): obj is DataTransformer {
    return (
        obj &&
        typeof obj.serialize === 'function' &&
        typeof obj.deserialize === 'function'
    );
}
