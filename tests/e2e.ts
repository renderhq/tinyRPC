import { initTRPC, createHTTPHandler } from '@tinyrpc/server';
import { createTRPCProxyClient, httpLink } from '@tinyrpc/client';
import { z } from 'zod';
import http from 'node:http';

/**
 * End-to-End Test Suite
 * Validates the full request/response lifecycle between server and client.
 */
async function runTest() {
  console.log('[Test] Starting End-to-End Type Safety Check');

  // 1. Server Setup
  const t = initTRPC.create();
  const appRouter = t.router({
    getUser: t.procedure.input(z.string()).query(({ input }) => ({ id: input, name: 'Test User' })),
  });

  const handler = createHTTPHandler({ router: appRouter });
  const server = http.createServer((req, res) => handler(req, res));

  await new Promise<void>((resolve) => server.listen(3002, resolve));

  // 2. Client Setup
  const client = createTRPCProxyClient<typeof appRouter>({
    links: [httpLink({ url: 'http://localhost:3002' })],
  });

  // 3. Execution & Assertions
  try {
    const user = await client.getUser.query('123');

    if (user.id === '123' && user.name === 'Test User') {
      console.log('[PASS] Data integrity verified');
    } else {
      throw new Error('Data integrity mismatch');
    }

    console.log('\n[INFO] Test Results Summary:');
    console.log('[PASS] Passed: 1');
    console.log('[FAIL] Failed: 0');
  } catch (err: any) {
    console.log(`[FAIL] E2E Test: ${err.message}`);
    console.log('\n[INFO] Test Results Summary:');
    console.log('[PASS] Passed: 0');
    console.log('[FAIL] Failed: 1');
    process.exit(1);
  } finally {
    server.close();
  }
}

runTest().catch((err) => {
  console.error('[Test] Uncaught Exception:', err);
  process.exit(1);
});
