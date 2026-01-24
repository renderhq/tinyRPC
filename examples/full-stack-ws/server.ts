import { initTRPC, observable } from '@tinyrpc/server';
import { createHTTPHandler, applyWSHandler } from '@tinyrpc/server';
import { z } from 'zod';
import http from 'node:http';
import { WebSocketServer } from 'ws';

/**
 * Server State
 */
const messages: string[] = [];
const subscribers = new Set<(msg: string) => void>();

/**
 * 1. Initialize
 */
const t = initTRPC.create();

const appRouter = t.router({
  // Query: Get history
  getMessages: t.procedure.query(() => messages),

  // Mutation: Send message
  sendMessage: t.procedure.input(z.string()).mutation(({ input }) => {
    messages.push(input);
    subscribers.forEach((emit) => emit(input));
    return { success: true };
  }),

  // Subscription: Real-time stream
  onMessage: t.procedure.subscription(() => {
    return observable<string>((emit) => {
      const listener = (msg: string) => emit.next(msg);
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    });
  }),
});

export type AppRouter = typeof appRouter;

/**
 * 2. Setup Server
 */
const server = http.createServer();
const wss = new WebSocketServer({ noServer: true });

// HTTP Handler
const httpHandler = createHTTPHandler({ router: appRouter });

server.on('request', (req, res) => {
  if (req.url?.startsWith('/trpc')) {
    httpHandler(req, res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

// WebSocket Handler
applyWSHandler({ wss, router: appRouter });

server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`[Full-Stack WS] Server running at http://localhost:${PORT}`);
  console.log(`[Full-Stack WS] WebSocket endpoint at ws://localhost:${PORT}`);
});
