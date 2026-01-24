import { initTRPC, TRPCError, createHTTPHandler } from '@tinyrpc/server';
import { z } from 'zod';
import http from 'http';

const t = initTRPC.create();

const publicProcedure = t.procedure;

const testRouter = t.router({
  testInputValidation: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(50),
        age: z.number().min(0).max(120),
        email: z.string().email(),
      })
    )
    .query(({ input }) => {
      return { success: true, data: input };
    }),

  testOutputValidation: publicProcedure
    .output(
      z.object({
        id: z.string(),
        status: z.enum(['active', 'inactive']),
        timestamp: z.date(),
      })
    )
    .query(() => {
      return {
        id: '123',
        status: 'active' as const,
        timestamp: new Date(),
      };
    }),

  testInvalidOutput: publicProcedure
    .output(
      z.object({
        id: z.string(),
        status: z.enum(['active', 'inactive']),
      })
    )
    .query(() => {
      return {
        id: 123,
        status: 'invalid',
      };
    }),
});

export const testRouter2 = t.router({
  test: testRouter,
  ping: t.procedure.query(() => 'pong'),
});

const PORT = 4000;
const server = http.createServer(
  createHTTPHandler({
    router: testRouter2,
    createContext: async () => ({}),
  })
);

server.listen(PORT, () => {
  console.log(`\x1b[32m[tinyRPC]\x1b[0m Test server running at http://localhost:${PORT}`);
  console.log('\nTest these endpoints:');
  console.log(
    `  curl -X POST http://localhost:${PORT}/trpc/test.testInputValidation -H "Content-Type: application/json" -d '{"name":"John","age":30,"email":"john@example.com"}'`
  );
  console.log(
    `  curl -X POST http://localhost:${PORT}/trpc/test.testInputValidation -H "Content-Type: application/json" -d '{"name":"","age":150,"email":"invalid"}'`
  );
  console.log(
    `  curl -X POST http://localhost:${PORT}/trpc/test.testInvalidOutput -H "Content-Type: application/json" -d '{}'`
  );
});
