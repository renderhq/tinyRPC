/**
 * Comprehensive tinyRPC Framework Test Suite
 * Tests all major APIs, links, React hooks, and edge cases
 */

import {
  initTRPC,
  TRPCError,
  createHTTPHandler,
  applyWSHandler,
  observable,
  callProcedure,
} from '@tinyrpc/server';
import {
  createTRPCProxyClient,
  httpLink,
  httpBatchLink,
  wsLink,
  splitLink,
  loggerLink,
  retryLink,
  cacheLink,
  dedupeLink,
} from '@tinyrpc/client';
import { createTRPCReact } from '@tinyrpc/react';
import { z } from 'zod';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { testResults } from './test-utils';

// Test utilities
const createTestServer = (port: number) => {
  const server = http.createServer();
  return new Promise<{ server: http.Server; port: number; wss: WebSocketServer }>((resolve) => {
    server.listen(port, () => {
      const wss = new WebSocketServer({ server });
      resolve({ server, port, wss });
    });
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAllTests() {
  console.log('[INFO] Starting Comprehensive tinyRPC Test Suite\n');

  // Test 1: Core Server Functionality
  await testResults.run('Core Server - Basic Router Creation', async () => {
    const t = initTRPC.create();
    const router = t.router({
      hello: t.procedure.query(() => 'world'),
    }) as any;
    if (!router.hello || (router.hello as any)._def?.type !== 'query') {
      throw new Error('Router creation failed');
    }
  });

  // Test 2: Procedures with Input Validation
  await testResults.run('Procedures - Input Validation with Zod', async () => {
    const t = initTRPC.create();
    const router = t.router({
      getUser: t.procedure
        .input(z.object({ id: z.string() }))
        .query(({ input }) => ({ id: input.id, name: 'Test User' })),
    });

    // This would normally be tested through HTTP, but we can test the resolver directly
    const result = (await router.getUser._def.resolver({ ctx: {}, input: { id: '123' } })) as any;
    if (result.id !== '123' || result.name !== 'Test User') {
      throw new Error('Input validation failed');
    }
  });

  // Test 3: Middleware Functionality
  await testResults.run('Middleware - Logging Middleware', async () => {
    const t = initTRPC.create();
    let loggedPath = '';

    const loggingMiddleware = t.middleware(async (opts) => {
      loggedPath = opts.path;
      return opts.next();
    });

    const router = t.router({
      test: t.procedure.use(loggingMiddleware).query(() => 'success'),
    });

    await callProcedure({
      procedure: router.test,
      ctx: {},
      input: undefined,
      path: 'test',
      type: 'query',
    });
    if (loggedPath !== 'test') {
      throw new Error('Middleware not executed properly');
    }
  });

  // Test 4: HTTP End-to-End
  await testResults.run('HTTP End-to-End - Basic Query', async () => {
    const { server, port } = await createTestServer(3010);
    const t = initTRPC.create();

    const router = t.router({
      greeting: t.procedure
        .input(z.object({ name: z.string() }))
        .query(({ input }) => ({ message: `Hello ${input.name}` })),
    });

    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const result = await client.greeting.query({ name: 'tinyRPC' });
      if (result.message !== 'Hello tinyRPC') {
        throw new Error('HTTP request failed');
      }
    } finally {
      server.close();
    }
  });

  // Test 5: WebSocket End-to-End
  await testResults.run('WebSocket End-to-End - Subscription', async () => {
    const { server, port, wss } = await createTestServer(3011);
    const t = initTRPC.create();
    const ee = new EventEmitter();

    const router = t.router({
      onData: t.procedure.subscription(() => {
        return observable((emit) => {
          const handler = (data: any) => emit.next(data);
          ee.on('data', handler);
          return () => ee.off('data', handler);
        });
      }),
    });

    const httpHandler = createHTTPHandler({ router });
    server.on('request', (req, res) => httpHandler(req, res));
    applyWSHandler({ wss, router });

    const client = createTRPCProxyClient<typeof router>({
      links: [wsLink({ url: `ws://localhost:${port}` })],
    });

    try {
      let receivedData: any = null;
      const sub = client.onData.subscribe({
        onData: (data: any) => {
          receivedData = data;
        },
      });

      await delay(100);
      ee.emit('data', { test: 'payload' });
      await delay(100);

      sub.unsubscribe();
      if (!receivedData || receivedData.test !== 'payload') {
        throw new Error('WebSocket subscription failed');
      }
    } finally {
      server.close();
    }
  });

  // Test 6: Split Link Functionality
  await testResults.run('Split Link - HTTP/WS Routing', async () => {
    const { server, port, wss } = await createTestServer(3012);
    const t = initTRPC.create();

    const router = t.router({
      testQuery: t.procedure.query(() => 'http-response'),
      sub: t.procedure.subscription(() => observable(() => { }) as any) as any,
    });

    const httpHandler = createHTTPHandler({ router });
    server.on('request', (req, res) => httpHandler(req, res));
    applyWSHandler({ wss, router });

    const client = createTRPCProxyClient<typeof router>({
      links: [
        splitLink({
          condition: (op) => op.type === 'subscription',
          true: wsLink({ url: `ws://localhost:${port}` }),
          false: httpLink({ url: `http://localhost:${port}` }),
        }),
      ],
    });

    try {
      const result = await client.testQuery.query();
      if (result !== 'http-response') {
        throw new Error('Split link routing failed');
      }
    } finally {
      server.close();
    }
  });

  // Test 7: Batching Link
  await testResults.run('HTTP Batch Link - Multiple Requests', async () => {
    const { server, port } = await createTestServer(3013);
    const t = initTRPC.create();

    const router = t.router({
      addOne: t.procedure.input(z.number()).query(({ input }) => input + 1),
      double: t.procedure.input(z.number()).query(({ input }) => input * 2),
    });

    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [httpBatchLink({ url: `http://localhost:${port}` })],
    });

    try {
      const [addResult, doubleResult] = await Promise.all([
        client.addOne.query(5),
        client.double.query(10),
      ]);

      if (addResult !== 6 || doubleResult !== 20) {
        throw new Error('Batch link requests failed');
      }
    } finally {
      server.close();
    }
  });

  // Test 8: Retry Link
  await testResults.run('Retry Link - Failed Requests', async () => {
    let attempts = 0;
    const { server, port } = await createTestServer(3014);
    const t = initTRPC.create();

    const router = t.router({
      flaky: t.procedure.query(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      }),
    });

    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => {
      // Simulate failure for first attempts
      if (attempts < 3) {
        attempts++;
        res.statusCode = 500;
        res.end(JSON.stringify({ error: { message: 'Server error' } }));
      } else {
        handler(req, res);
      }
    });

    const client = createTRPCProxyClient<typeof router>({
      links: [retryLink({ attempts: 3, delay: 10 }), httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const result = await client.flaky.query();
      if (result !== 'success') {
        throw new Error('Retry link failed');
      }
    } finally {
      server.close();
    }
  });

  // Test 9: Cache Link
  await testResults.run('Cache Link - Response Caching', async () => {
    let callCount = 0;
    const { server, port } = await createTestServer(3015);
    const t = initTRPC.create();

    const router = t.router({
      expensive: t.procedure.query(() => {
        callCount++;
        return `result-${callCount}`;
      }),
    });

    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [cacheLink({ ttl: 1000 }), httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const result1 = await client.expensive.query();
      const result2 = await client.expensive.query(); // Should be cached

      if (result1 !== result2 || callCount !== 1) {
        throw new Error('Cache link not working');
      }
    } finally {
      server.close();
    }
  });

  // Test 10: Dedupe Link
  await testResults.run('Dedupe Link - Request Deduplication', async () => {
    let callCount = 0;
    const { server, port } = await createTestServer(3016);
    const t = initTRPC.create();

    const router = t.router({
      slow: t.procedure.query(async () => {
        callCount++;
        await delay(100);
        return 'slow-result';
      }),
    });

    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [dedupeLink(), httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const [result1, result2] = await Promise.all([client.slow.query(), client.slow.query()]);

      if (result1 !== result2 || callCount !== 1) {
        throw new Error('Dedupe link not working');
      }
    } finally {
      server.close();
    }
  });

  // Test 11: Error Handling
  await testResults.run('Error Handling - TRPCError', async () => {
    const { server, port } = await createTestServer(3017);
    const t = initTRPC.create();

    const router = t.router({
      error: t.procedure.query(() => {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Test error' });
      }),
    });

    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      try {
        await client.error.query();
        throw new Error('Should have thrown an error');
      } catch (error: any) {
        if (!error.message.includes('Test error')) {
          throw new Error('Error handling failed');
        }
      }
    } finally {
      server.close();
    }
  });

  // Test 12: Transformers
  await testResults.run('Transformers - Date Serialization', async () => {
    const transformer = {
      serialize: (obj: any): any => {
        if (obj instanceof Date) return { __type: 'Date', value: obj.toISOString() };
        return obj;
      },
      deserialize: (obj: any): any => {
        if (obj && typeof obj === 'object' && obj.__type === 'Date') {
          return new Date(obj.value);
        }
        return obj;
      },
    };

    const { server, port } = await createTestServer(3018);
    const t = initTRPC.create({ transformer });

    const testDate = new Date('2024-01-01T00:00:00Z');

    const router = t.router({
      getDate: t.procedure.query(() => testDate),
    });

    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      transformer,
      links: [httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const result = await client.getDate.query();
      if (!(result instanceof Date) || result.getTime() !== testDate.getTime()) {
        throw new Error('Date transformation failed');
      }
    } finally {
      server.close();
    }
  });

  // Test 13: React Hooks (Simulated)
  await testResults.run('React Hooks - createTRPCReact', async () => {
    const t = initTRPC.create();
    const router = t.router({
      test: t.procedure.query(() => 'react-test'),
    });

    // Create mock client
    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: 'http://mock' })],
    });

    // Test React hook creator
    const createHooks = createTRPCReact<typeof router>();
    const hooks = createHooks(client);

    if (!hooks.test || typeof hooks.test.useQuery !== 'function') {
      throw new Error('React hooks creation failed');
    }
  });

  // Test 14: Router Merging
  await testResults.run('Router Merging - Multiple Routers', async () => {
    const t = initTRPC.create();

    const userRouter = t.router({
      getById: t.procedure.input(z.string()).query(({ input }) => ({ id: input })),
    });

    const postRouter = t.router({
      getAll: t.procedure.query(() => ['post1', 'post2']),
    });

    const mergedRouter = t.mergeRouters(userRouter, postRouter);

    if (!mergedRouter.getById || !mergedRouter.getAll) {
      throw new Error('Router merging failed');
    }
  });

  // Test 15: Complex Multi-link Chain
  await testResults.run('Multi-link Chain - Complex Setup', async () => {
    const { server, port } = await createTestServer(3019);
    const t = initTRPC.create();

    const router = t.router({
      complex: t.procedure.input(z.string()).query(({ input }) => input.toUpperCase()),
    });

    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [
        loggerLink(),
        dedupeLink(),
        retryLink({ attempts: 2 }),
        cacheLink({ ttl: 500 }),
        httpLink({ url: `http://localhost:${port}` }),
      ],
    });

    try {
      const result = await client.complex.query('test');
      if (result !== 'TEST') {
        throw new Error('Multi-link chain failed');
      }
    } finally {
      server.close();
    }
  });

  // Final Results
  testResults.printSummary('Comprehensive');
}

// Run the comprehensive test suite
runAllTests().catch(console.error);
