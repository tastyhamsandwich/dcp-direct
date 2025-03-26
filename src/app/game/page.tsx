'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';
import Lobby from '@comps/game/lobby/Lobby';
import { User, ListEntry } from '@game/pokerLogic';
import { io, type Socket } from 'socket.io-client';

export default function GameLobby() {
  const { user, profile, loading } = useAuth();
  const [gamesList, setGamesList] = useState<ListEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const router = useRouter();
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (!user || !profile) return;
    
    // Initialize WebSocket connection to the socket.io server running on port 3001
    const socketInstance = io('http://localhost:3001', {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    setSocket(socketInstance);
    
    socketInstance.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
      
      // Register with server upon connection
      socketInstance.emit('register', { profile });
    });

    socketInstance.on('registration_success', (data) => {
      console.log('Registration successful:', data);

      // Request games list upon successful registration
      socketInstance.emit('get_games_list');
    });
    
    socketInstance.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });
    
    socketInstance.on('games_list', (games) => {
      console.log('Games list received:', games);
      setGamesList(games || []);
    });
      
    socketInstance.on('game_created', ({ gameId }) => {
      console.log('Game created, redirecting to:', gameId);
      router.push(`/game/${gameId}`);
    });

    socketInstance.on('error', (error) => {
      console.error('Socket error:', error.message);
      // Implement error handling UI here
    });
    
    return () => {
      socketInstance.disconnect();
    };
  }, [user, profile, router]);
  
  const handleCreateGame = (gameData) => {
    if (!socket || !isConnected || !profile) return;
    
    console.log('Creating game with settings:', gameData);
    socket.emit('create_game', {
      tableName: gameData.name,
      creator: gameData.player,
      maxPlayers: gameData.maxPlayers,
      blinds: {
        small: gameData.smallBlind,
        big: gameData.smallBlind * 2
      }
    });
  };
  
  const handleJoinGame = (gameId) => {
    if (!gameId || !profile) return;
    router.push(`/game/${gameId}`);
  };
  
  // Show loading state
  if (loading) {
    return <div className="text-center p-10">Loading...</div>;
  }
  
  // Show error if not authenticated
  if (!user || !profile) {
    return <div className="text-center p-10">You must be logged in to access the game lobby.</div>;
  }
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Poker Game Lobby</h1>
      <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-4">
        <p className="text-blue-700">
          {isConnected 
            ? '✅ Connected to game server' 
            : '❌ Disconnected from game server'}
        </p>
      </div>
      
      <Lobby
        games={gamesList}
        profile={profile}
        socket={socket}
        onJoinGame={handleJoinGame}
        onCreateGame={handleCreateGame}
      />
    </div>
  );
}