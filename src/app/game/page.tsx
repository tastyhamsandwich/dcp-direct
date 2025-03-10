import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useRouter } from 'next/router';
import Lobby from '@comps/ui/Lobby';

let socket;

export default function Home() {
  const [username, setUsername] = useState('');
  const [gamesList, setGamesList] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const router = useRouter();
  
  useEffect(() => {
    // Initialize socket connection
    const socketInitializer = async () => {
      await fetch('/api/socket');
      socket = io();
      
      socket.on('connect', () => {
        setIsConnected(true);
      });
      
      socket.on('games_list', (data) => {
        setGamesList(data.games);
      });
      
      socket.on('registration_success', (data) => {
        localStorage.setItem('userId', data.user.id);
        localStorage.setItem('username', data.user.username);
      });
      
      socket.on('game_created', (data) => {
        router.push(`/game/${data.gameId}`);
      });
    };
    
    socketInitializer();
    
    return () => {
      if (socket) socket.disconnect();
    };
  }, []);
  
  const handleRegister = () => {
    if (username.trim()) {
      socket.emit('register', { username });
    }
  };
  
  const handleCreateGame = (settings) => {
    socket.emit('create_game', settings);
  };
  
  const handleJoinGame = (gameId) => {
    socket.emit('join_game', { gameId });
    router.push(`/game/${gameId}`);
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Poker Game Lobby</h1>
      
      {!localStorage.getItem('username') ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Register to Play</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={handleRegister}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Register
            </button>
          </div>
        </div>
      ) : (
        <Lobby
          games={gamesList}
          onCreateGame={handleCreateGame}
          onJoinGame={handleJoinGame}
          username={localStorage.getItem('username')}
        />
      )}
    </div>
  );
}
