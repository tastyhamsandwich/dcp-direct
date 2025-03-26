'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';
import { io, Socket } from 'socket.io-client';
import { GameState, GamePhase } from '@game/pokerLogic';

export default function GamePage({ params }: { params: { gameId: string } }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [message, setMessage] = useState('');
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Setup Socket.io connection
  useEffect(() => {
    if (!params.gameId || !user || !profile) return;
    
    // Initialize WebSocket connection to the socket.io server
    const socketInstance = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    
    setSocket(socketInstance);
    
    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to game server');
      
      // Register with server upon connection
      socketInstance.emit('register', { profile });
      
      // Join the game
      socketInstance.emit('join_game', { 
        gameId: params.gameId,
        profile 
      });
    });
    
    socketInstance.on('game_state', (data) => {
      console.log('Game state received:', data);
      setGameState(data.game);
    });
    
    socketInstance.on('player_joined', (data) => {
      console.log('Player joined:', data);
      setGameState(data.game);
    });
    
    socketInstance.on('player_left', (data) => {
      console.log('Player left:', data);
      if (data.game) {
        setGameState(data.game);
      }
    });
    
    socketInstance.on('chat_message', (data) => {
      console.log('Chat message received:', data);
      setChatMessages(prev => [...prev, data]);
    });
    
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error.message);
      alert(`Error: ${error.message}`);
    });
    
    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from game server');
    });
    
    return () => {
      socketInstance.disconnect();
    };
  }, [params.gameId, user, profile, router]);
  
  const handlePlayerAction = (actionType: string, amount: number = 0) => {
    if (!socket || !isConnected || !params.gameId) return;
    
    socket.emit('player_action', {
      gameId: params.gameId,
      action: { type: actionType, amount }
    });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socket || !isConnected || !params.gameId || !message.trim()) return;
    
    socket.emit('chat_message', {
      gameId: params.gameId,
      message: message.trim()
    });
    
    setMessage('');
  };
  
  // Show loading state
  if (loading) {
    return <div className="text-center p-10">Loading...</div>;
  }
  
  // Show error if not authenticated
  if (!user || !profile) {
    return <div className="text-center p-10">You must be logged in to play.</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-4">
        <p className="text-blue-700">
          {isConnected 
            ? '✅ Connected to game server' 
            : '❌ Disconnected from game server'}
        </p>
      </div>
      
      <h1 className="text-2xl font-bold mb-4">
        Game Room: {gameState?.name || params.gameId}
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Game Table</h2>
          
          {gameState ? (
            <div>
              <p>Status: {gameState.status}</p>
              <p>Phase: {gameState.phase}</p>
              <p>Pot: {gameState.pot}</p>
              
              <h3 className="font-medium mt-4 mb-2">Players:</h3>
              <ul className="space-y-2">
                {gameState.players.map((player, index) => (
                  <li 
                    key={player.id} 
                    className={`p-2 rounded ${player.id === socket?.id ? 'bg-blue-100' : 'bg-gray-50'}`}
                  >
                    <p>
                      {player.username} 
                      {player.id === gameState.activePlayerId && ' (Active)'}
                    </p>
                    <p>Chips: {player.chips}</p>
                    <p>Cards: {player.cards.length > 0 ? 
                      (player.id === socket?.id ? 
                        player.cards.map(card => card.name).join(', ') : 
                        '🂠 🂠') : 
                      'No cards'}</p>
                  </li>
                ))}
              </ul>
              
              {gameState.communityCards.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Community Cards:</h3>
                  <p>{gameState.communityCards.map(card => card.name).join(', ')}</p>
                </div>
              )}
              
              {gameState.activePlayerId === socket?.id && (
                <div className="mt-6 flex space-x-2">
                  <button 
                    onClick={() => handlePlayerAction('fold')}
                    className="bg-red-600 text-white px-4 py-2 rounded"
                  >
                    Fold
                  </button>
                  <button 
                    onClick={() => handlePlayerAction('check')}
                    className="bg-gray-600 text-white px-4 py-2 rounded"
                    disabled={gameState.currentBet > 0}
                  >
                    Check
                  </button>
                  <button 
                    onClick={() => handlePlayerAction('call')}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    disabled={gameState.currentBet === 0}
                  >
                    Call
                  </button>
                  <button 
                    onClick={() => handlePlayerAction('raise', 10)}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >
                    Raise 10
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p>Loading game data...</p>
          )}
        </div>
        
        <div className="lg:col-span-1 bg-white p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Chat</h2>
          
          <div className="h-64 overflow-y-auto border rounded p-2 mb-4 bg-gray-50">
            {chatMessages.length === 0 ? (
              <p className="text-gray-500">No messages yet</p>
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} className="mb-2">
                  <span className="font-medium">{msg.sender}: </span>
                  <span>{msg.message}</span>
                </div>
              ))
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="flex">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 border rounded-l px-3 py-2"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-r"
            >
              Send
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => router.push('/game')}
          className="bg-gray-600 text-white px-4 py-2 rounded"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}