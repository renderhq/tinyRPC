import { initTRPC, observable } from '@tinyrpc/server';
import { createHTTPHandler, applyWSHandler } from '@tinyrpc/server';
import { z } from 'zod';
import http from 'node:http';
import { WebSocketServer } from 'ws';

/**
 * Real-time Analytics Dashboard Logic
 */
const stats = {
  cpuUsage: 0,
  memoryUsage: 0,
  activeRequests: 0,
};

// Simulate live data updates
setInterval(() => {
  stats.cpuUsage = Math.floor(Math.random() * 100);
  stats.memoryUsage = Math.floor(Math.random() * 16384);
  stats.activeRequests = Math.floor(Math.random() * 500);
}, 1000);

/**
 * 1. Router Definition
 */
const t = initTRPC.create();

const appRouter = t.router({
  // Query: Current snapshot
  getSnapshot: t.procedure.query(() => ({
    ...stats,
    timestamp: new Date().toISOString(),
  })),

  // Mutation: Trigger a system event
  triggerAlert: t.procedure
    .input(z.object({ severity: z.enum(['low', 'high']), message: z.string() }))
    .mutation(({ input }) => {
      console.log(`[Alert] [${input.severity.toUpperCase()}] ${input.message}`);
      return { status: 'acknowledged' };
    }),

  // Subscription: Continuous metrics stream
  streamMetrics: t.procedure
    .input(z.object({ intervalMs: z.number().default(1000) }))
    .subscription(({ input }) => {
      return observable<{ cpu: number; mem: number }>((emit) => {
        const timer = setInterval(() => {
          emit.next({ cpu: stats.cpuUsage, mem: stats.memoryUsage });
        }, input.intervalMs);

        return () => clearInterval(timer);
      });
    }),
});

export type AppRouter = typeof appRouter;

/**
 * 2. Server Infrastructure
 */
const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

const httpHandler = createHTTPHandler({
  router: appRouter,
  cors: true, // Enable CORS for browser access
});

server.on('request', (req, res) => {
  if (req.url?.startsWith('/trpc')) {
    httpHandler(req, res);
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Analytics Server</h1><p>Point your tinyRPC client to this endpoint.</p>');
  }
});

applyWSHandler({ wss, router: appRouter });

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

const PORT = 4000;
server.listen(PORT, () => {
  console.log('[Analytics] Server running at http://localhost:4000');
});
