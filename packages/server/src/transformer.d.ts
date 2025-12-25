export interface DataTransformer {
    serialize(obj: any): any;
    deserialize(obj: any): any;
}
/**
 * @internal
 * The default transformer is a passthrough.
 */
export declare const defaultTransformer: DataTransformer;
/**
 * @internal
 * Check if the provided object is a valid transformer.
 */
export declare function isTransformer(obj: any): obj is DataTransformer;
//# sourceMappingURL=transformer.d.ts.map