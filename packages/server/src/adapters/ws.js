import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { TRPCError } from '../errors.js';
import { callProcedure } from '../middleware.js';
import { transformTRPCResponse } from '../errorUtils.js';
export function createWSHandler(opts) {
    const { router, createContext } = opts;
    return (ws, req) => {
        const subscriptions = new Map();
        ws.on('message', async (data) => {
            const msg = JSON.parse(data.toString());
            const { id, method, params } = msg;
            if (method === 'subscription.stop') {
                const sub = subscriptions.get(id);
                if (sub) {
                    sub.unsubscribe();
                    subscriptions.delete(id);
                }
                return;
            }
            try {
                const ctx = await createContext({ req, ws });
                const pathArray = params.path.split('.');
                let current = router;
                for (const segment of pathArray) {
                    current = current[segment] ?? current._def?.procedures?.[segment];
                }
                if (!current?._def?.procedure) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: `Procedure not found: ${params.path}`,
                    });
                }
                const procedure = current;
                if (method === 'subscription') {
                    const observable = await callProcedure({
                        procedure,
                        ctx,
                        input: params.input,
                        path: params.path,
                        type: 'subscription',
                    });
                    const sub = observable.subscribe({
                        next: (data) => {
                            ws.send(JSON.stringify({
                                id,
                                result: {
                                    type: 'data',
                                    data,
                                },
                            }));
                        },
                        error: (err) => {
                            const trpcError = err instanceof TRPCError ? err : new TRPCError({
                                code: 'INTERNAL_SERVER_ERROR',
                                message: err.message,
                            });
                            ws.send(JSON.stringify({
                                id,
                                error: transformTRPCResponse(trpcError, params.path).error,
                            }));
                        },
                        complete: () => {
                            ws.send(JSON.stringify({
                                id,
                                result: {
                                    type: 'stopped',
                                },
                            }));
                        },
                    });
                    subscriptions.set(id, sub);
                }
                else {
                    const data = await callProcedure({
                        procedure,
                        ctx,
                        input: params.input,
                        path: params.path,
                        type: method,
                    });
                    ws.send(JSON.stringify({
                        id,
                        result: {
                            type: 'data',
                            data,
                        },
                    }));
                }
            }
            catch (err) {
                const trpcError = err instanceof TRPCError ? err : new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: err.message,
                });
                ws.send(JSON.stringify({
                    id,
                    error: transformTRPCResponse(trpcError, params.path).error,
                }));
            }
        });
        ws.on('close', () => {
            for (const sub of subscriptions.values()) {
                sub.unsubscribe();
            }
            subscriptions.clear();
        });
    };
}
export function applyWSHandler(opts) {
    const { wss, router, createContext } = opts;
    const handler = createWSHandler({ router, createContext });
    wss.on('connection', (ws, req) => {
        handler(ws, req);
    });
}
//# sourceMappingURL=ws.js.map