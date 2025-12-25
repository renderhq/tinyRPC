/**
 * @internal
 * The default transformer is a passthrough.
 */
export const defaultTransformer = {
    serialize: (obj) => obj,
    deserialize: (obj) => obj,
};
/**
 * @internal
 * Check if the provided object is a valid transformer.
 */
export function isTransformer(obj) {
    return (obj &&
        typeof obj.serialize === 'function' &&
        typeof obj.deserialize === 'function');
}
//# sourceMappingURL=transformer.js.map