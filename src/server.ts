import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocket } from '../socket';
import { socketManager } from './lib/socketManager';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3003"],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket']
});

// Add a simple route for testing
app.get('/', (req, res) => {
  res.send('Socket.io server is running');
});

// Initialize the socketManager with our IO instance
socketManager.setIO(io);

// Initialize socket handlers
initializeSocket(io);

const SOCKET_PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(SOCKET_PORT, () => {
  console.log(`%c Socket.io server running on port ${SOCKET_PORT}\n`, `color: green`);
});