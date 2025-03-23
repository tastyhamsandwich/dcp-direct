import React from 'react';
import { generateNewGameId } from '@game/gameLogic';
import CreateGameButton from '@comps/game/lobby/CreateGame';

const Lobby = ({games, onCreateGame, onJoinGame, username, userId}) => {

  if (!games) {
    return <div>Loading...</div>;
  }
  else
  if (games.length === 0) {
    return (
      <div>
        <h2>Game List</h2>
        <p>No games available. Create one below!</p>
        <button onClick={() => onCreateGame()}>Create Game</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Game List</h2>
      <ul>
        {games.map((game, index) => (
          <li key={index}>
            <span>{game.name}</span><span>{game.players.length}/{game.maxPlayers}</span><button onClick={() => onJoinGame(game.id)}>Join Game</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Lobby;