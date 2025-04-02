import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeSocket } from '../socket';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://0.0.0.0:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Add a simple route for testing
app.get('/', (req, res) => {
  res.send('Socket.io server is running');
});

// Initialize socket handlers
initializeSocket(io);

const SOCKET_PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(SOCKET_PORT, () => {
  console.log(`%c Socket.io server running on port ${SOCKET_PORT}\n`, `color: green`);
});