import {app, shell, BrowserWindow} from 'electron';
import * as WebSocket from 'ws';
import { EventEmitter } from 'events';

export class PersistentWebSocketService extends EventEmitter {
    private server: WebSocket.Server | null = null;
    private clients: Set<WebSocket> = new Set();
    private serverPort: number;
    private isServerRunning: boolean = false;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private pingInterval: NodeJS.Timeout | null = null;

    /**
     * @param port - Порт для WebSocket-сервера
     * @param browserUrl - URL для открытия в браузере (при отсутствии клиентов)
     * @param pingIntervalTime - Интервал для проверки соединений в мс
     */
    constructor(
        port: number = 3301,
        private browserUrl: string = `https://google.com`,
        private pingIntervalTime: number = 30000
    ) {
        super();
        this.serverPort = port;
        app.on('quit', () => {
            this.shutdown();
        });
    }



    public async start(): Promise<boolean> {
        if (this.isServerRunning) {
            console.log('WebSocket-server started');
            return true;
        }

        return new Promise((resolve) => {
            try {
                this.server = new WebSocket.Server({port: this.serverPort});

                this.server.on('listening', () => {
                    this.isServerRunning = true;
                    console.log(`WebSocket-server started on port ${this.serverPort}`);

                    this.startPingInterval();

                    resolve(true);
                });

                this.server.on('error', (err) => {
                    console.error(`Error WebSocket-server: ${err.message}`);
                    this.isServerRunning = false;
                    this.scheduleReconnect();
                    resolve(false);
                });

                this.server.on('close', () => {
                    console.log('WebSocket-server closed');
                    this.isServerRunning = false;
                    this.scheduleReconnect();
                });

                this.server.on('connection', (ws: WebSocket) => {
                    this.clients.add(ws);
                    console.log(`New client connected, connected: ${this.clients.size}`);
                    this.emit('clientConnected', ws);

                    ws.on('message', (message: WebSocket.Data) => {
                        this.emit('message', message, ws);
                    });

                    ws.on('close', () => {
                        this.clients.delete(ws);
                        console.log(`Client disconnected, connected: ${this.clients.size}`);
                        this.emit('clientDisconnected', ws);
                    });

                    ws.on('error', (err) => {
                        console.error(`Error client connection: ${err.message}`);
                        this.clients.delete(ws);
                    });

                    ws.send(JSON.stringify({type: 'welcome', message: 'Connected to Electron WebSocket server'}));
                });

            } catch (err) {
                console.error(`Error when started WebSocket-server: ${err}`);
                this.isServerRunning = false;
                this.scheduleReconnect();
                resolve(false);
            }
        });
    }

    private startPingInterval(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
        }

        this.pingInterval = setInterval(() => {
            this.checkConnections();
        }, this.pingIntervalTime);
    }

    private checkConnections(): void {
        if (this.clients.size === 0) {
            console.log('No clients connected');
            return;
        }

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.ping();
                } catch (err) {
                    console.error(`Error with send ping: ${err}`);
                    this.clients.delete(client);
                }
            } else {
                this.clients.delete(client);
            }
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(async () => {
            console.log('Try reconnect WebSocket-server...');
            await this.start();
        }, 5000);
    }

    public stop(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.server) {
            this.server.close();
            this.server = null;
        }

        this.isServerRunning = false;
        this.clients.clear();
    }

    public shutdown(): void {
        this.stop();
    }

    public hasClients(): boolean {
        let hasActiveClients = false;

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                hasActiveClients = true;
            }
        });

        return hasActiveClients;
    }

    public broadcast(message: string | object): boolean {
        if (!this.isServerRunning) {
            console.error('Unable to send message: server not started.');
            return false;
        }

        if (!this.hasClients()) {
            console.error('Unable to send message: no connected clients');
            return false;
        }

        try {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);

            this.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(messageStr);
                }
            });

            return true;
        } catch (err) {
            console.error(`Error when sending a message: ${err}`);
            return false;
        }
    }

    public async sendMessage(message: string | object): Promise<boolean> {
        if (this.hasClients()) {
            return this.broadcast(message);
        }
    }

    public isRunning(): boolean {
        return this.isServerRunning;
    }
}

export const wsService = new PersistentWebSocketService();
