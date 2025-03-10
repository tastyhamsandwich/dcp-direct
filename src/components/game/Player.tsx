import React from 'react';
import Card from './Card';
import Actions from './Actions';

const Player = ({ player, isCurrentPlayer, isActive, isDealer, onAction }) => {
  const { name, chips, cards, bet, folded } = player;
  
  return (
    <div className={`player-container ${folded ? 'opacity-50' : ''}`}>
      {isDealer && <div className="dealer-button bg-white rounded-full text-xs p-1">D</div>}
      
      <div className="player-info bg-gray-800 text-white p-2 rounded-lg">
        <div className="player-name">{name}</div>
        <div className="player-chips">${chips}</div>
        {bet > 0 && <div className="player-bet bg-yellow-500 text-black rounded px-2">${bet}</div>}
      </div>
      
      <div className="player-cards flex gap-1 mt-2">
        {cards.map((card, index) => (
          <Card 
            key={index} 
            rank={card.rank} 
            suit={card.suit} 
            faceDown={!isCurrentPlayer && !folded} 
          />
        ))}
      </div>
      
      {isActive && isCurrentPlayer && (
        <Actions 
          canCheck={player.canCheck}
          currentBet={player.currentBet}
          minRaise={player.minRaise}
          playerChips={chips}
          onAction={onAction}
        />
      )}
    </div>
  );
};

export default Player;