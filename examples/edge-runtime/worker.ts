import { initTRPC, fetchRequestHandler } from '@tinyrpc/server';
import { z } from 'zod';

/**
 * 1. Initialize
 */
const t = initTRPC.create();

const appRouter = t.router({
  edgeGreeting: t.procedure.input(z.string()).query(({ input }) => {
    return {
      message: `Hello from the Edge, ${input}!`,
      runtime: 'Web Standard (Edge)',
    };
  }),
});

export type AppRouter = typeof appRouter;

/**
 * 2. Export Fetch Handler (Standard in Cloudflare Workers / Vercel Edge)
 */
export default {
  async fetch(request: Request): Promise<Response> {
    return fetchRequestHandler({
      router: appRouter,
      req: request,
      endpoint: '/trpc',
    });
  },
};
