## Missing CORS support in HTTP handler

### Description

The `createHTTPHandler` function in `packages/server/src/dispatch.ts` does not include CORS headers, which will cause issues when the client is running on a different origin (e.g., frontend on `localhost:5173` calling API on `localhost:3000`).

### Current behavior

```typescript
export function createHTTPHandler(opts: {
    router: Router<any>;
    createContext: (req: any, res: any) => Promise<any> | any;
}) {
    return async (req: any, res: any) => {
        // No CORS headers set
        const { router, createContext } = opts;
        // ...
    };
}
```

### Expected behavior

The handler should support CORS configuration to allow cross-origin requests:

```typescript
export function createHTTPHandler(opts: {
    router: Router<any>;
    createContext: (req: any, res: any) => Promise<any> | any;
    cors?: {
        origin?: string | string[];
        credentials?: boolean;
    };
}) {
    return async (req: any, res: any) => {
        // Set CORS headers
        if (opts.cors) {
            res.setHeader('Access-Control-Allow-Origin', opts.cors.origin || '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            if (opts.cors.credentials) {
                res.setHeader('Access-Control-Allow-Credentials', 'true');
            }
        }
        
        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.statusCode = 204;
            res.end();
            return;
        }
        
        // ... rest of handler
    };
}
```

### Impact

- Cannot use the library in typical web applications where frontend and backend are on different ports
- Blocks browser-based clients from making requests
- Affects production deployments with separate frontend/backend domains

### Suggested fix

Add optional CORS configuration to `createHTTPHandler` with sensible defaults for development while allowing strict configuration for production.
