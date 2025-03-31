import React from 'react';
import Card from './Card';
import Deck from './Deck';
import Player from './Player';

const Table = ({ gameState, currentPlayerId, onAction }) => {
  const { players, communityCards, pot, currentTurn, dealerIndex, smallBlindIndex, bigBlindIndex, roundActive } = gameState;

  return (
    <div className="poker-table bg-green-800 rounded-full w-full max-w-4xl h-96 relative mx-auto">
      {/* Community cards */}
      <div className="deck-image">
        <Deck scaleFactor={1} />
      </div>
      <div className="community-cards absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
        {communityCards.map((card, index) => (
          <Card scaleFactor={1} key={index} rank={card.rank} suit={card.suit} />
        ))}
      </div>
      
      {/* Pot */}
      <div className="pot absolute top-1/3 left-1/2 transform -translate-x-1/2 text-white font-bold">
        Pot: {pot}
      </div>
      
      {/* Players positioned around the table */}
      <div className="players-container">
        {players.map((player, index) => {
          let role =  0;

          if (dealerIndex === index && bigBlindIndex === index)
            role = 4;
          else if (dealerIndex === index)
            role = 1;
          else if (smallBlindIndex === index)
            role = 2;
          else if (bigBlindIndex === index)
            role = 3;
          

          return (
            <div key={player.id} className={`player-${index} absolute`} style={{ 
              // Position players in a circle around the table
              top: `${50 - 40 * Math.cos(2 * Math.PI * index / players.length)}%`,
              left: `${50 + 40 * Math.sin(2 * Math.PI * index / players.length)}%`,
            }}>
              <Player 
                player={player} 
                isCurrentPlayer={player.id === currentPlayerId}
                isActive={currentTurn === player.id}
                role={role}
                roundActive={roundActive}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Table;