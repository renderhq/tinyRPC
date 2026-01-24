import { createTRPCProxyClient, httpLink, wsLink, splitLink, loggerLink } from '@tinyrpc/client';
import type { AppRouter } from './server';

async function main() {
    console.log('[Full-Stack WS] Client Starting');

    const client = createTRPCProxyClient<AppRouter>({
        links: [
            loggerLink(),
            splitLink({
                condition: (op) => op.type === 'subscription',
                true: wsLink({
                    url: 'ws://localhost:3003',
                }),
                false: httpLink({
                    url: 'http://localhost:3003/trpc',
                }),
            }),
        ],
    });

    // 1. Subscribe to real-time events
    console.log('[Client] Subscribing to onMessage...');
    const sub = client.onMessage.subscribe({
        onData: (data: string) => {
            console.log('[Real-time Update] Received message:', data);
        },
        onError: (err: any) => {
            console.error('[Subscription Error]', err);
        },
    });

    // 2. Perform actions via HTTP
    setTimeout(async () => {
        console.log('[Client] Sending message via HTTP Mutation...');
        await client.sendMessage.mutate('Hello from the client!');

        const history = await client.getMessages.query();
        console.log('[Client] History:', history);
    }, 1000);

    // Keep alive for 5 seconds for the demo
    setTimeout(() => {
        sub.unsubscribe();
        process.exit(0);
    }, 5000);
}

main().catch(console.error);
