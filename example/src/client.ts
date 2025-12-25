import { createTRPCProxyClient, httpBatchLink, wsLink } from '@tinyrpc/client';
import type { AppRouter } from './server.js';

async function main() {
    console.log('--- starting tinyrpc production-ready demo ---');

    const alice = createTRPCProxyClient<AppRouter>({
        links: [
            wsLink({
                url: 'ws://localhost:3000',
                headers: () => ({ Authorization: 'token_alice' }),
            }),
        ],
    });

    const bob = createTRPCProxyClient<AppRouter>({
        links: [
            httpBatchLink({
                url: 'http://localhost:3000/trpc',
                headers: () => ({ Authorization: 'token_bob' }),
            }),
        ],
    });

    // 1. Subscription with recovery/operators (tap/map/filter)
    console.log('[phase 1] setting up reactive listeners...');
    alice.chat.onMessage.subscribe({ roomId: 'general' }, {
        onData: (msg) => {
            console.log(`[live] ${msg.author}: ${msg.text}`);
        },
    });

    await new Promise(r => setTimeout(r, 500));

    // 2. Optimistic Update Simulation
    console.log('\n[phase 2] performing optimistic update simulation...');
    const newMessage = { text: 'optimistic hello', roomId: 'general' };

    // Simulate UI update before network
    console.log(`[ui] rendering (optimistic): bob: ${newMessage.text}`);

    const actualMessage = await bob.chat.sendMessage.mutate(newMessage);
    console.log(`[server] confirmed message id: ${actualMessage.id}`);

    // 3. Infinite Loading (Pagination)
    console.log('\n[phase 3] testing infinite loading (cursor-based)...');

    // Fill up some messages
    for (let i = 0; i < 5; i++) {
        await bob.chat.sendMessage.mutate({ text: `message ${i}`, roomId: 'general' });
    }

    console.log('fetching first page...');
    const page1 = await alice.chat.getInfiniteMessages.query({ limit: 3 });
    console.log(`page 1 items: ${page1.items.length}, nextCursor: ${page1.nextCursor}`);

    if (page1.nextCursor) {
        console.log('fetching second page...');
        const page2 = await alice.chat.getInfiniteMessages.query({
            limit: 3,
            cursor: page1.nextCursor
        });
        console.log(`page 2 items: ${page2.items.length}, nextCursor: ${page2.nextCursor}`);
    }

    // 4. File Upload (Base64)
    console.log('\n[phase 4] testing file upload...');
    const uploadResult = await bob.chat.uploadFile.mutate({
        filename: 'profile.png',
        base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    });
    console.log(`upload successful: ${uploadResult.url}`);

    // 5. Rate Limiting Check
    console.log('\n[phase 5] reaching rate limits...');
    try {
        const promises = [];
        for (let i = 0; i < 60; i++) {
            promises.push(bob.chat.sendMessage.mutate({ text: 'spam', roomId: 'general' }));
        }
        await Promise.all(promises);
    } catch (e: any) {
        console.log(`[expected error] ${e.message}`);
    }

    await new Promise(r => setTimeout(r, 1000));
    console.log('\ndemo finished');
    process.exit(0);
}

main().catch(console.error);
