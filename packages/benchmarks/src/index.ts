import { initTRPC, createHTTPHandler } from '@tinyrpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@tinyrpc/client';
import http from 'http';

async function runBenchmark() {
  console.log('--- starting tinyRPC vs baseline benchmark ---');

  // 1. setups
  const t = initTRPC.create();
  const router = t.router({
    ping: t.procedure.query(() => ({ pong: true })),
  });

  const handler = createHTTPHandler({
    router,
    createContext: () => ({}),
  });

  const server = http.createServer((req, res) => {
    if (req.url === '/baseline') {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ pong: true }));
      return;
    }
    handler(req, res);
  });

  const PORT = 4001;
  server.listen(PORT);

  const client = createTRPCProxyClient<typeof router>({
    links: [httpBatchLink({ url: `http://localhost:${PORT}/trpc` })],
  });

  const ITERATIONS = 1000;

  // 2. baseline
  console.log(`running ${ITERATIONS} baseline fetch requests...`);
  const startBaseline = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await fetch(`http://localhost:${PORT}/baseline`).then((r) => r.json());
  }
  const endBaseline = Date.now();
  const baselineTime = endBaseline - startBaseline;

  // 3. tinyRPC
  console.log(`running ${ITERATIONS} tinyRPC requests...`);
  const startTiny = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await client.ping.query({});
  }
  const endTiny = Date.now();
  const tinyTime = endTiny - startTiny;

  console.log('\nresults:');
  console.log(`baseline: ${baselineTime}ms (${(baselineTime / ITERATIONS).toFixed(2)}ms/req)`);
  console.log(`tinyrpc:  ${tinyTime}ms (${(tinyTime / ITERATIONS).toFixed(2)}ms/req)`);
  console.log(`overhead: ${((tinyTime - baselineTime) / ITERATIONS).toFixed(2)}ms per request`);

  server.close();
}

runBenchmark().catch(console.error);
