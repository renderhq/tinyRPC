import { createTRPCProxyClient, httpLink } from '@tinyrpc/client';
import { createTRPCReact } from '@tinyrpc/react';
import type { AppRouter } from '../app/api/trpc/[trpc]/route';

/**
 * Native tinyRPC Client
 */
export const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpLink({
      url: '/api/trpc', // Relative URL works in browser
    }),
  ],
});

/**
 * React Hooks Interface
 * Provides .useQuery and .useMutation inspired by the best of tRPC/TanStack.
 */
export const trpc = createTRPCReact<AppRouter>()(client);
