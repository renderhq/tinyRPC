import { createTRPCProxyClient, httpBatchLink, wsLink } from '@tinyrpc/client';
import type { AppRouter } from './server.js';

async function main() {
    console.log('--- starting tinyrpc chat demo ---');

    // 1. alice (admin) client via websocket
    const alice = createTRPCProxyClient<AppRouter>({
        links: [
            wsLink({
                url: 'ws://localhost:3000',
                headers: () => ({ Authorization: 'token_alice' }),
            }),
        ],
    });

    // 2. bob (user) client via http
    const bob = createTRPCProxyClient<AppRouter>({
        links: [
            httpBatchLink({
                url: 'http://localhost:3000/trpc',
                headers: () => ({ Authorization: 'token_bob' }),
            }),
        ],
    });

    console.log('[phase 1] alice subscribing...');
    const sub = alice.chat.onMessage.subscribe({ roomId: 'tech' }, {
        onData: (msg) => {
            console.log(`[live] alice received: ${msg.author}: ${msg.text}`);
        },
        onError: (err) => console.error('subscription error:', err),
    });

    await new Promise(r => setTimeout(r, 1000));

    console.log('[phase 2] bob sending messages...');
    await bob.chat.sendMessage.mutate({
        text: 'hello from bob',
        roomId: 'tech'
    });

    await new Promise(r => setTimeout(r, 500));

    await bob.chat.sendMessage.mutate({
        text: 'second message from bob',
        roomId: 'tech'
    });

    await new Promise(r => setTimeout(r, 1000));

    console.log('[phase 3] alice clearing chat...');
    try {
        const result = await alice.admin.clearChat.mutate({});
        console.log('chat cleared:', result);
    } catch (e: any) {
        console.error('clear chat failed:', e.message);
    }

    console.log('[phase 4] unauthorized check...');
    try {
        await bob.admin.clearChat.mutate({});
    } catch (e: any) {
        console.log(`[expected error] bob failed to clear chat: ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));

    console.log('demo finished');
    process.exit(0);
}

main().catch(err => {
    console.error('fatal error:', err);
    process.exit(1);
});
