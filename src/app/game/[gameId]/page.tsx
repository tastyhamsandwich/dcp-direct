import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import io from 'socket.io-client';
import Table from '@comps/game/Table';
import Chat from '@comps/ui/Chat';

let socket;

export default function GameRoom() {
  const [gameState, setGameState] = useState(null as unknown as any);
  const [chatMessages, setChatMessages] = useState(['']);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();
  const { gameId } = router.query;
  
  useEffect(() => {
    if (!gameId) return;
    
    // Initialize socket connection
    const socketInitializer = async () => {
      await fetch('/api/socket');
      socket = io();
      
      socket.on('connect', () => {
        setIsConnected(true);
        
        // Join the game room
        socket.emit('join_game', { gameId });
      });
      
      socket.on('game_update', (data) => {
        setGameState(data.game);
      });
      
      socket.on('chat_message', (message) => {
        setChatMessages(prev => [...prev, message]);
      });
      
      socket.on('error', (error) => {
        alert(error.message);
        router.push('/');
      });
    };
    
    socketInitializer();
    
    return () => {
      if (socket) socket.disconnect();
    };
  }, [gameId]);
  
  const handlePlayerAction = (actionType, amount = 0) => {
    if (!socket || !isConnected) return;
    
    socket.emit('player_action', {
      gameId,
      action: { type: actionType, amount }
    });
  };
  
  const handleSendMessage = (message) => {
    if (!socket || !isConnected || !message.trim()) return;
    
    socket.emit('chat_message', {
      gameId,
      message
    });
  };
  
  if (!gameState) {
    return <div className="text-center p-10">Loading game...</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{gameState.name}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <Table
            gameState={gameState}
            currentPlayerId={localStorage.getItem('userId')}
            onAction={handlePlayerAction}
          />
        </div>
        
        <div className="lg:col-span-1">
          <Chat
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            username={localStorage.getItem('username')}
          />
        </div>
      </div>
    </div>
  );
}