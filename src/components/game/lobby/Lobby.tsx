import React, { useState } from 'react';
import CreateGameModal from '@comps/game/lobby/CreateGameModal';
import { Player } from '@game/pokerLogic';
import Link from 'next/link';
import 'lobby.modules.css';

type SearchParamProps = {
  searchParams: Record<string, string> | null | undefined;
};

const Lobby = ({games, searchParams, profile, socket}) => {
  
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const show = searchParams?.show;

  let avatarUrl; 
  if (!profile) return <div>Loading...</div>;
  if (profile.avatar_url === null)
    avatarUrl = 'placeholder.png';
  else
    avatarUrl = profile.avatar_url;
    
  const username = profile.username;
  const userId = socket.id;

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
    avatar: avatarUrl
  }

  if (!games)
    return <div>Loading...</div>;
  else if (!username || !userId) {
    return (
      <div className="lobby-window">
        <div>
          <h2>Game List</h2>
          <ul>
            {games.map((game, index) => (
              <li key={index}>
                <span>{game.name}</span><span>{game.players.length}/{game.maxPlayers}</span>
              </li>
            ))}
          </ul>
        </div>
        <button className="accordion">Section 1</button>
        <>
          <Link href="/?show=true">
            Create New Game
          </Link>

          {show && <CreateGameModal />}
        </>
      </div>
    );
  }
}

export default Lobby;