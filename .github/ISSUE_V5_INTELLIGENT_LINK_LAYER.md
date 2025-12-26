# Issue: tinyRPC v3.0 - The Intelligent Link Layer

## Overview
To transcend the "minimal clone" status and provide a truly superior Developer Experience (DX), we need to solve the two biggest developer pain points: **caching complexity** and **performance visibility**. This issue tracks the implementation of the "Intelligent Link Layer," which eliminates the forced dependency on heavy libraries like React-Query for basic apps and brings enterprise-grade observability to the browser console.

## 1. Smart Cache Link (Native SWR)
Most developers use React-Query just for basic Stale-While-Revalidate (SWR) behavior. We can implement this directly in the link chain.
- **Goal**: Provide instant UI updates using stale data while fetching fresh data in the background.
- **Requirement**:
  - Implement a `cacheLink` with a configurable `ttl` (Time To Live).
  - Use an in-memory `Map` to cache successful `query` results based on `path` and `input`.
  - On request: If stale data exists, return it immediately AND trigger a background refresh to update the cache.
- **Impact**: Instant perceived performance with zero configuration.

## 2. Live-Trace Observability (Server -> Console)
Debugging slow procedures currently requires digging into the Network tab or server logs. We want to bring this data to the front and center.
- **Goal**: Automatic performance breakdown of every procedure call, displayed in the browser console.
- **Server Implementation**:
  - A built-in `traceMiddleware` that records timestamps for:
    - Middleware execution start/end.
    - Input validation duration.
    - Resolver execution time.
  - Send this timing metadata back in a `x-tinyrpc-trace` header or the response body.
- **Client Implementation**:
  - A `loggerLink` that detects this metadata and prints a clean, color-coded `console.table` showing the breakdown.
- **Impact**: Immediate insight into whether a bottleneck is in the DB, a middleware, or the network.

## 3. Implementation Roadmap

### Phase 1: DX Observability (The "X-Ray")
1. [ ] Create `packages/server/src/middlewares/trace.ts`.
2. [ ] Update `resolveHTTPResponse` to include trace headers.
3. [ ] Create `packages/client/src/links/logger.ts` to parse and display traces.

### Phase 2: Intelligence (The "Instant UI")
1. [ ] Create `packages/client/src/links/cache.ts`.
2. [ ] Implement the SWR logic (Immediate return + background revalidation).
3. [ ] Support cache invalidation hooks.

## Why this is "God-Tier"
This moves `tinyRPC` from being a "tRPC clone" to a "tRPC evolution." It provides 90% of the value of a complex state management library with 1% of the setup effort, combined with observability that no other RPC framework provides out-of-the-box.
