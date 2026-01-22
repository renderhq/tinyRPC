import type { TRPCLink, Operation } from '../links.js';
import { Observable } from '../observable.js';

export interface WSLinkOptions {
    url: string;
    WebSocket?: any;
    headers?: any | (() => any | Promise<any>);
}

export function wsLink(opts: WSLinkOptions): TRPCLink {
    const { url, WebSocket: WebSocketImpl } = opts;
    const WS = WebSocketImpl || (typeof globalThis !== 'undefined' ? (globalThis as any).WebSocket : undefined);

    if (!WS) {
        throw new Error('No WebSocket implementation found');
    }

    let ws: any = null;
    let connectingPromise: Promise<any> | null = null;
    const pendingRequests = new Map<number, {
        resolve: (v: any) => void;
        reject: (e: any) => void;
        op: Operation;
    }>();
    const activeSubscriptions = new Map<number, any>();

    async function connect() {
        if (ws) return ws;
        if (connectingPromise) return connectingPromise;

        connectingPromise = (async () => {
            let headers = {};
            if (opts.headers) {
                headers = typeof opts.headers === 'function' ? await opts.headers() : opts.headers;
            }

            ws = new WS(url, { headers });

            ws.onmessage = (event: any) => {
                const msg = JSON.parse(event.data);
                const { id, result, error } = msg;

                if (activeSubscriptions.has(id)) {
                    const observer = activeSubscriptions.get(id);
                    if (error) {
                        observer.error(error);
                    } else if (result.type === 'data') {
                        observer.next(result.data);
                    } else if (result.type === 'stopped') {
                        observer.complete();
                    }
                    return;
                }

                const pending = pendingRequests.get(id);
                if (pending) {
                    if (error) {
                        pending.reject({ error });
                    } else {
                        pending.resolve({
                            result: {
                                result: {
                                    data: result.data
                                }
                            }
                        });
                    }
                    pendingRequests.delete(id);
                }
            };

            ws.onclose = () => {
                ws = null;
                connectingPromise = null;
            };

            return new Promise((resolve, reject) => {
                ws.onopen = () => resolve(ws);
                ws.onerror = (err: any) => reject(err);
            });
        })();

        return connectingPromise;
    }

    return ({ op }) => {
        if (op.type === 'subscription') {
            return new Observable((observer) => {
                activeSubscriptions.set(op.id, observer);

                const send = async () => {
                    try {
                        const socket = await connect();
                        if (socket.readyState === 1) {
                            socket.send(JSON.stringify({
                                id: op.id,
                                method: 'subscription',
                                params: {
                                    path: op.path,
                                    input: op.input,
                                },
                            }));
                        } else {
                            setTimeout(send, 10);
                        }
                    } catch (err) {
                        observer.error(err);
                    }
                };
                send();

                return () => {
                    activeSubscriptions.delete(op.id);
                    if (ws && ws.readyState === 1) {
                        ws.send(JSON.stringify({
                            id: op.id,
                            method: 'subscription.stop',
                        }));
                    }
                };
            });
        }

        return new Promise((resolve, reject) => {
            pendingRequests.set(op.id, { resolve, reject, op });

            const send = async () => {
                try {
                    const socket = await connect();
                    if (socket.readyState === 1) {
                        socket.send(JSON.stringify({
                            id: op.id,
                            method: op.type,
                            params: {
                                path: op.path,
                                input: op.input,
                            },
                        }));
                    } else {
                        setTimeout(send, 10);
                    }
                } catch (err) {
                    reject(err);
                    pendingRequests.delete(op.id);
                }
            };
            send();
        });
    };
}
