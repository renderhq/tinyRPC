# tinyRPC

Minimal tRPC v10 implementation in TypeScript.

[GitHub](https://github.com/renderhq/tinyRPC) • [Twitter](https://x.com/infinterenders)

## Setup

```bash
git clone <repo-url>
cd tinyRPC
npm install
npx tsc
```

## Run

Server:
```bash
node dist/example/src/server.js
```

Client (separate terminal):
```bash
node dist/example/src/client.js
```

## Usage

### Server

```typescript
import { initTRPC } from './packages/server/src/index.js';
import { z } from 'zod';

const t = initTRPC.create<{ ctx: Context }>();

const appRouter = t.router({
  health: t.procedure.query(() => ({ status: 'ok' })),
  
  tasks: t.router({
    list: t.procedure
      .input(z.object({ completed: z.boolean().optional() }))
      .query(({ ctx, input }) => ctx.db.tasks),
    
    create: t.procedure
      .input(z.object({ title: z.string() }))
      .mutation(({ ctx, input }) => {
        const task = { id: randomId(), title: input.title };
        ctx.db.tasks.push(task);
        return task;
      }),
  }),
});

export type AppRouter = typeof appRouter;
```

HTTP server:

```typescript
import { createHTTPHandler } from './packages/server/src/index.js';
import http from 'http';

const handler = createHTTPHandler({
  router: appRouter,
  createContext: (req, res) => ({ db: myDatabase }),
});

http.createServer(handler).listen(3000);
```

### Client

```typescript
import { createTRPCProxyClient, httpBatchLink } from './packages/client/src/index.js';
import type { AppRouter } from './server.js';

const client = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: 'http://localhost:3000/trpc' })],
});

const health = await client.health.query({});
const tasks = await client.tasks.list.query({ completed: true });
const newTask = await client.tasks.create.mutate({ title: 'New task' });
```

## Structure

```
packages/
  server/src/
    index.ts          - Exports
    types.ts          - Type definitions
    procedure.ts      - Procedure builder
    router.ts         - Router creation
    middleware.ts     - Middleware execution
    dispatch.ts       - HTTP handler
    errors.ts         - Error types
    errorUtils.ts     - Error utilities
  client/src/
    index.ts          - Exports
    types.ts          - Type inference
    proxy.ts          - Proxy client
    links.ts          - HTTP links
example/src/
  server.ts           - Server implementation
  client.ts           - Client implementation
```

## Features

- Type-safe procedures
- Zod validation
- Middleware support
- Nested routers
- Request batching
- Context transformation

## Development

```bash
npx tsc --watch
```
