import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import type { Router } from '../types.js';
export declare function createWSHandler(opts: {
    router: Router<any>;
    createContext: (opts: {
        req: IncomingMessage;
        ws: WebSocket;
    }) => Promise<any>;
}): (ws: WebSocket, req: IncomingMessage) => void;
import type { WebSocketServer } from 'ws';
export declare function applyWSHandler(opts: {
    wss: WebSocketServer;
    router: Router<any>;
    createContext: (opts: {
        req: IncomingMessage;
        ws: WebSocket;
    }) => Promise<any>;
}): void;
//# sourceMappingURL=ws.d.ts.map