import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import type { Router } from '../types.js';
import { TRPCError } from '../errors.js';
import { callProcedure } from '../middleware.js';
import { transformTRPCResponse } from '../errorUtils.js';
import type { Unsubscribable } from '../observable.js';
import { getTransformer } from '../transformer.js';

interface WSMessage {
    id: string | number;
    method: 'query' | 'mutation' | 'subscription' | 'subscription.stop';
    params: {
        path: string;
        input?: any;
    };
}

export function createWSHandler(opts: {
    router: Router<any>;
    createContext: (opts: { req: IncomingMessage; ws: WebSocket }) => Promise<any>;
}) {
    const { router, createContext } = opts;
    const transformer = getTransformer(router._def.config?.transformer);

    return (ws: WebSocket, req: IncomingMessage) => {
        const subscriptions = new Map<string | number, Unsubscribable>();

        ws.on('message', async (data) => {
            let msg: WSMessage;
            try {
                msg = JSON.parse(data.toString());
            } catch (err) {
                ws.send(JSON.stringify({
                    id: null,
                    error: {
                        message: 'Invalid JSON',
                        code: -32700, // Parse error
                    }
                }));
                return;
            }
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
                let current: any = router;

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
                // Deserialize input
                const procedureInput = transformer.input.deserialize(params.input);

                if (method === 'subscription') {
                    const observable = await callProcedure({
                        procedure,
                        ctx,
                        input: procedureInput,
                        path: params.path,
                        type: 'subscription',
                    });

                    const sub = observable.subscribe({
                        next: (data: any) => {
                            ws.send(JSON.stringify({
                                id,
                                result: {
                                    type: 'data',
                                    data: transformer.output.serialize(data),
                                },
                            }));
                        },
                        error: (err: any) => {
                            const trpcError = err instanceof TRPCError ? err : new TRPCError({
                                code: 'INTERNAL_SERVER_ERROR',
                                message: err.message,
                            });
                            const response = transformTRPCResponse(trpcError, params.path);
                            if (response.error.data) {
                                response.error.data = transformer.output.serialize(response.error.data);
                            }
                            ws.send(JSON.stringify({
                                id,
                                error: response.error,
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
                } else {
                    const data = await callProcedure({
                        procedure,
                        ctx,
                        input: procedureInput,
                        path: params.path,
                        type: method as any,
                    });

                    ws.send(JSON.stringify({
                        id,
                        result: {
                            type: 'data',
                            data: transformer.output.serialize(data),
                        },
                    }));
                }
            } catch (err: any) {
                const trpcError = err instanceof TRPCError ? err : new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: err.message,
                });
                const response = transformTRPCResponse(trpcError, params.path);
                if (response.error.data) {
                    response.error.data = transformer.output.serialize(response.error.data);
                }
                ws.send(JSON.stringify({
                    id,
                    error: response.error,
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

import type { WebSocketServer } from 'ws';

export function applyWSHandler(opts: {
    wss: WebSocketServer;
    router: Router<any>;
    createContext: (opts: { req: IncomingMessage; ws: WebSocket }) => Promise<any>;
}) {
    const { wss, router, createContext } = opts;
    const handler = createWSHandler({ router, createContext });

    wss.on('connection', (ws, req) => {
        handler(ws as any, req);
    });
}
