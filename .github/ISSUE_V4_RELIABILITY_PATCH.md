# Issue: tinyRPC v2.5 - The Reliability & Integrity Patch

## Overview
While the core primitives are in place, several "shadow features" are currently non-functional, and the client-side network layer lacks production-grade resilience. This issue tracks the fixes for these architectural gaps.

## 1. Schema Integrity: Output Validation (CRITICAL)
The `.output()` method in the procedure builder currently has no effect. Procedures can return data that violates their defined contract without error.
- **Requirement**: `callProcedure` must execute `outputParser.parse()` on the resolver's result.
- **Location**: `packages/server/src/middleware.ts`
- **Impact**: Ensures that the server never leaks data that doesn't match the public API contract.

## 2. Batching Constraints: maxBatchSize Implementation
The `maxBatchSize` option is accepted in `httpBatchLink` but ignored in the implementation.
- **Requirement**: Partition the batch into multiple HTTP requests if the number of queued operations exceeds `maxBatchSize`.
- **Location**: `packages/client/src/links.ts`
- **Impact**: Prevents "414 Request-URI Too Large" errors and extremely large response payloads.

## 3. Resource Management: Fetch Cancellation (AbortSignal)
- **Requirement**: Support passing an `AbortSignal` from the client proxy through the link chain.
- **Location**: `packages/client/src/proxy.ts` & `packages/client/src/links.ts`
- **Impact**: Allows developers to cancel redundant requests (e.g., on React component unmount).

## 4. Fault Tolerance: retryLink
- **Requirement**: Implement a reusable link for automatic retries of idempotent queries.
- **Features**: Exponential backoff and Jitter.
- **Location**: `packages/client/src/links/retry.ts`

## Implementation Roadmap
1. [ ] Implement Output Validation in server middleware.
2. [ ] Fix partitioning logic in `httpBatchLink`.
3. [ ] Add `signal` support to `Operation` and `fetch` calls.
4. [ ] Create and export `retryLink`.
