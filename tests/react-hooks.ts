/**
 * tinyRPC React Hooks Test Suite
 * Tests React integration and hook functionality
 */

import { initTRPC, createHTTPHandler } from '@tinyrpc/server';
import { createTRPCProxyClient, httpLink } from '@tinyrpc/client';
import { createTRPCReact } from '@tinyrpc/react';
import { z } from 'zod';
import http from 'node:http';
import { Observable } from '@tinyrpc/server';
import { testResults } from './test-utils';

// Test utilities
const createTestServer = (port: number) => {
  const server = http.createServer();
  return new Promise<{ server: http.Server; port: number }>((resolve) => {
    server.listen(port, () => resolve({ server, port }));
  });
};

async function runReactTests() {
  console.log('[INFO] Starting tinyRPC React Hooks Test Suite\n');

  // Test 1: createTRPCReact Basic Usage
  await testResults.run('React - createTRPCReact Basic', async () => {
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

    // Test that hooks are properly typed and accessible
    if (!trpc.getData?.useQuery || !trpc.updateData?.useMutation) {
      throw new Error('React hooks not properly created');
    }

    // Test that hooks are functions
    if (
      typeof trpc.getData.useQuery !== 'function' ||
      typeof trpc.updateData.useMutation !== 'function'
    ) {
      throw new Error('Hook types incorrect');
    }
  });

  // Test 2: Hook Types with Different Procedures
  await testResults.run('React - Hook Types for Different Procedures', async () => {
    const t = initTRPC.create();

    const router = t.router({
      // Query
      getUser: t.procedure
        .input(z.object({ id: z.string() }))
        .query(({ input }) => ({ id: input.id, name: 'Test User' })),

      // Mutation
      createUser: t.procedure
        .input(z.object({ name: z.string(), email: z.string() }))
        .mutation(({ input }) => ({ id: 'new-user', ...input })),

      // Nested router
      posts: t.router({
        getAll: t.procedure.query(() => ['post1', 'post2']),
        create: t.procedure
          .input(z.object({ title: z.string() }))
          .mutation(({ input }) => ({ id: 'new-post', title: input.title })),
      }),
    });

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: 'http://mock' })],
    });

    const createHooks = createTRPCReact<typeof router>();
    const trpc = createHooks(client);

    // Test all hook types are available
    const requiredHooks = [
      'getUser.useQuery',
      'createUser.useMutation',
      'posts.getAll.useQuery',
      'posts.create.useMutation',
      'getUser.useInfiniteQuery',
      'getUser.useUtils',
      'getUser.useContext',
    ];

    for (const hookPath of requiredHooks) {
      const parts = hookPath.split('.');
      let current: any = trpc;

      for (const part of parts) {
        current = current?.[part];
      }

      if (!current || typeof current !== 'function') {
        throw new Error(`Hook ${hookPath} not available or not a function`);
      }
    }
  });

  // Test 3: Nested Router Hook Creation
  await testResults.run('React - Nested Router Hook Creation', async () => {
    const t = initTRPC.create();

    const authRouter = t.router({
      login: t.procedure
        .input(z.object({ username: z.string(), password: z.string() }))
        .query(({ input }) => ({ token: `token-${input.username}` })),
      logout: t.procedure.mutation(() => ({ success: true })),
    });

    const userRouter = t.router({
      profile: t.procedure.query(() => ({ id: '123', name: 'User' })),
      settings: t.router({
        get: t.procedure.query(() => ({ theme: 'dark' })),
        update: t.procedure
          .input(z.object({ theme: z.string() }))
          .mutation(({ input }) => ({ theme: input.theme })),
      }),
    });

    const appRouter = t.router({
      auth: authRouter,
      user: userRouter,
      version: t.procedure.query(() => '1.0.0'),
    });

    const client = createTRPCProxyClient<typeof appRouter>({
      links: [httpLink({ url: 'http://mock' })],
    });

    const createHooks = createTRPCReact<typeof appRouter>();
    const trpc = createHooks(client);

    // Test nested hooks
    const nestedHooks = [
      'auth.login.useQuery',
      'auth.logout.useMutation',
      'user.profile.useQuery',
      'user.settings.get.useQuery',
      'user.settings.update.useMutation',
      'version.useQuery',
    ];

    for (const hookPath of nestedHooks) {
      const parts = hookPath.split('.');
      let current: any = trpc;

      for (const part of parts) {
        current = current?.[part];
      }

      if (!current || typeof current !== 'function') {
        throw new Error(`Nested hook ${hookPath} not available`);
      }
    }
  });

  // Test 4: Hook Argument Types
  await testResults.run('React - Hook Argument Types', async () => {
    const t = initTRPC.create();

    const router = t.router({
      // Procedure with required input
      required: t.procedure
        .input(z.object({ id: z.number() }))
        .query(({ input }) => ({ id: input.id })),

      // Procedure with optional input
      optional: t.procedure
        .input(z.object({ name: z.string().optional() }))
        .query(({ input }) => ({ name: input.name || 'default' })),

      // Procedure with no input
      noInput: t.procedure.query(() => 'no-input'),
    });

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: 'http://mock' })],
    });

    const createHooks = createTRPCReact<typeof router>();
    const trpc = createHooks(client);

    // These are type tests - if they compile, types are correct

    // Required input should require argument
    const requiredHook = trpc.required.useQuery;
    if (typeof requiredHook !== 'function') {
      throw new Error('Required hook not available');
    }

    // Optional input should work with and without arguments
    const optionalHook = trpc.optional.useQuery;
    if (typeof optionalHook !== 'function') {
      throw new Error('Optional hook not available');
    }

    // No input should work without arguments
    const noInputHook = trpc.noInput.useQuery;
    if (typeof noInputHook !== 'function') {
      throw new Error('No input hook not available');
    }
  });

  // Test 5: Real Server Integration with Mock React Environment
  await testResults.run('React - Real Server Integration', async () => {
    const t = initTRPC.create();

    const router = t.router({
      getUsers: t.procedure.query(() => [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
      ]),

      getUser: t.procedure
        .input(z.string())
        .query(({ input }) => ({ id: input, name: `User ${input}` })),

      createUser: t.procedure
        .input(z.object({ name: z.string(), email: z.string() }))
        .mutation(({ input }) => ({
          id: `${Date.now()}`,
          ...input,
          createdAt: new Date().toISOString(),
        })),
    });

    const { server, port } = await createTestServer(3040);
    const handler = createHTTPHandler({ router });
    server.on('request', (req, res) => handler(req, res));

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: `http://localhost:${port}` })],
    });

    const createHooks = createTRPCReact<typeof router>();
    const trpc = createHooks(client);

    try {
      // Test that the client works with real server
      const users = await client.getUsers.query();
      const user = await client.getUser.query('123');
      const created = await client.createUser.mutate({
        name: 'Test User',
        email: 'test@example.com',
      });

      if (!Array.isArray(users) || users.length !== 2) {
        throw new Error('getUsers failed');
      }

      if (user.id !== '123' || !user.name.includes('User 123')) {
        throw new Error('getUser failed');
      }

      if (!created.id || !created.name || !created.email) {
        throw new Error('createUser failed');
      }

      // Verify hooks are still properly typed after real calls
      if (!trpc.getUsers.useQuery || !trpc.getUser.useQuery || !trpc.createUser.useMutation) {
        throw new Error('Hooks not available after server calls');
      }
    } finally {
      server.close();
    }
  });

  // Test 6: Subscription Hook Availability
  await testResults.run('React - Subscription Hook Availability', async () => {
    const t = initTRPC.create();

    const router = t.router({
      onMessage: t.procedure.subscription(() => {
        return new Observable(() => ({ unsubscribe: () => { } }));
      }),

      onNotification: t.procedure.input(z.object({ type: z.string() })).subscription(() => {
        return new Observable(() => ({ unsubscribe: () => { } }));
      }),
    });

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: 'http://mock' })],
    });

    const createHooks = createTRPCReact<typeof router>();
    const trpc = createHooks(client);

    // Test subscription hooks
    if (!trpc.onMessage.useSubscription || !trpc.onNotification.useSubscription) {
      throw new Error('Subscription hooks not available');
    }

    if (
      typeof trpc.onMessage.useSubscription !== 'function' ||
      typeof trpc.onNotification.useSubscription !== 'function'
    ) {
      throw new Error('Subscription hooks not functions');
    }
  });

  // Test 7: Utils and Context Hooks
  await testResults.run('React - Utils and Context Hooks', async () => {
    const t = initTRPC.create();

    const router = t.router({
      data: t.procedure.query(() => 'test-data'),
    });

    const client = createTRPCProxyClient<typeof router>({
      links: [httpLink({ url: 'http://mock' })],
    });

    const createHooks = createTRPCReact<typeof router>();
    const trpc = createHooks(client);

    // Test utils hook
    if (!trpc.data.useUtils || !trpc.data.useContext) {
      throw new Error('Utils/context hooks not available');
    }

    if (typeof trpc.data.useUtils !== 'function' || typeof trpc.data.useContext !== 'function') {
      throw new Error('Utils/context hooks not functions');
    }
  });

  // Final Results
  testResults.printSummary('React Hooks');
}

// Run the React hooks test suite
runReactTests().catch(console.error);
