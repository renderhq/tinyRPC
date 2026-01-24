import { initTRPC, TRPCError, callProcedure } from '@tinyrpc/server';
import { z } from 'zod';

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

const createCaller = (router: any, ctx: any, path: string[] = []) => {
  return new Proxy(() => { }, {
    get(_target, prop: string) {
      if (prop === 'query' || prop === 'mutate') {
        return async (input: any) => {
          return await callProcedure({
            procedure: router,
            ctx,
            input,
            path: path.join('.'),
            type: prop === 'query' ? 'query' : 'mutation',
          });
        };
      }
      return createCaller(router[prop], ctx, [...path, prop]);
    },
  }) as any;
};

const caller = createCaller(testRouter, {});

console.log('\x1b[36m--- Testing Runtime Validation with Zod ---\x1b[0m\n');

// Test 1: Valid input
console.log('Test 1: Valid input');
try {
  const result = await caller.testInputValidation.query({
    name: 'John Doe',
    age: 30,
    email: 'john@example.com',
  });
  console.log('\x1b[32m[PASS] Success:\x1b[0m', JSON.stringify(result, null, 2));
} catch (e: any) {
  console.log('\x1b[31m[FAIL] Failed:\x1b[0m', e.message);
}

console.log('\n');

// Test 2: Invalid input (multiple errors)
console.log('Test 2: Invalid input (multiple validation errors)');
try {
  const result = await caller.testInputValidation.query({
    name: '',
    age: 150,
    email: 'invalid-email',
  });
  console.log('\x1b[32m[PASS] Success:\x1b[0m', JSON.stringify(result, null, 2));
} catch (e: any) {
  console.log('\x1b[31m[FAIL] Failed:\x1b[0m', e.message);
  if (e.cause?.issues) {
    console.log('  Validation issues:', JSON.stringify(e.cause.issues, null, 2));
  }
}

console.log('\n');

// Test 3: Valid output
console.log('Test 3: Valid output');
try {
  const result = await caller.testOutputValidation.query({});
  console.log('\x1b[32m[PASS] Success:\x1b[0m', JSON.stringify(result, null, 2));
} catch (e: any) {
  console.log('\x1b[31m[FAIL] Failed:\x1b[0m', e.message);
}

console.log('\n');

// Test 4: Invalid output
console.log('Test 4: Invalid output (should fail validation)');
try {
  const result = await caller.testInvalidOutput.query({});
  console.log('\x1b[32m[PASS] Success:\x1b[0m', JSON.stringify(result, null, 2));
} catch (e: any) {
  console.log('\x1b[31m[FAIL] Failed (expected):\x1b[0m', e.message);
  if (e.cause?.issues) {
    console.log('  Validation issues:', JSON.stringify(e.cause.issues, null, 2));
  }
}

console.log('\n\x1b[32m--- Validation tests completed ---\x1b[0m');
