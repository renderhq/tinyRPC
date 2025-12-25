import { initTRPC, TRPCError, createHTTPHandler, applyWSHandler, observable, createCallerFactory } from '@tinyrpc/server';
import { z } from 'zod';
import http from 'http';
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { auditLogMiddleware, rateLimitMiddleware } from '@tinyrpc/server';

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

const ee = new EventEmitter();

const db = {
    messages: [] as Message[],
    users: new Map<string, User>([
        ['token_alice', { id: 'alice', name: 'Alice', role: 'ADMIN' }],
        ['token_bob', { id: 'bob', name: 'Bob', role: 'USER' }],
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

/**
 * Data transformer to support native Date objects over the wire.
 */
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

const t = initTRPC.create<{
    ctx: Context;
    meta: { requiredRole?: 'ADMIN' | 'USER' };
    errorShape: any;
    transformer: any;
}>({ transformer: transformer as any });

// Middlewares
const logger = t.middleware(auditLogMiddleware());
const rateLimit = t.middleware(rateLimitMiddleware({ limit: 100, windowMs: 60 * 1000 }));

const isAuthed = t.middleware(({ ctx, next, meta }) => {
    if (!ctx.user) {
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Pass "token_alice" or "token_bob" in Authorization header.',
        });
    }

    if (meta?.requiredRole && ctx.user.role !== meta.requiredRole) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: `Requires ${meta.requiredRole} role.`,
        });
    }

    return next({
        ctx: { user: ctx.user },
    });
});

const publicProcedure = t.procedure.use(logger);
const protectedProcedure = publicProcedure.use(rateLimit).use(isAuthed);

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

    getInfiniteMessages: publicProcedure
        .input(z.object({
            limit: z.number().min(1).max(100).default(10),
            cursor: z.string().nullish(),
        }))
        .query(({ input }) => {
            const { limit, cursor } = input;
            const items = db.messages.filter(m => !cursor || m.id < cursor).slice(-limit);
            const nextCursor = items.length > 0 ? items[0]!.id : null;

            return {
                items,
                nextCursor,
            };
        }),

    uploadFile: protectedProcedure
        .input(z.object({
            filename: z.string(),
            base64: z.string(),
        }))
        .mutation(({ input }) => {
            console.log(`[File] Uploading ${input.filename} (${input.base64.length} bytes)`);
            return {
                url: `https://cdn.example.com/uploads/${input.filename}`,
                size: input.base64.length,
            };
        }),

    onMessage: t.procedure
        .input(z.object({ roomId: z.string() }))
        .subscription(({ input }) => {
            return observable<Message>((emit) => {
                const onMessage = (msg: Message) => {
                    if (msg.roomId === input.roomId) {
                        emit.next(msg);
                    }
                };
                ee.on('newMessage', onMessage);
                return () => ee.off('newMessage', onMessage);
            });
        }),
});

export const appRouter = t.router({
    chat: chatRouter,
    ping: t.procedure.query(() => 'pong'),
});

export type AppRouter = typeof appRouter;

const PORT = 3000;
const server = http.createServer(createHTTPHandler({
    router: appRouter,
    createContext,
    cors: true,
}));

const wss = new WebSocketServer({ server });
applyWSHandler({ wss, router: appRouter, createContext });

server.listen(PORT, () => {
    console.log(`\x1b[32m[tinyRPC]\x1b[0m Server running at http://localhost:${PORT}`);

    // Internal caller simulation
    const createCaller = createCallerFactory(appRouter);
    const system = createCaller({
        user: { id: 'system', name: 'System', role: 'ADMIN' },
        db,
    });

    setTimeout(async () => {
        await system.chat.sendMessage.mutate({
            text: 'System checking in: Internal procedures working.',
            roomId: 'general'
        });
    }, 1000);
});
