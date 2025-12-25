# tinyRPC

Minimal TypeScript RPC framework inspired by tRPC v10. Provides **type-safe procedures**, **nested routers**, **middleware support**, **WebSocket subscriptions**, and **Zod validation** for building scalable server-client applications.

[GitHub](https://github.com/renderhq/tinyRPC) • [Organization](https://github.com/renderhq) • [Twitter](https://x.com/infinterenders)

---

## Setup

This project uses `pnpm` workspaces.

```bash
git clone https://github.com/renderhq/tinyRPC.git
cd tinyRPC
pnpm install
pnpm build
```

---

## Run

**Server:**

```bash
pnpm dev:server
```

**Client (separate terminal):**

```bash
pnpm dev:client
```

---

## Usage

### Server (`@tinyrpc/server`)

```ts
import { initTRPC, observable } from '@tinyrpc/server';
import { z } from 'zod';

const t = initTRPC.create<{ ctx: Context }>();

const appRouter = t.router({
  health: t.procedure.query(() => ({ status: 'ok' })),
  
  tasks: t.router({
    list: t.procedure
      .input(z.object({ completed: z.boolean().optional() }))
      .query(({ ctx }) => Array.from(ctx.db.tasks.values())),
    
    onUpdate: t.procedure.subscription(() => {
      return observable((observer) => {
        const timer = setInterval(() => {
          observer.next({ message: 'Live update' });
        }, 1000);
        return () => clearInterval(timer);
      });
    }),
  }),
});

export type AppRouter = typeof appRouter;
```

### Client (`@tinyrpc/client`)

```ts
import { createTRPCProxyClient, httpBatchLink, wsLink } from '@tinyrpc/client';
import type { AppRouter } from './server.js';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    // Standard HTTP batching
    httpBatchLink({ url: 'http://localhost:3000/trpc' }),
    // WebSocket support for subscriptions
    wsLink({ url: 'ws://localhost:3000' })
  ],
});

// Query
const tasks = await client.tasks.list.query({ completed: true });

// Subscription
const sub = client.tasks.onUpdate.subscribe(undefined, {
  onData: (data) => console.log('Received:', data),
});
```

---

## Project Structure

This is a **pnpm monorepo** with the following packages:

-   `@tinyrpc/server`: The core server logic and procedure builders.
-   `@tinyrpc/client`: The type-safe proxy client and link system.
-   `example`: A demonstration project showing bidirectional communication.

```
packages/
  server/
    package.json
    src/
      adapters/ws.ts - WebSocket adapter
      index.ts       - Exports
      procedure.ts   - Procedure builder
      observable.ts  - Reactive streams
  client/
    package.json
    src/
      links/ws.ts    - WebSocket link
      proxy.ts       - Proxy client
example/
  package.json
  src/
    server.ts        - Server implementation
    client.ts        - Client implementation
```

---

## Features

-   **Type-safe procedures**: End-to-end type safety without code generation.
-   **Zod validation**: Built-in input and output validation.
-   **Middleware**: Composable middleware chain with context transformation.
-   **WebSocket Subscriptions**: Real-time push notifications using `Observable`.
-   **Request Batching**: Group multiple queries into a single HTTP request.
-   **Monorepo Support**: Proper package organization via pnpm workspaces.
