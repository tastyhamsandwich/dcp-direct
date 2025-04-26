'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';
import Lobby from '@comps/game/lobby/Lobby';
import { User, ListEntry } from '@game/types';
import { io, type Socket } from 'socket.io-client';
import { SeatSelector } from '@comps/game/SeatSelector';

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
    // const socketInstance = io('http://randomencounter.ddns.net:3001', {
    const socketInstance = io('localhost:3001', {
      transports: ['websocket'],
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
      alert(`Error: ${error.message}`);
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
      },
      gameVariant: gameData.gameVariant || 'TexasHoldEm' // Include the selected game variant
    });
  };
  
  const handleJoinGame = (gameId) => {
    if (!gameId || !profile || !socket) return;

    /*socket.emit('get_seat_info', { gameId });

    socketInstance.on('seat_info', (seatInfo) => {
      console.log('Seat info received:', seatInfo);
      const occupiedSeats = seatInfo.seats.map((seat, index) => ({
        seatNumber: index,
        occupied: seat.occupied,
        playerName: seat.playerName || null
      }));
      
      // Open the seat selector dialog
      setSeatSelectorOpen(true);
      setOccupiedSeats(occupiedSeats);
    })*/
    router.push(`/game/${gameId}`);
  };
  
  // Show loading state
  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
      <div className="animate-pulse">Loading...</div>
    </div>;
  }
  
  // Show error if not authenticated
  if (!user || !profile) {
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">Authentication Required</h2>
        <p className="mb-4">You must be logged in to access the game lobby.</p>
        <button 
          onClick={() => router.push('/login')}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 rounded"
        >
          Go to Login
        </button>
      </div>
    </div>;
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <div className="container mx-auto p-4">
        <div className="bg-gray-800 border-l-4 border-blue-700 p-4 mb-6 rounded">
          <p className="text-gray-200">
            {isConnected 
              ? '✅ Connected to game server' 
              : '❌ Disconnected from game server'}
          </p>
        </div>
        
        <h1 className="text-3xl font-bold mb-6 text-gray-100">Poker Game Lobby</h1>
        
        <Lobby
          games={gamesList}
          profile={profile}
          socket={socket}
          onJoinGame={handleJoinGame}
          onCreateGame={handleCreateGame}
        />
      </div>
    </div>
  );
}