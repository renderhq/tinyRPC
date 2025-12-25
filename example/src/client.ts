import { createTRPCProxyClient, httpBatchLink, wsLink } from '@tinyrpc/client';
import type { AppRouter } from './server.js';

const protocolLoggerLink = () => {
    return ({ op, next }: any) => {
        const start = Date.now();
        console.log(`[Protocol] OUT -> ${op.type} ${op.path} (ID: ${op.id})`);

        return next(op).then((res: any) => {
            const duration = Date.now() - start;
            console.log(`[Protocol] IN <- ${op.path} (ID: ${op.id}) within ${duration}ms`);
            return res;
        });
    };
};

async function runDemo() {
    console.log('--- Starting tRPC v10 Demo with WebSocket Subscriptions ---');

    const client = createTRPCProxyClient<AppRouter>({
        links: [
            protocolLoggerLink(),
            httpBatchLink({
                url: 'http://localhost:3000/trpc',
                headers: () => ({
                    Authorization: 'user_1',
                }),
            }),
        ],
    });

    const wsClient = createTRPCProxyClient<AppRouter>({
        links: [
            wsLink({
                url: 'ws://localhost:3000',
                headers: () => ({
                    Authorization: 'user_1',
                }),
            }),
        ],
    });

    try {
        console.log('\n[Phase 1] Health Check');
        const health = await client.health.query({});
        console.log('Result:', JSON.stringify(health));

        console.log('\n[Phase 2] Create Task');
        const newTask = await client.tasks.create.mutate({ title: 'Test WebSocket Subscriptions' });
        console.log('Created:', JSON.stringify(newTask));

        console.log('\n[Phase 3] Subscribe to Task Updates');
        const observable = (wsClient.tasks.onUpdate as any).subscribe({});

        const unsub = observable.subscribe({
            next: (data: any) => {
                console.log('[Subscription] Received update:', JSON.stringify(data));
            },
            error: (err: any) => {
                console.error('[Subscription] Error:', err);
            },
            complete: () => {
                console.log('[Subscription] Complete');
            },
        });

        console.log('Listening for task updates (will run for 10 seconds)...');

        setTimeout(() => {
            unsub.unsubscribe();
            console.log('\n--- Demo Completed ---');
            process.exit(0);
        }, 10000);

    } catch (err) {
        console.error('System Failure:', JSON.stringify(err, null, 2));
        process.exit(1);
    }
}

runDemo();
