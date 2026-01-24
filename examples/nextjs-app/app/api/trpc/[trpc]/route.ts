import { initTRPC, fetchRequestHandler } from '@tinyrpc/server';
import { z } from 'zod';

/**
 * 1. Server-side initialization
 */
const t = initTRPC.create();

export const appRouter = t.router({
  getUser: t.procedure.input(z.string()).query(({ input }) => {
    return { id: input, name: 'Maintainer', role: 'OSS Architect' };
  }),

  getSystemStats: t.procedure.query(() => {
    return {
      cpu: Math.floor(Math.random() * 40 + 10),
      memory: Math.floor(Math.random() * 30 + 50),
      uptime: process.uptime(),
      status: 'operational' as const,
    };
  }),

  triggerAction: t.procedure.input(z.object({ node: z.string() })).mutation(({ input }) => {
    console.log(`[Action] Scaling node: ${input.node}`);
    return { success: true, timestamp: new Date().toISOString() };
  }),
});

export type AppRouter = typeof appRouter;

/**
 * 2. Next.js Route Handler (App Router)
 */
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
  });

export { handler as GET, handler as POST };
