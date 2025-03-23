'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';
import Lobby from '@comps/game/lobby/Lobby';
import CreateGameButton from '@comps/game/lobby/CreateGame';
import type { GameList, GameRoom, ExtendedWebSocket, WSMessageType, WSMessage, WSJoinGame, WSPlayerAction, WSStartRound, WSChatMessage, WSGetGamesList, WSGamesList, WSCreateGame } from '@lib/socketTypes';
import { io, type Socket } from 'socket.io-client';

export default function GameLobby() {
  const { user, profile, loading } = useAuth();
  const [gamesList, setGamesList] = useState<GameList>([]);
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
    // Only initialize socket after authentication
    if (!user || !profile) return;
    
    // Initialize WebSocket connection
    const socket = io();
    setSocket(socket);
    
    // Connection opened
    socket.on('open', () => {
      setIsConnected(true);
      
      // Request games list on connection
    socket.send('get_games_list');
    });
    
    // Listen for messages
    socket.on('games_list', (gamesList) => {
      setGamesList(gamesList);
    });
      
    socket.on('game_created', (gameId) => {
      router.push(`/game/${gameId}`);
    });

    socket.on('error', (message) => {
      console.error(`Socket error: ${message}`);
    });
          
    // Connection closed
    socket.on('close', () => {
      setIsConnected(false);
    });
    
    // Clean up
    return () => {
      socket.close();
    };
  }, [user, profile, router]);
  
  const handleCreateGame = (settings) => {
    if (!socket || !isConnected || !user) return;
    
    socket.send('create_game', {
      name: settings.name,
      creator: settings.player,
      maxPlayers: settings.maxPlayers || 6,
      blinds: settings.blinds
    });
  };
  
  const handleJoinGame = (gameId) => {
    if (!gameId || !user) return;
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
      
      <Lobby
        games={gamesList}
        onCreateGame={handleCreateGame}
        onJoinGame={handleJoinGame}
        username={profile.username}
        userId={profile.id}
      />
      <CreateGameButton formAction={handleCreateGame}/>
    </div>
  );
}
