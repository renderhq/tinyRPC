import { createTRPCProxyClient, httpBatchLink } from '../../packages/client/src/index.js';
import type { AppRouter } from './server.js';

/**
 * [INTERNAL] Protocol Interceptor Link
 * Mirroring how a super senior engineer would debug the link chain.
 */
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

/**
 * [INTERNAL] Simulated Network Lag Link
 * Demonstrates the micro-task window for batching.
 */
const simulatedLagLink = (ms: number) => {
    return async ({ op, next }: any) => {
        await new Promise(r => setTimeout(r, ms));
        return next(op);
    };
};

async function runDemo() {
    console.log('--- Starting tRPC v10 High-Fidelity Demo ---');

    // Client with authentication configured for user_1 (Admin)
    const adminClient = createTRPCProxyClient<AppRouter>({
        links: [
            protocolLoggerLink(),
            simulatedLagLink(20), // 20ms simulated internal overhead
            httpBatchLink({
                url: 'http://localhost:3000/trpc',
                headers: () => ({
                    Authorization: 'user_1',
                }),
            }),
        ],
    });

    // Client without authentication to demonstrate error handling
    const guestClient = createTRPCProxyClient<AppRouter>({
        links: [
            httpBatchLink({ url: 'http://localhost:3000/trpc' }),
        ],
    });

    try {
        // 1. Health check (Public & Faster)
        console.log('\n[Phase 1] Public Health Check');
        const health = await adminClient.health.query({});
        console.log('Result:', JSON.stringify(health));

        // 2. Demonstrating Authentication Failure
        console.log('\n[Phase 2] Security Verification (Expecting Guest Failure)');
        try {
            await guestClient.tasks.list.query({});
        } catch (err: any) {
            console.log('Success: Correctly blocked unauthorized request ->', err.error.message);
        }

        // 3. Batched Authenticated Operations
        console.log('\n[Phase 3] Batched Pipeline Verification');
        console.log('(Running list.query and create.mutate in parallel - check [Protocol] logs)');

        const [tasks, createdTask] = await Promise.all([
            adminClient.tasks.list.query({ completed: true }),
            adminClient.tasks.create.mutate({ title: 'Finalize End-to-End Excellence' }),
        ]);

        console.log('Initial Completed Tasks:', (tasks as any[]).length);
        console.log('Newly Created Task:', JSON.stringify(createdTask));

        // 4. Persistence & Relationship Verification
        console.log('\n[Phase 4] Persistence Verification');
        const finalTasks = await adminClient.tasks.list.query({});
        console.log('Final Task Registry Count:', (finalTasks as any[]).length);
        const titles = (finalTasks as any[]).map(t => t.title);
        console.log('Registry Snapshot:', titles.join(' | '));

        console.log('\n--- Demo Completed Successfully ---');
    } catch (err) {
        console.error('\nCRITICAL SYSTEM FAILURE');
        console.error(JSON.stringify(err, null, 2));
        process.exit(1);
    }
}

runDemo();
