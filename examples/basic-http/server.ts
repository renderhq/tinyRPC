import { initTRPC } from '@tinyrpc/server';
import { createHTTPHandler } from '@tinyrpc/server';
import { z } from 'zod';
import http from 'node:http';

/**
 * 1. Define your Context
 */
interface Context {
  user?: { id: string; name: string };
}

const createContext = async ({ req }: { req: http.IncomingMessage }): Promise<Context> => {
  const token = req.headers.authorization;
  if (token === 'secret-token') {
    return { user: { id: '1', name: 'Admin' } };
  }
  return {};
};

/**
 * 2. Initialize tinyRPC
 */
const t = initTRPC.create();

/**
 * 3. Create Procedures and Router
 */
const appRouter = t.router({
  greeting: t.procedure.input(z.object({ name: z.string() })).query(({ input, ctx }) => {
    const userPrefix = ctx.user ? `Hello ${ctx.user.name}, ` : 'Hello, ';
    return {
      message: `${userPrefix}${input.name}!`,
    };
  }),
});

export type AppRouter = typeof appRouter;

/**
 * 4. Start the Server
 */
const handler = createHTTPHandler({
  router: appRouter,
  createContext,
});

const server = http.createServer((req, res) => {
  handler(req, res);
});

const PORT = 3005;
server.listen(PORT, () => {
  console.log(`[Basic HTTP] Server running at http://localhost:${PORT}`);
});
