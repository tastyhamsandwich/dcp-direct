'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GameProvider } from '@contexts/gameContext';
import CardGame from '@components/game/CardGame';
import { useAuth } from '@contexts/authContext';
import Table from '@components/game/Table';
import Chat from '@components/ui/Chat';

export default function GamePage({ params }: { params: { gameId: string } }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [gameState, setGameState] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Setup WebSocket connection
  useEffect(() => {
    if (!params.gameId || !user) return;
    
    // Create WebSocket connection with game ID
    const ws = new WebSocket(`ws://${window.location.host}/api/socket/${params.gameId}`);
    setSocket(ws);
    
    // Connection opened
    ws.addEventListener('open', () => {
      setIsConnected(true);
      
      // Join the game room
      ws.send(JSON.stringify({
        type: 'join_game',
        gameId: params.gameId,
        userId: user.id,
        username: profile?.username || 'Player'
      }));
    });
    
    // Listen for messages
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'game_update':
          setGameState(data.game);
          break;
        case 'chat_message':
          setChatMessages(prev => [...prev, data.message]);
          break;
        case 'error':
          alert(data.message);
          router.push('/');
          break;
        default:
          console.log('Unknown message type:', data.type);
      }
    });
    
    // Listen for errors
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Connection closed
    ws.addEventListener('close', () => {
      setIsConnected(false);
    });
    
    // Clean up
    return () => {
      ws.close();
    };
  }, [params.gameId, user, profile, router]);
  
  // Handle player actions
  const handlePlayerAction = useCallback((actionType: string, amount: number = 0) => {
    if (!socket || !isConnected) return;
    
    socket.send(JSON.stringify({
      type: 'player_action',
      gameId: params.gameId,
      userId: user?.id,
      action: { type: actionType, amount }
    }));
  }, [socket, isConnected, params.gameId, user]);
  
  // Handle sending chat messages
  const handleSendMessage = useCallback((message: string) => {
    if (!socket || !isConnected || !message.trim()) return;
    
    socket.send(JSON.stringify({
      type: 'chat_message',
      gameId: params.gameId,
      userId: user?.id,
      username: profile?.username || 'Player',
      message: message.trim()
    }));
  }, [socket, isConnected, params.gameId, user, profile]);
  
  // Show loading state
  if (loading) {
    return <div className="text-center p-10">Loading...</div>;
  }
  
  // Show error if not authenticated
  if (!user) {
    return <div className="text-center p-10">You must be logged in to play.</div>;
  }
  
  // Show loading game state
  if (!gameState) {
    return <div className="text-center p-10">Loading game...</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{gameState.name || 'Card Game'}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {/* We'll use the existing Table component for now */}
          <Table
            gameState={gameState}
            currentPlayerId={user.id}
            onAction={handlePlayerAction}
          />
        </div>
        
        <div className="lg:col-span-1">
          <Chat
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            username={profile?.username || 'Player'}
          />
        </div>
      </div>
    </div>
  );
}