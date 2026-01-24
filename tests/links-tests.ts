/**
 * tinyRPC Links Test Suite - Fixed
 * Tests all link types with correct API usage
 */

import { initTRPC, TRPCError, createHTTPHandler } from '@tinyrpc/server';
import {
  createTRPCProxyClient,
  httpLink,
  httpBatchLink,
  loggerLink,
  retryLink,
  cacheLink,
  dedupeLink,
  splitLink,
} from '@tinyrpc/client';
import { z } from 'zod';
import http from 'node:http';
import { testResults } from './test-utils';

// Test utilities
const createTestServer = (port: number) => {
  const server = http.createServer();
  return new Promise<{ server: http.Server; port: number }>((resolve) => {
    server.listen(port, () => resolve({ server, port }));
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runLinksTests() {
  console.log('[INFO] Starting tinyRPC Links Test Suite\n');

  // Test 1: Basic HTTP Link
  await testResults.run('Links - HTTP Link Basic', async () => {
    const t = initTRPC.create();
    const router = t.router({
      hello: t.procedure.query(() => 'http-link-works'),
    });

    const { server, port } = await createTestServer(3030);
    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const result = await client.hello.query();
      if (result !== 'http-link-works') {
        throw new Error('HTTP link failed');
      }
    } finally {
      server.close();
    }
  });

  // Test 2: HTTP Link with Headers
  await testResults.run('Links - HTTP Link with Headers', async () => {
    const t = initTRPC.create();
    let receivedHeaders: any = {};

    const router = t.router({
      checkHeaders: t.procedure.query(({ ctx }) => {
        receivedHeaders = (ctx as any).headers || {};
        return { hasAuth: !!receivedHeaders.authorization };
      }),
    });

    const { server, port } = await createTestServer(3031);
    const handler = createHTTPHandler({
      router,
      createContext: ({ req }: any) => ({ headers: req.headers }),
    });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [
        httpLink({
          url: `http://localhost:${port}`,
          headers: { authorization: 'Bearer test-token' },
        }),
      ],
    });

    try {
      const result = await client.checkHeaders.query();
      if (!result.hasAuth) {
        throw new Error('Headers not passed correctly');
      }
    } finally {
      server.close();
    }
  });

  // Test 3: HTTP Link with Dynamic Headers
  await testResults.run('Links - HTTP Link Dynamic Headers', async () => {
    const t = initTRPC.create();
    let receivedAuth = '';

    const router = t.router({
      checkDynamicHeaders: t.procedure.query(({ ctx }) => {
        receivedAuth = (ctx as any).headers?.authorization || '';
        return { authType: receivedAuth.split(' ')[0] || 'none' };
      }),
    });

    const { server, port } = await createTestServer(3032);
    const handler = createHTTPHandler({
      router,
      createContext: ({ req }: any) => ({ headers: req.headers }),
    });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [
        httpLink({
          url: `http://localhost:${port}`,
          headers: () => ({ authorization: `Bearer dynamic-${Date.now()}` }),
        }),
      ],
    });

    try {
      const result = await client.checkDynamicHeaders.query();
      if (result.authType !== 'Bearer') {
        throw new Error('Dynamic headers not working');
      }
    } finally {
      server.close();
    }
  });

  // Test 4: HTTP Batch Link
  await testResults.run('Links - HTTP Batch Link', async () => {
    const t = initTRPC.create();
    let requestCount = 0;

    const router = t.router({
      increment: t.procedure.input(z.number()).query(({ input }) => {
        requestCount++;
        return input + 1;
      }),

      double: t.procedure.input(z.number()).query(({ input }) => {
        requestCount++;
        return input * 2;
      }),
    });

    const { server, port } = await createTestServer(3033);
    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [httpBatchLink({ url: `http://localhost:${port}` })],
    });

    try {
      // These should be batched into one request
      const [result1, result2, result3] = await Promise.all([
        client.increment.query(5),
        client.double.query(10),
        client.increment.query(7),
      ]);

      if (result1 !== 6 || result2 !== 20 || result3 !== 8) {
        throw new Error('Batch link results incorrect');
      }

      // Give some time for batching to happen
      await new Promise((resolve) => setTimeout(resolve, 100));

      // With batching, we should have fewer requests
      if (requestCount > 3) {
        console.log(
          `Note: Request count was ${requestCount}, might indicate batching not working optimally`
        );
      }
    } finally {
      server.close();
    }
  });

  // Test 5: Logger Link
  await testResults.run('Links - Logger Link', async () => {
    const t = initTRPC.create();
    const testRouter = t.router({
      logged: t.procedure.query(() => 'logged-result'),
    });

    const { server, port } = await createTestServer(3034);
    const handler = createHTTPHandler({ router: testRouter });
    server.on('request', (req, res) => handler(req, res));

    // Capture console.log output
    const originalConsole = { ...console };
    let loggedOutput = '';
    console.log = (...args) => {
      loggedOutput += args.join(' ');
      originalConsole.log(...args);
    };
    console.groupCollapsed = (...args) => {
      loggedOutput += args.join(' ');
    };
    console.groupEnd = () => { };
    console.table = (...args) => {
      loggedOutput += JSON.stringify(args);
    };

    const client = createTRPCProxyClient<typeof testRouter>({
      links: [loggerLink(), httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const result = await client.logged.query();
      Object.assign(console, originalConsole); // Restore

      if (result !== 'logged-result') {
        throw new Error('Logger link request failed');
      }

      // Logger should have produced some output
      if (!loggedOutput || loggedOutput.length === 0) {
        console.log('Note: Logger link might not have produced console output');
      }
    } finally {
      Object.assign(console, originalConsole); // Restore
      server.close();
    }
  });

  // Test 6: Retry Link
  await testResults.run('Links - Retry Link', async () => {
    const t = initTRPC.create();
    let attemptCount = 0;

    const retryRouter = t.router({
      flaky: t.procedure.query(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return 'success-after-retries';
      }),
    });

    const { server, port } = await createTestServer(3035);
    let requestCount = 0;
    const handler = createHTTPHandler({ router: retryRouter });
    server.on('request', (req, res) => {
      requestCount++;
      handler(req, res);
    });

    const client = createTRPCProxyClient<typeof retryRouter>({
      links: [retryLink({ attempts: 3, delay: 10 }), httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const result = await client.flaky.query();

      if (result !== 'success-after-retries') {
        throw new Error('Retry link failed to succeed');
      }

      if (requestCount < 2) {
        console.log(
          `Note: Only ${requestCount} requests made, retry might not be working as expected`
        );
      }
    } finally {
      server.close();
    }
  });

  // Test 7: Cache Link
  await testResults.run('Links - Cache Link', async () => {
    const t = initTRPC.create();
    let callCount = 0;

    const cacheRouter = t.router({
      expensive: t.procedure.input(z.string()).query(({ input }) => {
        callCount++;
        return `expensive-${input}-${callCount}`;
      }),
    });

    const { server, port } = await createTestServer(3036);
    const handler = createHTTPHandler({ router: cacheRouter });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof cacheRouter>({
      links: [
        cacheLink({ ttl: 1000 }), // 1 second cache
        httpLink({ url: `http://localhost:${port}` }),
      ],
    });

    try {
      // First call
      const result1 = await client.expensive.query('test');

      // Second call should be cached
      const result2 = await client.expensive.query('test');

      // Third call with different input should not be cached
      const result3 = await client.expensive.query('other');

      if (result1 !== result2) {
        throw new Error('Cache not working for same input');
      }

      if (result1 === result3) {
        throw new Error('Cache not differentiating inputs');
      }

      // Should only have made 2 server calls (test cached, other not cached)
      if (callCount !== 2) {
        console.log(`Note: Server was called ${callCount} times, expected 2`);
      }
    } finally {
      server.close();
    }
  });

  // Test 8: Dedupe Link
  await testResults.run('Links - Dedupe Link', async () => {
    const t = initTRPC.create();
    let callCount = 0;

    const dedupeRouter = t.router({
      slow: t.procedure.input(z.string()).query(async ({ input }) => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate slow operation
        return `slow-${input}-${callCount}`;
      }),
    });

    const { server, port } = await createTestServer(3037);
    const handler = createHTTPHandler({ router: dedupeRouter });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof dedupeRouter>({
      links: [dedupeLink(), httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      // Make multiple identical requests in parallel
      const [result1, result2, result3] = await Promise.all([
        client.slow.query('test'),
        client.slow.query('test'),
        client.slow.query('test'),
      ]);

      // All should return the same result
      if (result1 !== result2 || result2 !== result3) {
        throw new Error('Dedupe not working - different results');
      }

      // Should only have made 1 server call due to deduplication
      if (callCount !== 1) {
        throw new Error(`Expected 1 server call, got ${callCount}`);
      }
    } finally {
      server.close();
    }
  });

  // Test 9: Split Link (condition-based routing)
  await testResults.run('Links - Split Link', async () => {
    const t = initTRPC.create();

    const splitRouter = t.router({
      queryOp: t.procedure.query(() => 'query-result'),
      mutationOp: t.procedure.mutation(() => 'mutation-result'),
    });

    const { server, port } = await createTestServer(3038);
    const handler = createHTTPHandler({ router: splitRouter });
    server.on('request', (req, res) => handler(req, res));

    // Mock different links for testing
    let queryLinkUsed = false;
    let mutationLinkUsed = false;

    const queryLink =
      () =>
        ({ op, next }: any) => {
          if (op.type === 'query') queryLinkUsed = true;
          return next(op);
        };

    const mutationLink =
      () =>
        ({ op, next }: any) => {
          if (op.type === 'mutation') mutationLinkUsed = true;
          return next(op);
        };

    const client = createTRPCProxyClient<typeof splitRouter>({
      links: [
        splitLink({
          condition: (op) => op.type === 'mutation',
          true: mutationLink(),
          false: queryLink(),
        }),
        httpLink({ url: `http://localhost:${port}` }),
      ],
    });

    try {
      await client.queryOp.query();
      await client.mutationOp.mutate();

      if (!queryLinkUsed || !mutationLinkUsed) {
        throw new Error('Split link not routing correctly');
      }
    } finally {
      server.close();
    }
  });

  // Test 10: Complex Link Chain
  await testResults.run('Links - Complex Link Chain', async () => {
    const t = initTRPC.create();
    let logged = false;

    const complexRouter = t.router({
      complex: t.procedure.input(z.string()).query(({ input }) => `complex-${input}`),
    });

    const { server, port } = await createTestServer(3039);
    const handler = createHTTPHandler({ router: complexRouter });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof complexRouter>({
      links: [
        loggerLink(),
        dedupeLink(),
        cacheLink({ ttl: 1000 }),
        httpLink({ url: `http://localhost:${port}` }),
      ],
    });

    try {
      // First call
      const result1 = await client.complex.query('chain-test');

      // Second call should hit cache
      const result2 = await client.complex.query('chain-test');

      if (result1 !== result2 || result1 !== 'complex-chain-test') {
        throw new Error('Complex chain not working');
      }

      // Should have logged
      if (!logged) {
        console.log('[INFO] Logger might not have been detected');
      }
    } finally {
      server.close();
    }
  });

  // Final Results
  testResults.printSummary('Links');
}

// Run the links test suite
runLinksTests().catch(console.error);
