import { createTRPCProxyClient, httpLink, wsLink, splitLink, loggerLink } from '@tinyrpc/client';
import type { AppRouter } from './server';

async function main() {
  console.log('[Analytics Client] Initializing connection');

  const client = createTRPCProxyClient<AppRouter>({
    links: [
      // loggerLink(), // Optional for logging
      splitLink({
        condition: (op) => op.type === 'subscription',
        true: wsLink({ url: 'ws://localhost:4000' }),
        false: httpLink({ url: 'http://localhost:4000/trpc' }),
      }),
    ],
  });

  // 1. Get initial snapshot via HTTP
  const snapshot = await client.getSnapshot.query();
  console.log('[Analytics] Initial Snapshot:', snapshot);

  // 2. Start real-time stream via WS
  console.log('[Analytics] Starting metrics stream (500ms intervals)');
  const stream = client.streamMetrics.subscribe(
    { intervalMs: 500 },
    {
      onData: (data) => {
        // Clean console dashboard
        process.stdout.write(`\r[Live Metrics] CPU: ${data.cpu}% | MEM: ${data.mem} MB    `);
      },
      onError: (err) => console.error('\n[Stream Error]', err),
    }
  );

  // 3. Trigger a mutation alert after 3 seconds
  setTimeout(async () => {
    console.log('\n[Client] Triggering high-priority alert...');
    await client.triggerAlert.mutate({
      severity: 'high',
      message: 'Abnormal CPU spike detected in region-us-west',
    });
  }, 3000);

  // 4. Cleanup
  setTimeout(() => {
    stream.unsubscribe();
    console.log('\n[Client] Monitoring session complete.');
    process.exit(0);
  }, 6000);
}

main().catch(console.error);
