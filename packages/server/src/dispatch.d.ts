import type { Router, TRPCResponse } from './types.js';
/**
 * @internal
 */
export declare function resolveHTTPResponse(opts: {
    router: Router<any>;
    path: string;
    ctx: any;
    input: any;
    isBatch: boolean;
}): Promise<{
    body: TRPCResponse | TRPCResponse[];
    status: number;
}>;
/**
 * @public
 */
export interface CORSOptions {
    origin?: string | string[] | ((origin: string) => boolean);
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAge?: number;
}
/**
 * @internal
 */
export declare function createHTTPHandler(opts: {
    router: Router<any>;
    createContext: (req: any, res: any) => Promise<any> | any;
    cors?: CORSOptions | boolean;
}): (req: any, res: any) => Promise<void>;
//# sourceMappingURL=dispatch.d.ts.map