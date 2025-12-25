

# tinyRPC

Minimal TypeScript RPC framework inspired by tRPC v10. Provides **type-safe procedures**, **nested routers**, **middleware support**, and **Zod validation** for building scalable server-client applications.

[GitHub](https://github.com/renderhq/tinyRPC) • [Organization](https://github.com/renderhq) • [Twitter](https://x.com/infinterenders)

---

## Setup

```bash
git clone https://github.com/renderhq/tinyRPC.git
cd tinyRPC
npm install
npx tsc
```

---

## Run

**Server:**

```bash
node dist/example/src/server.js
```

**Client (separate terminal):**

```bash
node dist/example/src/client.js
```

---

## Usage

### Server

```ts
import { initTRPC } from './packages/server/src/index.js';
import { z } from 'zod';

const t = initTRPC.create<{ ctx: Context }>();

const appRouter = t.router({
  health: t.procedure.query(() => ({ status: 'ok' })),
  
  tasks: t.router({
    list: t.procedure
      .input(z.object({ completed: z.boolean().optional() }))
      .query(({ ctx }) => ctx.db.tasks),
    
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

**HTTP Server:**

```ts
import { createHTTPHandler } from './packages/server/src/index.js';
import http from 'http';

const handler = createHTTPHandler({
  router: appRouter,
  createContext: () => ({ db: myDatabase }),
});

http.createServer(handler).listen(3000);
```

### Client

```ts
import { createTRPCProxyClient, httpBatchLink } from './packages/client/src/index.js';
import type { AppRouter } from './server.js';

const client = createTRPCProxyClient<AppRouter>({
  links: [httpBatchLink({ url: 'http://localhost:3000/trpc' })],
});

const health = await client.health.query({});
const tasks = await client.tasks.list.query({ completed: true });
const newTask = await client.tasks.create.mutate({ title: 'New task' });
```

---

## Project Structure

```
packages/
  server/src/
    index.ts       - Exports
    types.ts       - Type definitions
    procedure.ts   - Procedure builder
    router.ts      - Router creation
    middleware.ts  - Middleware execution
    dispatch.ts    - HTTP handler
    errors.ts      - Error types
    errorUtils.ts  - Error utilities
  client/src/
    index.ts       - Exports
    types.ts       - Type inference
    proxy.ts       - Proxy client
    links.ts       - HTTP links
example/src/
  server.ts        - Server implementation
  client.ts        - Client implementation
```

---

## Features

*  Type-safe procedures
*  Zod input validation
*  Middleware support
*  Nested routers
*  Request batching
*  Context transformation

---

## Development

```bash
npx tsc --watch
```


Do you want me to do that too?
