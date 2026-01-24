import {
  createTRPCProxyClient,
  httpBatchLink,
  dedupeLink,
  cacheLink,
  loggerLink,
} from '@tinyrpc/client';
import type { AppRouter } from './server';

async function main() {
  console.log('\x1b[36m--- starting tinyRPC demo ---\x1b[0m');

  const transformer = {
    serialize: (obj: any): any => {
      if (obj instanceof Date) return { __type: 'Date', value: obj.toISOString() };
      if (Array.isArray(obj)) return obj.map((v) => transformer.serialize(v));
      if (typeof obj === 'object' && obj !== null) {
        const res: any = {};
        for (const key in obj) res[key] = transformer.serialize(obj[key]);
        return res;
      }
      return obj;
    },
    deserialize: (obj: any): any => {
      if (obj && typeof obj === 'object' && obj.__type === 'Date') return new Date(obj.value);
      if (Array.isArray(obj)) return obj.map((v) => transformer.deserialize(v));
      if (typeof obj === 'object' && obj !== null) {
        const res: any = {};
        for (const key in obj) res[key] = transformer.deserialize(obj[key]);
        return res;
      }
      return obj;
    },
  };

  const client = createTRPCProxyClient<AppRouter>({
    transformer,
    links: [
      cacheLink({ ttl: 5000 }),
      dedupeLink(),
      loggerLink(),
      httpBatchLink({
        url: 'http://localhost:3005/trpc',
        headers: () => ({ Authorization: 'token_bob' }),
      }),
    ],
  });

  // Test ping
  console.log('\n[Query] Testing ping...');
  const pong = await client.ping.query();
  console.log(`[Success] Ping response: ${pong}`);

  // Test mutation
  console.log('\n[Mutation] Sending message...');
  const result = await client.chat.sendMessage.mutate({ text: 'Hello World!', roomId: 'general' });
  console.log(`[Success] Message ID: ${result.id}`);
  console.log(`[Verify] Timestamp is Date object: ${result.timestamp instanceof Date}`);
  console.log(`[Verify] Message: ${result.text} by ${result.author}`);

  // Test query
  console.log('\n[Query] Fetching messages...');
  const history = await client.chat.getInfiniteMessages.query({ limit: 5 });
  console.log(`[Success] Retrieved ${history.items.length} messages.`);
  history.items.forEach((msg) => {
    console.log(`  - ${msg.author}: ${msg.text} (${msg.timestamp.toLocaleTimeString()})`);
  });

  // Test file upload
  console.log('\n[Mutation] Uploading file...');
  const file = await client.chat.uploadFile.mutate({
    filename: 'demo.txt',
    base64: Buffer.from('Hello tinyRPC').toString('base64'),
  });
  console.log(`[Success] File URL: ${file.url}, Size: ${file.size}`);

  // Test slow query
  console.log('\n[Query] Testing slow query (SWR cache)...');
  const start1 = Date.now();
  await client.slowQuery.query();
  console.log(`[First call] Done in ${Date.now() - start1}ms`);

  const start2 = Date.now();
  await client.slowQuery.query();
  console.log(`[Second call - cached] Done in ${Date.now() - start2}ms`);

  console.log('\n\x1b[32mDemo finished successfully.\x1b[0m');
  process.exit(0);
}

main().catch(console.error);
