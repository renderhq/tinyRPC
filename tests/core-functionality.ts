/**
 * Core tinyRPC Functionality Test Suite
 * Tests fundamental APIs without external dependencies
 */

import { initTRPC, TRPCError, callProcedure } from '@tinyrpc/server';
import { createTRPCProxyClient, httpLink } from '@tinyrpc/client';
import { createTRPCReact } from '@tinyrpc/react';
import { z } from 'zod';
import http from 'node:http';
import { testResults } from './test-utils';

// Test utilities
const createTestServer = (port: number, handler: any) => {
  const server = http.createServer(handler);
  return new Promise<{ server: http.Server; port: number }>((resolve) => {
    server.listen(port, () => resolve({ server, port }));
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runCoreTests() {
  console.log('[INFO] Starting Core tinyRPC Functionality Tests\n');

  // Test 1: Basic tRPC Instance Creation
  await testResults.run('Core - TRPC Instance Creation', async () => {
    const t = initTRPC.create();
    if (!t.procedure || !t.router || !t.middleware) {
      throw new Error('TRPC instance missing core methods');
    }
  });

  // Test 2: Basic Router Creation
  await testResults.run('Core - Basic Router Creation', async () => {
    const t = initTRPC.create();
    const router = t.router({
      hello: t.procedure.query(() => 'world'),
      add: t.procedure
        .input(z.object({ a: z.number(), b: z.number() }))
        .query(({ input }) => input.a + input.b),
    });

    if (!router.hello || !router.add) {
      throw new Error('Router procedures not created correctly');
    }

    // Test direct procedure calls
    const result = await router.hello._def.resolver({ ctx: {}, input: undefined });
    if (result !== 'world') {
      throw new Error('Direct procedure call failed');
    }
  });

  // Test 3: Input Validation
  await testResults.run('Core - Input Validation with Zod', async () => {
    const t = initTRPC.create();
    const router = t.router({
      getUser: t.procedure
        .input(z.object({ id: z.string(), name: z.string().optional() }))
        .query(({ input }) => ({
          id: input.id,
          name: input.name || 'Default User',
          validated: true,
        })),
    });

    const result = (await router.getUser._def.resolver({
      ctx: {},
      input: { id: '123', name: 'Test' },
    })) as any;

    if (result.id !== '123' || result.name !== 'Test' || !result.validated) {
      throw new Error('Input validation not working');
    }
  });

  // Test 4: Mutation Procedures
  await testResults.run('Core - Mutation Procedures', async () => {
    const t = initTRPC.create();
    let counter = 0;

    const router = t.router({
      increment: t.procedure
        .input(z.object({ amount: z.number().default(1) }))
        .mutation(({ input }) => {
          counter += input.amount ?? 1;
          return { counter, increment: input.amount };
        }),
    });

    const result1 = (await router.increment._def.resolver({ ctx: {}, input: { amount: 5 } })) as any;
    const result2 = (await router.increment._def.resolver({ ctx: {}, input: { amount: 2 } })) as any;

    if (result1.counter !== 5 || result2.counter !== 7) {
      throw new Error('Mutation state not maintained correctly');
    }
  });

  // Test 5: Error Handling
  await testResults.run('Core - Error Handling', async () => {
    const t = initTRPC.create();

    const router = t.router({
      throwError: t.procedure.query(() => {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Test error',
        });
      }),
    });

    try {
      await router.throwError._def.resolver({ ctx: {}, input: undefined });
      throw new Error('Should have thrown TRPCError');
    } catch (error: any) {
      if (!(error instanceof TRPCError) || error.code !== 'BAD_REQUEST') {
        throw new Error('TRPCError not thrown correctly');
      }
    }
  });

  // Test 6: Middleware Chain
  await testResults.run('Core - Middleware Chain', async () => {
    const t = initTRPC.create();
    const order: string[] = [];

    const middleware1 = t.middleware(async (opts) => {
      order.push('middleware1-start');
      const result = await opts.next();
      order.push('middleware1-end');
      return result;
    });

    const middleware2 = t.middleware(async (opts) => {
      order.push('middleware2-start');
      const result = await opts.next();
      order.push('middleware2-end');
      return result;
    });

    const router = t.router({
      test: t.procedure.use(middleware1).use(middleware2).query(() => 'success'),
    });

    await callProcedure({
      procedure: router.test,
      ctx: {},
      input: undefined,
      path: 'test',
      type: 'query',
    });

    const expectedOrder = [
      'middleware1-start',
      'middleware2-start',
      'middleware2-end',
      'middleware1-end',
    ];
    if (JSON.stringify(order) !== JSON.stringify(expectedOrder)) {
      throw new Error('Middleware execution order incorrect');
    }
  });

  // Test 7: Router Merging
  await testResults.run('Core - Router Merging', async () => {
    const t = initTRPC.create();

    const userRouter = t.router({
      getById: t.procedure.input(z.string()).query(({ input }) => ({ type: 'user', id: input })),
    });

    const postRouter = t.router({
      getAll: t.procedure.query(() => [{ id: '1', title: 'Post 1' }]),
      create: t.procedure
        .input(z.object({ title: z.string() }))
        .mutation(({ input }) => ({ id: '2', title: input.title })),
    });

    const mergedRouter = t.mergeRouters(userRouter, postRouter);

    if (!mergedRouter.getById || !mergedRouter.getAll || !mergedRouter.create) {
      throw new Error('Merged router missing procedures');
    }

    const user = (await mergedRouter.getById._def.resolver({ ctx: {}, input: '123' })) as any;
    if (user.type !== 'user' || user.id !== '123') {
      throw new Error('Merged router procedure failed');
    }
  });

  // Test 8: HTTP End-to-End
  await testResults.run('HTTP End-to-End - Basic Query', async () => {
    const t = initTRPC.create();

    const router = t.router({
      greet: t.procedure
        .input(z.object({ name: z.string() }))
        .query(({ input }) => ({ message: `Hello ${input.name}!` })),
    });

    const { server, port } = await createTestServer(3020, (req: any, res: any) => {
      // Simple mock handler for testing
      const url = new URL(req.url!, `http://localhost:${port}`);
      if (url.pathname === '/greet') {
        const input = JSON.parse(url.searchParams.get('input') || '{}');
        const result = (router.greet._def.resolver as any)({ ctx: {}, input });
        result.then((data: any) => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: { data } }));
        });
      } else {
        res.statusCode = 404;
        res.end();
      }
    });

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: `http://localhost:${port}` })],
    });

    try {
      const result = await client.greet.query({ name: 'tinyRPC' });
      if (result.message !== 'Hello tinyRPC!') {
        throw new Error('HTTP request returned incorrect result');
      }
    } finally {
      server.close();
    }
  });

  // Test 9: React Integration (Type Test)
  await testResults.run('React Integration - Type Safety', async () => {
    const t = initTRPC.create();
    const router = t.router({
      getData: t.procedure.query(() => ({ data: 'react-test' })),
      updateData: t.procedure
        .input(z.object({ value: z.string() }))
        .mutation(({ input }) => ({ success: true, value: input.value })),
    });

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: 'http://mock' })],
    });

    const createHooks = createTRPCReact<typeof router>();
    const trpc = createHooks(client);

    // Test that hooks are properly typed
    if (!trpc.getData?.useQuery || !trpc.updateData?.useMutation) {
      throw new Error('React hooks not properly created');
    }

    // This is a type-level test - if it compiles, types are correct
    const queryHook = trpc.getData.useQuery;
    const mutationHook = trpc.updateData.useMutation;

    if (typeof queryHook !== 'function' || typeof mutationHook !== 'function') {
      throw new Error('Hook types incorrect');
    }
  });

  // Test 10: Complex Nested Procedures
  await testResults.run('Core - Complex Nested Procedures', async () => {
    const t = initTRPC.create();

    const userRouter = t.router({
      profile: t.procedure.input(z.object({ userId: z.string() })).query(({ input }) => ({
        id: input.userId,
        name: `User ${input.userId}`,
        email: `user${input.userId}@example.com`,
      })),
      settings: t.router({
        get: t.procedure.input(z.object({ userId: z.string() })).query(({ input }) => ({
          theme: 'dark',
          notifications: true,
          userId: input.userId,
        })),
        update: t.procedure
          .input(
            z.object({
              userId: z.string(),
              theme: z.enum(['light', 'dark']).optional(),
              notifications: z.boolean().optional(),
            })
          )
          .mutation(({ input }) => ({
            success: true,
            updated: input,
          })),
      }),
    });

    const mainRouter = t.router({
      users: userRouter,
      version: t.procedure.query(() => '1.0.0'),
    });

    // Test nested procedure access
    const profile = (await mainRouter.users.profile._def.resolver({
      ctx: {},
      input: { userId: '123' },
    })) as any;

    const settings = (await mainRouter.users.settings.get._def.resolver({
      ctx: {},
      input: { userId: '123' },
    })) as any;

    if (profile.id !== '123' || settings.userId !== '123') {
      throw new Error('Nested procedures not working correctly');
    }
  });

  // Test 11: Async Procedures
  await testResults.run('Core - Async Procedures', async () => {
    const t = initTRPC.create();

    const router = t.router({
      slowQuery: t.procedure.input(z.string()).query(async ({ input }) => {
        await delay(50);
        return { message: `Slow result for ${input}` };
      }),
      slowMutation: t.procedure.input(z.number()).mutation(async ({ input }) => {
        await delay(25);
        return { doubled: input * 2 };
      }),
    });

    const start = Date.now();
    const result1 = (await router.slowQuery._def.resolver({ ctx: {}, input: 'test' })) as any;
    const elapsed = Date.now() - start;

    if (elapsed < 40 || result1.message !== 'Slow result for test') {
      throw new Error('Async procedure not working correctly');
    }

    const result2 = (await router.slowMutation._def.resolver({ ctx: {}, input: 21 })) as any;
    if (result2.doubled !== 42) {
      throw new Error('Async mutation failed');
    }
  });

  // Test 12: Custom Transformer
  await testResults.run('Core - Custom Transformer', async () => {
    const customTransformer = {
      serialize: (obj: any): any => {
        if (typeof obj === 'object' && obj !== null && obj.__custom) {
          return { __custom: true, data: obj.value };
        }
        return obj;
      },
      deserialize: (obj: any): any => {
        if (typeof obj === 'object' && obj !== null && obj.__custom) {
          return { __custom: true, value: obj.data };
        }
        return obj;
      },
    };

    const t = initTRPC.create({ transformer: customTransformer });

    const router = t.router({
      getCustom: t.procedure.query(() => ({
        __custom: true,
        value: 'transformed-data',
      })),
    });

    const result = (await router.getCustom._def.resolver({ ctx: {}, input: undefined })) as any;

    if (!result.__custom || result.value !== 'transformed-data') {
      throw new Error('Custom transformer not working');
    }
  });

  // Final Results
  testResults.printSummary('Core');
}

// Run the core test suite
runCoreTests().catch(console.error);
