import React from 'react'
import socket from '@socket';

const CreateGameButton = ({settings, disabled}) => {

  const handleCreateGame = () =>  {
    if (!socket) return;
    socket.emit('create_game', {
      name: settings.name,
      creator: settings.player,
      maxPlayers: settings.maxPlayers || 6,
      blinds: settings.blinds
    });
  }
  return (
    <button className="btn btn-primary bg-sky-700 rounded-lg shadow-xl text-white p-2" disabled={disabled} onClick={handleCreateGame}>
      Create Game
    </button>
  );
}

export default CreateGameButton;