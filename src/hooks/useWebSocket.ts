import { useState, useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  
  useEffect(() => {
    // Create WebSocket connection
    const socket = io();
    socketRef.current = socket;
    
    // Connection opened
    socket.on('open', () => {
      console.log('Socket.io connected.');
      setIsConnected(true);
    });
    
    // Listen for errors
    socket.on('error', (error) => {
      console.error('Socket.io Error: ', error);
    });
    
    // Connection closed
    socket.on('close', () => {
      console.log('Socket.io Disconnected.');
      setIsConnected(false);
    });
    
    // Clean up
    return () => {
      socket.close();
    };
  }, [url]);
  
  return { 
    socket: socketRef.current, 
    isConnected 
  };
}