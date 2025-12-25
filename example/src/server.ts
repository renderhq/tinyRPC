import { initTRPC, TRPCError, createHTTPHandler, applyWSHandler, observable } from '../../packages/server/src/index.js';
import { z } from 'zod';
import http from 'http';
import { WebSocketServer } from 'ws';

interface Task {
    id: string;
    title: string;
    completed: boolean;
    userId: string;
}

const db = {
    tasks: new Map<string, Task>([
        ['1', { id: '1', title: 'Implement tRPC Internals', completed: true, userId: 'user_1' }],
        ['2', { id: '2', title: 'Write Professional Documentation', completed: false, userId: 'user_1' }],
    ]),
    users: new Map<string, { id: string; name: string; role: 'ADMIN' | 'USER' }>([
        ['user_1', { id: 'user_1', name: 'Senior Engineer', role: 'ADMIN' }],
    ]),
};

export const createContext = async (opts: { req: http.IncomingMessage; res?: http.ServerResponse; ws?: any }) => {
    const sessionToken = opts.req.headers.authorization;
    const user = sessionToken ? db.users.get(sessionToken) : null;

    return {
        user,
        db,
    };
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.create<{
    ctx: Context;
    meta: { requiredRole?: 'ADMIN' | 'USER' };
    errorShape: any;
    transformer: any;
}>();

const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
    const start = Date.now();
    const result = await next();
    const durationMs = Date.now() - start;
    console.log(`[tRPC] ${type} ${path} - ${durationMs}ms`);
    return result;
});

const isAuthed = t.middleware(({ ctx, next, meta }) => {
    if (!ctx.user) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
        });
    }

    if (meta?.requiredRole && ctx.user.role !== meta.requiredRole) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Required role: ${meta.requiredRole}`,
        });
    }

    return next({
        ctx: {
            ...ctx,
            user: ctx.user,
        },
    });
});

const publicProcedure = t.procedure.use(loggerMiddleware);
const protectedProcedure = publicProcedure.use(isAuthed);

const taskRouter = t.router({
    list: protectedProcedure
        .input(z.object({ completed: z.boolean().optional() }).optional())
        .query(({ ctx, input }) => {
            const allTasks = Array.from(ctx.db.tasks.values()).filter(t => t.userId === ctx.user.id);
            if (input?.completed !== undefined) {
                return allTasks.filter(t => t.completed === input.completed);
            }
            return allTasks;
        }),

    create: protectedProcedure
        .input(z.object({ title: z.string().min(1) }))
        .mutation(({ ctx, input }) => {
            const id = Math.random().toString(36).slice(2);
            const task: Task = {
                id,
                title: input.title,
                completed: false,
                userId: ctx.user.id,
            };
            ctx.db.tasks.set(id, task);
            return task;
        }),

    onUpdate: protectedProcedure.subscription(() => {
        return observable<Task>((observer) => {
            const interval = setInterval(() => {
                const tasks = Array.from(db.tasks.values());
                if (tasks.length > 0) {
                    observer.next(tasks[tasks.length - 1]!);
                }
            }, 2000);

            return () => clearInterval(interval);
        });
    }),
});

export const appRouter = t.router({
    health: publicProcedure.query(() => ({ status: 'UP', timestamp: new Date().toISOString() })),
    tasks: taskRouter,
});

export type AppRouter = typeof appRouter;

const handler = createHTTPHandler({
    router: appRouter,
    createContext: (req, res) => createContext({ req, res }),
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:3001'],
        credentials: true,
    },
});

const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                (req as any).body = body ? JSON.parse(body) : {};
            } catch {
                (req as any).body = {};
            }
            handler(req, res);
        });
    } else {
        handler(req, res);
    }
});

const wss = new WebSocketServer({ server });

applyWSHandler({
    wss,
    router: appRouter,
    createContext: (opts) => createContext({ req: opts.req, ws: opts.ws }),
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
    console.log('WebSocket server ready for subscriptions');
});
