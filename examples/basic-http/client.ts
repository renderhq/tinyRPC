import { createTRPCProxyClient, httpLink, loggerLink } from '@tinyrpc/client';
import type { AppRouter } from './server';

async function main() {
  console.log('--- [Basic HTTP] Client Starting ---');

  const client = createTRPCProxyClient<AppRouter>({
    links: [
      loggerLink(),
      httpLink({
        url: 'http://localhost:3005',
        headers: () => ({
          Authorization: 'secret-token',
        }),
      }),
    ],
  });

  try {
    // Execution with full type safety
    const response = await client.greeting.query({ name: 'Developer' });
    console.log('Response from server:', response.message);
  } catch (error) {
    console.error('Request failed:', error);
  }
}

main();
