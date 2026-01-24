# tinyRPC

A minimalist,  RPC framework for TypeScript. Enables zero-overhead, end-to-end type safety between server and client by leveraging recursive type inference. This repository contains the complete framework source, multiple deployment adapters, and a comprehensive test suite.

## core packages

- **@tinyrpc/server**: Core orchestration, procedure building, and runtime dispatch.
- **@tinyrpc/client**: Proxy-based client with functional link-chain architecture.
- **@tinyrpc/react**: Ergonomic React hooks built on TanStack Query.

## server api reference

### constructor
- `initTRPC.create<TConfig>()`: Initializes the framework. Accepts configuration for `ctx`, `meta`, and `transformer`.

### procedure building
- `.input(schema)`: Attaches a Zod or custom parser for incoming data.
- `.output(schema)`: Validates outgoing data before sending to the client.
- `.use(middleware)`: Chains recursive logic before the resolver.
- `.query(resolver)`: Definition for idempotent data fetching.
- `.mutation(resolver)`: Definition for state-changing operations.
- `.subscription(resolver)`: Definition for event-based streaming.

### orchestration
- `t.router({ ... })`: Groups procedures into a logical tree.
- `t.mergeRouters(r1, r2)`: Merges nested router definitions.
- `t.middleware(fn)`: Defines reusable context/logic wrappers.

## client api reference

### initialization
- `createTRPCProxyClient<Router>(opts)`: Creates the typed proxy.
- `opts.links`: An array of functional middleware (links).
- `opts.transformer`: Optional data serializer (e.g., handles Dates, BigInts).

### functional links
- `httpLink`: Unbatched Fetch-based transport.
- `httpBatchLink`: Merges concurrent requests to minimize network roundtrips.
- `wsLink`: Stateful WebSocket transport for real-time `subscription` operations.
- `splitLink`: Conditional routing based on operation type or path.
- `retryLink`: Resilient execution with jittered exponential backoff.
- `cacheLink`: Client-side caching with Stale-While-Revalidate (SWR).
- `dedupeLink`: Logic to prevent redundant inflight requests.
- `loggerLink`: Integrated observability for requests and responses.

## react api reference

- `trpc.useQuery([input], [opts])`: Standard data fetching hook.
- `trpc.useMutation([opts])`: State mutation hook.
- `trpc.useSubscription(onData, [opts])`: Real-time streaming hook.
- `trpc.useUtils()`: Context utility for cache invalidation and manual state updates.

## available adapters

- **Node.js**: `createHTTPHandler` (compatible with `http` and `Express`).
- **Web/Edge**: `fetchRequestHandler` (compatible with Cloudflare Workers and Vercel Edge).
- **WebSockets**: `applyWSHandler` (Node.js `ws` integration).

## built-in examples

1. **basic-http** (`examples/basic-http`): Simple Node.js server using Fetch. 
2. **full-stack-ws** (`examples/full-stack-ws`): Bidirectional real-time communication.
3. **analytics-dashboard** (`examples/analytics-dashboard`): High-load dashboard using Batching and SWR caching.
4. **nextjs-app** (`examples/nextjs-app`): Integration with App Router and Turbopack.
5. **edge-runtime** (`examples/edge-runtime`): Minimalist Cloudflare Worker deployment.
6. **validation-test** (`example/src/validation-test.ts`): Technical demo of deep schema enforcement.

## repository inventory

### core source
- `packages/server/src`: Dispatcher, Router, Middleware, and Adapters.
- `packages/client/src`: Proxy, Links, Observables, and Error handling.
- `packages/react/src`: Query wrapper, context hooks.

### documentation & config
- `README.md`: Technical specification and API overview.
- `TEST_REPORT.md`: Consolidated test metrics.
- `tsconfig.json`: Monorepo-wide TypeScript configuration.
- `package.json`: Dependency management and scripts.

### test artifacts
- `tests/run-all-tests.ts`: Central test orchestrator.
- `tests/core-functionality.ts`: Foundation tests.
- `tests/links-tests.ts`: Link-chain logic verification.
- `tests/react-hooks.ts`: Frontend hook integrity checks.
- `tests/comprehensive-benchmark.ts`: Throughput and overhead measurements.

## verification commands

### full sanity check
```bash
npm run test:all
```

### runtime benchmarks
```bash
npm run test:benchmark
```
