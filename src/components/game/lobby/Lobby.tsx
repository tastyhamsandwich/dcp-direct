import React, { useState } from 'react';
import { Player, ListEntry } from '@game/pokerLogic';
import CreateGameModal from './CreateGameModal';
import './lobby.modules.css';

interface LobbyProps {
  games: ListEntry[];
  profile: any;
  socket: any;
  onJoinGame: (gameId: string) => void;
  onCreateGame: (gameData: any) => void;
}

const Lobby: React.FC<LobbyProps> = ({ 
  games = [], 
  profile, 
  socket, 
  onJoinGame,
  onCreateGame 
}) => {
  const [showModal, setShowModal] = useState(false);
  
  if (!profile || !socket) return <div>Loading...</div>;
  
  const username = profile.username;
  const userId = socket.id;
  
  // Create player object for game creation
  const player: Player = {
    id: userId,
    seatNumber: 0,
    username: username,
    chips: profile.balance,
    cards: [],
    currentBet: 0,
    folded: false,
    active: true,
    ready: false,
    allIn: false,
    previousAction: 'none',
    avatar: profile.avatar_url || '/public/assets/default_avatar.png'
  };

  const handleCreateGameSubmit = (gameData: any) => {
    onCreateGame({
      ...gameData,
      player
    });
    setShowModal(false);
  };

  return (
    <div className="lobby-container">
      <div className="games-list">
        <h2 className="text-xl font-semibold mb-4">Available Games</h2>
        
        {games.length === 0 ? (
          <p className="text-gray-500">No games available. Create a new game to start playing!</p>
        ) : (
          <ul className="space-y-2">
            {games.map((game) => (
              <li key={game.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{game.name}</h3>
                  <p className="text-sm text-gray-600">
                    Players: {game.playerCount}/{game.maxPlayers}
                  </p>
                </div>
                <button 
                  onClick={() => onJoinGame(game.id)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  disabled={game.isStarted || game.playerCount >= game.maxPlayers}
                >
                  {game.isStarted ? 'Game in Progress' : 'Join Game'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      
      <div className="create-game mt-6">
        <button 
          onClick={() => setShowModal(true)}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg"
        >
          Create New Game
        </button>
      </div>
      
      {showModal && (
        <CreateGameModal 
          onClose={() => setShowModal(false)} 
          onSubmit={handleCreateGameSubmit}
          player={player}
        />
      )}
    </div>
  );
};

export default Lobby;