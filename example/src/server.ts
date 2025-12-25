import { initTRPC, TRPCError, createHTTPHandler, applyWSHandler, observable } from '@tinyrpc/server';
import { z } from 'zod';
import http from 'http';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';

// Real-world Database setup
interface Message {
    id: string;
    text: string;
    author: string;
    timestamp: Date;
    roomId: string;
}

interface User {
    id: string;
    name: string;
    role: 'ADMIN' | 'USER';
}

// Global event emitter for reactive updates
const ee = new EventEmitter();

const db = {
    messages: [] as Message[],
    users: new Map<string, User>([
        ['token_alice', { id: 'alice', name: 'Alice', role: 'ADMIN' }],
        ['token_bob', { id: 'bob', name: 'Bob', role: 'USER' }],
    ]),
};

// Context
export const createContext = async (opts: { req: http.IncomingMessage; res?: http.ServerResponse; ws?: any }) => {
    const sessionToken = opts.req.headers.authorization;
    const user = sessionToken ? db.users.get(sessionToken) : null;

    return {
        user,
        db,
    };
};

type Context = Awaited<ReturnType<typeof createContext>>;

// tRPC Initialization
const t = initTRPC.create<{
    ctx: Context;
    meta: { requiredRole?: 'ADMIN' | 'USER' };
}>();

// Middlewares
const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
    const start = Date.now();
    const result = await next();
    const durationMs = Date.now() - start;
    console.log(`[TRPC] ${type.toUpperCase()} ${path} - ${durationMs}ms`);
    return result;
});

const isAuthed = t.middleware(({ ctx, next, meta }) => {
    if (!ctx.user) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Authentication required. Pass "token_alice" or "token_bob" in Authorization header.',
        });
    }

    if (meta?.requiredRole && ctx.user.role !== meta.requiredRole) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Restricted to ${meta.requiredRole}. Your role: ${ctx.user.role}`,
        });
    }

    return next({
        ctx: { user: ctx.user },
    });
});

const publicProcedure = t.procedure.use(loggerMiddleware);
const protectedProcedure = publicProcedure.use(isAuthed);

// Routers
const chatRouter = t.router({
    sendMessage: protectedProcedure
        .input(z.object({
            text: z.string().min(1).max(500),
            roomId: z.string().default('general')
        }))
        .mutation(({ ctx, input }) => {
            const message: Message = {
                id: Math.random().toString(36).substring(7),
                text: input.text,
                author: ctx.user.name,
                timestamp: new Date(),
                roomId: input.roomId,
            };
            db.messages.push(message);

            ee.emit('newMessage', message);

            return message;
        }),

    getMessages: publicProcedure
        .input(z.object({ roomId: z.string().default('general') }))
        .query(({ input }) => {
            return db.messages
                .filter(m => m.roomId === input.roomId)
                .slice(-50);
        }),

    onMessage: publicProcedure
        .input(z.object({ roomId: z.string().default('general') }))
        .subscription(({ input }) => {
            return observable<Message>((observer) => {
                const handler = (message: Message) => {
                    if (message.roomId === input.roomId) {
                        observer.next(message);
                    }
                };

                ee.on('newMessage', handler);
                return () => {
                    ee.off('newMessage', handler);
                };
            });
        }),
});

const adminRouter = t.router({
    clearChat: protectedProcedure
        .meta({ requiredRole: 'ADMIN' })
        .mutation(() => {
            db.messages = [];
            return { success: true };
        }),
});

export const appRouter = t.router({
    health: publicProcedure.query(() => ({ ok: true, uptime: process.uptime() })),
    chat: chatRouter,
    admin: adminRouter,
});

export type AppRouter = typeof appRouter;

// Server Setup
const handler = createHTTPHandler({
    router: appRouter,
    createContext: (req, res) => createContext({ req, res }),
});

const server = http.createServer((req, res) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
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

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`tinyRPC Server listening on port ${PORT}`);
    console.log(`WebSocket server ready for subscriptions`);
});
