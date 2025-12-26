# Issue: tinyRPC v2.0 - Advanced Production Hardening

## Overview
Now that the core v2 infrastructure (Transformers, Deduplication, Edge Support) is in place, we need to focus on performance at scale and operational visibility. This issue serves as the roadmap for the final hardening phase before our v1.0 stable release.

## Proposed Features

### 1. Smart Request Windowing (Batching)
Currently, `httpBatchLink` groups requests that happen in the same tick. We need a more sophisticated windowing system.
- **Dynamic Windowing**: Configurable timeout (e.g., 10-50ms) to wait for more requests before flushing.
- **Max Batch Size**: Limit the number of requests per batch to prevent massive payload issues.
- **Performance**: Reduce HTTP overhead for chat-heavy or dashboard-style applications.

### 2. Built-in Observability (OpenTelemetry)
Enterprise users need to see where time is being spent.
- **Tracing**: Instrument `resolveHTTPResponse` and `callProcedure` with OpenTelemetry spans.
- **Metrics**: Track procedure latency, error rates, and request counts automatically.
- **Hooks**: Provide a `onCall` hook in `initTRPC` for custom logging and tracing.

### 3. Standardized Link & Adapter API
Our internal link system is powerful but needs a cleaner public API for community extensions.
- **Public types**: Formalize `TRPCLink`, `Operation`, and `OperationResult`.
- **Interceptors**: Ease of adding logic before/after every request (e.g., custom retry logic).
- **Documentation**: Extensive guides on building custom adapters (e.g., for AWS Lambda, Deno).

### 4. WebSocket Auth Handshake
Standardize how authentication is handled during the WebSocket connection phase.
- **Headers/Query Params**: Consistent way to pass tokens during the `ws` handshake.
- **Reconnection Logic**: Better state handling when a client reconnects with an expired token.

## Implementation Plan
1. [ ] Implement `BatchWindowLink` with configurable flushes.
2. [ ] Add `middleware` for OpenTelemetry instrumentation in `@tinyrpc/server`.
3. [ ] Formalize `types.ts` for public link consumption.
4. [ ] Standardize `createContext` for WebSockets to handle initial connection auth.

## Why this is "Better"
This moves `tinyRPC` from a "minimal clone" to a "production-ready alternative" that can compete on performance and observability.
