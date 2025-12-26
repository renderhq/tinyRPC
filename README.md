# tinyRPC

Minimal, end-to-end type-safe RPC framework. Inspired by tRPC v10. Built for speed, developer experience, and production-grade applications.

[GitHub](https://github.com/renderhq/tinyRPC) • [Organization](https://github.com/renderhq) • [Twitter](https://x.com/infinterenders)

## Quick Start

```bash
# Clone and setup
git clone https://github.com/renderhq/tinyRPC.git
cd tinyRPC
pnpm install

# Build and run
pnpm build
pnpm dev:server # Terminal 1
pnpm dev:client # Terminal 2
```

## Core Principles

- **Type Safety**: Automatic type inference from server to client without code generation.
- **Protocol Agnostic**: Works over HTTP/S, WebSockets, or entirely in-process (Server Callers).
- **Edge Ready**: Built-in support for Web Standard Request/Response (Fetch API).
- **Composable**: Powerful middleware system with context transformation and metadata.
- **Reactive**: Native support for Observables and real-time subscriptions.

## Architecture

This is a **pnpm monorepo** designed for modularity:

- **`@tinyrpc/server`**: Procedure builders, router logic, and adapters (Node/Fetch/WS).
- **`@tinyrpc/client`**: Generic proxy client, link system, and observable utilities.
- **`example`**: A reference implementation featuring infinite loading, file uploads, and rate limiting.

## Features and Examples

### Internal Server Caller
Execute procedures server-side (e.g., in background tasks) with full type safety and zero network overhead.

```typescript
const createCaller = createCallerFactory(appRouter);
const caller = createCaller({ user: systemUser, db });

const message = await caller.chat.sendMessage.mutate({ 
  text: 'System update available.' 
});
```

### Data Transformers
Transparently support complex types like `Date`, `Map`, `Set`, or `BigInt` across the network.

```typescript
// Server & Client
const t = initTRPC.create({ 
  transformer: {
    serialize: (v) => superjson.serialize(v),
    deserialize: (v) => superjson.deserialize(v),
  }
});
```

### Edge Support
Deploy anywhere using the universal `fetchRequestHandler`.

```typescript
export default {
  async fetch(request) {
    return fetchRequestHandler({
      router: appRouter,
      req: request,
      endpoint: '/trpc',
    });
  }
}
```

## Roadmap

We are approaching **v1.0**. Our focus is on:
- **Batching Optimization**: Smart request windowing.
- **Standardization**: Stable API for custom links and adapters.
- **Observability**: Built-in OpenTelemetry support.

See [V3 Production Ready](.github/ISSUE_V3_PRODUCTION_READY.md) for future architectural plans.
