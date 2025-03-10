import { useState, useEffect, useRef } from 'react';

export function useWebSocket(url: string) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  
  useEffect(() => {
    // Create WebSocket connection
    const socket = new WebSocket(url);
    socketRef.current = socket;
    
    // Connection opened
    socket.addEventListener('open', () => {
      console.log('WebSocket Connected');
      setIsConnected(true);
    });
    
    // Listen for errors
    socket.addEventListener('error', (error) => {
      console.error('WebSocket Error:', error);
    });
    
    // Connection closed
    socket.addEventListener('close', () => {
      console.log('WebSocket Disconnected');
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