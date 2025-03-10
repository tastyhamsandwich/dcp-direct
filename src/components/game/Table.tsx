import React from 'react';
import Card from './Card';
import Player from './Player';

const Table = ({ gameState, currentPlayerId, onAction }) => {
  const { players, communityCards, pot, currentTurn, dealerPosition } = gameState;
  
  return (
    <div className="poker-table bg-green-800 rounded-full w-full max-w-4xl h-96 relative mx-auto">
      {/* Community cards */}
      <div className="community-cards absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
        {communityCards.map((card, index) => (
          <Card key={index} rank={card.rank} suit={card.suit} />
        ))}
      </div>
      
      {/* Pot */}
      <div className="pot absolute top-1/3 left-1/2 transform -translate-x-1/2 text-white font-bold">
        Pot: ${pot}
      </div>
      
      {/* Players positioned around the table */}
      <div className="players-container">
        {players.map((player, index) => (
          <div key={player.id} className={`player-${index} absolute`} style={{ 
            // Position players in a circle around the table
            top: `${50 - 40 * Math.cos(2 * Math.PI * index / players.length)}%`,
            left: `${50 + 40 * Math.sin(2 * Math.PI * index / players.length)}%`,
          }}>
            <Player 
              player={player} 
              isCurrentPlayer={player.id === currentPlayerId}
              isActive={currentTurn === player.id}
              isDealer={dealerPosition === index}
              onAction={onAction}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Table;