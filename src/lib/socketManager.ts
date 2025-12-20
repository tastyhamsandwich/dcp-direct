import { Server } from 'socket.io';

export class SocketManager {
    private static instance: SocketManager;
    private io: Server | null = null;

    private constructor() {}

    static getInstance(): SocketManager {
        if (!SocketManager.instance) {
            SocketManager.instance = new SocketManager();
        }
        return SocketManager.instance;
    }

    setIO(io: Server) {
        this.io = io;
    }

    getIO(): Server {
        if (!this.io) {
            throw new Error('Socket.IO instance not initialized');
        }
        return this.io;
    }
}

export const socketManager = SocketManager.getInstance();