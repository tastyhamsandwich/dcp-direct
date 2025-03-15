'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';
import Lobby from '@comps/ui/Lobby';

export default function GameLobby() {
  const { user, profile, loading } = useAuth();
  const [gamesList, setGamesList] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
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
    const ws = new WebSocket(`ws://${window.location.host}/api/socket/lobby`);
    setSocket(ws);
    
    // Connection opened
    ws.addEventListener('open', () => {
      setIsConnected(true);
      
      // Request games list on connection
      ws.send(JSON.stringify({
        type: 'get_games_list'
      }));
    });
    
    // Listen for messages
    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'games_list':
            setGamesList(data.games || []);
            break;
          case 'game_created':
            router.push(`/game/${data.gameId}`);
            break;
          case 'error':
            console.error('Socket error:', data.message);
            alert(data.message);
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    // Listen for errors
    ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    });
    
    // Connection closed
    ws.addEventListener('close', () => {
      setIsConnected(false);
    });
    
    // Clean up
    return () => {
      ws.close();
    };
  }, [user, profile, router]);
  
  const handleCreateGame = (settings) => {
    if (!socket || !isConnected || !user) return;
    
    socket.send(JSON.stringify({
      type: 'create_game',
      userId: user.id,
      username: profile?.username,
      settings
    }));
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
      />
    </div>
  );
}
