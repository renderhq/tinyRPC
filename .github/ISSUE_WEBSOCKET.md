## Missing WebSocket/Subscription Support

### Description

The current implementation lacks WebSocket support for real-time subscriptions, which is a core feature of tRPC v10. The `subscription` procedure type is defined but not implemented, making it impossible to use server-sent events or WebSocket connections for real-time data streaming.

### Current State

The codebase has placeholder subscription support:

```typescript
// In procedure.ts - subscription method exists but no transport
subscription<TOutput>(
    resolver: (opts: {
        ctx: TParams['_ctx_out'];
        input: TParams['_input_out'];
    }) => TOutput | Promise<TOutput>
): Procedure<...>
```

However:
- No WebSocket server implementation
- No subscription handler in `dispatch.ts`
- No client-side subscription link
- No observable/async iterator support
- No connection lifecycle management

### Expected Implementation

**Server-side changes needed:**

1. **Add WebSocket adapter** (`packages/server/src/adapters/ws.ts`):
```typescript
export function createWSHandler(opts: {
    router: Router<any>;
    createContext: (opts: { req: any }) => Promise<any>;
}) {
    return (ws: WebSocket, req: IncomingMessage) => {
        // Handle connection lifecycle
        // Parse subscription requests
        // Stream data back to client
        // Handle unsubscribe
    };
}
```

2. **Update dispatch** to handle subscription execution:
```typescript
async function executeSubscription(opts: {
    procedure: Procedure<any>;
    ctx: any;
    input: any;
}) {
    // Return AsyncIterator or Observable
    // Support cleanup on unsubscribe
}
```

3. **Add observable utilities** (`packages/server/src/observable.ts`):
```typescript
export function observable<T>(
    subscribe: (observer: Observer<T>) => Unsubscribable
): Observable<T>
```

**Client-side changes needed:**

1. **Add WebSocket link** (`packages/client/src/links/ws.ts`):
```typescript
export function wsLink(opts: { url: string }): TRPCLink {
    // Establish WebSocket connection
    // Handle subscription lifecycle
    // Reconnection logic
}
```

2. **Update proxy** to handle subscriptions:
```typescript
subscribe: (input) => {
    return observable((observer) => {
        // Send subscription request
        // Listen for data
        // Handle errors
        // Cleanup on unsubscribe
    });
}
```

3. **Add subscription types** (`packages/client/src/types.ts`):
```typescript
export interface Observable<T> {
    subscribe(observer: Observer<T>): Unsubscribable;
}
```

### Impact

**High Priority** - This blocks:
- Real-time features (live updates, notifications, chat)
- Server-sent events
- Streaming data (logs, metrics, progress)
- Any use case requiring push-based updates

### Affected Files

Server:
- `packages/server/src/adapters/ws.ts` (new)
- `packages/server/src/observable.ts` (new)
- `packages/server/src/dispatch.ts` (modify)
- `packages/server/src/procedure.ts` (modify resolver signature)
- `packages/server/src/types.ts` (add Observable types)

Client:
- `packages/client/src/links/ws.ts` (new)
- `packages/client/src/observable.ts` (new)
- `packages/client/src/proxy.ts` (add subscription handling)
- `packages/client/src/types.ts` (add Observable types)

Example:
- `example/src/server.ts` (add WebSocket server)
- `example/src/client.ts` (demonstrate subscriptions)

### Estimated Complexity

- **Files to create**: 4 new files
- **Files to modify**: 6 existing files
- **Lines of code**: ~800-1000 LOC
- **External dependencies**: `ws` package for Node.js WebSocket support

### References

- tRPC v10 subscriptions: https://trpc.io/docs/subscriptions
- WebSocket protocol: https://datatracker.ietf.org/doc/html/rfc6455
- Observable pattern: https://github.com/tc39/proposal-observable
