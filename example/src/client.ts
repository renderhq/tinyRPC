import {
    createTRPCProxyClient,
    httpBatchLink,
    wsLink,
    dedupeLink,
    cacheLink,
    loggerLink
} from '@tinyrpc/client';
import type { AppRouter } from './server.js';

async function main() {
    console.log('\x1b[36m--- starting tinyRPC Intelligent Link Layer demo ---\x1b[0m');

    const transformer = {
        serialize: (obj: any): any => {
            if (obj instanceof Date) return { __type: 'Date', value: obj.toISOString() };
            if (Array.isArray(obj)) return obj.map(v => transformer.serialize(v));
            if (typeof obj === 'object' && obj !== null) {
                const res: any = {};
                for (const key in obj) res[key] = transformer.serialize(obj[key]);
                return res;
            }
            return obj;
        },
        deserialize: (obj: any): any => {
            if (obj && typeof obj === 'object' && obj.__type === 'Date') return new Date(obj.value);
            if (Array.isArray(obj)) return obj.map(v => transformer.deserialize(v));
            if (typeof obj === 'object' && obj !== null) {
                const res: any = {};
                for (const key in obj) res[key] = transformer.deserialize(obj[key]);
                return res;
            }
            return obj;
        }
    };

    const alice = createTRPCProxyClient<AppRouter>({
        transformer,
        links: [
            cacheLink({ ttl: 5000 }), // SWR Cache
            dedupeLink(),
            loggerLink(), // Trace Logger
            wsLink({
                url: 'ws://localhost:3000',
                headers: () => ({ Authorization: 'token_alice' }),
            }),
        ],
    });

    const bob = createTRPCProxyClient<AppRouter>({
        transformer,
        links: [
            cacheLink({ ttl: 5000 }),
            dedupeLink(),
            loggerLink(),
            httpBatchLink({
                url: 'http://localhost:3000/trpc',
                headers: () => ({ Authorization: 'token_bob' }),
            }),
        ],
    });

    // 1. Subscription
    alice.chat.onMessage.subscribe({ roomId: 'general' }, {
        onData: (msg) => {
            console.log(`\x1b[90m[live]\x1b[0m ${msg.author}: ${msg.text} (${msg.timestamp.toLocaleTimeString()})`);
        },
    });

    await new Promise(r => setTimeout(r, 500));

    // 2. Mutations & Optimistic Logic
    console.log('\n[Mutation] Sending message as Bob...');
    const result = await bob.chat.sendMessage.mutate({ text: 'Hello Alice!', roomId: 'general' });
    console.log(`[Success] Message ID: ${result.id}`);
    console.log(`[Verify] Timestamp is Date object: ${result.timestamp instanceof Date}`);

    // 3. Pagination
    console.log('\n[Query] Fetching message history...');
    const history = await alice.chat.getInfiniteMessages.query({ limit: 5 });
    console.log(`[Success] Retrieved ${history.items.length} messages.`);

    // 4. File Upload
    console.log('\n[Mutation] Uploading file...');
    const file = await bob.chat.uploadFile.mutate({
        filename: 'demo.txt',
        base64: Buffer.from('Hello tinyRPC').toString('base64'),
    });
    console.log(`[Success] File URL: ${file.url}`);

    // 5. Rate Limiting / Error Handling
    console.log('\n[Testing] Spamming requests to test rate limiting...');
    try {
        await Promise.all(
            Array.from({ length: 60 }).map(() =>
                bob.chat.sendMessage.mutate({ text: 'spam', roomId: 'general' })
            )
        );
    } catch (e: any) {
        console.log(`\x1b[31m[Expected Error]\x1b[0m ${e.message || 'Rate limit exceeded'}`);
    }

    // 6. SWR Cache & Tracing Demo
    console.log('\n[SWR Demo] First call to slowQuery (expected ~500ms)...');
    const start1 = Date.now();
    await bob.slowQuery.query();
    console.log(`[SWR Demo] Done in ${Date.now() - start1}ms`);

    console.log('\n[SWR Demo] Second call to slowQuery (expected < 5ms - Cached!)');
    const start2 = Date.now();
    await bob.slowQuery.query();
    console.log(`[SWR Demo] Done in ${Date.now() - start2}ms`);

    console.log('\n\x1b[32mDemo finished successfully.\x1b[0m');
    process.exit(0);
}

main().catch(console.error);
