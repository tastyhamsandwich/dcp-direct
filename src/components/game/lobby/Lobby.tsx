import React, { useState } from 'react';
import { Player } from '@game/classes';
import { ListEntry } from '@game/types';
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
  const [showModal, setShowModal] = useState<boolean>(false);
  
  if (!profile || !socket) return (
    <div className="flex justify-center items-center h-64 bg-gray-800 rounded-lg">
      <div className="animate-pulse text-gray-400">Loading lobby data...</div>
    </div>
  );
  
  const username = profile.username;
  const userId = socket.id;
  
  // Create player object for game creation
  const player: Player = new Player(userId, username, 0, profile.balance, profile.avatar_url);
  
  /*{
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
  };*/

  const handleCreateGameSubmit = (gameData: any) => {
    onCreateGame({
      ...gameData,
      player
    });
    setShowModal(false);
  };

  return (
    <div className="w-2/3 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-gray-100">Available Games</h2>
          <div className="text-sm text-gray-400">
            Logged in as <span className="text-blue-400 font-medium">{username}</span>
          </div>
        </div>
        
        {games.length === 0 ? (
          <div className="flex flex-col items-center justify-center bg-gray-700 p-8 rounded-lg mb-6">
            <p className="text-gray-300 mb-4 text-center">No games available. Create a new game to start playing!</p>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-3 max-w-64 min-w-12 rounded-lg transition duration-150"
            >
              Create First Game
            </button>
          </div>
        ) : (
          <div className="mb-6">
            <ul className="divide-y divide-gray-700">
              {games.map((game) => (
                <li key={game.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-gray-700 p-4 rounded-lg hover:bg-gray-650 transition duration-150">
                    <div className="mb-3 md:mb-0">
                      <h3 className="font-medium text-lg text-gray-100">{game.name}</h3>
                      <div className="mt-1 flex items-center">
                        <span className="text-sm text-gray-400 mr-4">
                          Players: {game.playerCount}/{game.maxPlayers}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${game.isStarted ? 'bg-green-900 text-green-200' : 'bg-blue-900 text-blue-200'}`}>
                          {game.isStarted ? 'In Progress' : 'Waiting'}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => onJoinGame(game.id)}
                      className={`px-4 py-2 rounded-md font-medium transition duration-150 ${
                        game.isStarted || game.playerCount >= game.maxPlayers
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-blue-700 hover:bg-blue-800 text-white'
                      }`}
                      disabled={game.isStarted || game.playerCount >= game.maxPlayers}
                    >
                      {game.isStarted 
                        ? 'Game in Progress' 
                        : game.playerCount >= game.maxPlayers 
                          ? 'Game Full' 
                          : 'Join Game'
                      }
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="pt-4 flex mx-auto border-t border-gray-700">
          <button 
            onClick={() => setShowModal(true)}
            className="w-full bg-green-700 hover:bg-green-800 text-white font-medium py-3 min-w-12 max-w-64 mx-auto rounded-lg transition duration-150"
          >
            Create New Game
          </button>
        </div>
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