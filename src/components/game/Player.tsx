import React from 'react';
import Card from './Card';
import './player.modules.css';

const Player = ({ player, isActive, isCurrentPlayer, role, roundActive = false }) => {
  const { name, chips, cards, folded, currentBet } = player;
  
  const isDealer = (role === 1 || role === 4);
  const isSmallBlind = (role === 2);
  const isBigBlind = (role === 3 || role === 4);

  // Only show currentBet as a separate bet indicator if we're in an active round 
  // AND it's not just the initial blind posting
  const showBet = currentBet > 0 && roundActive && 
    ((isSmallBlind && player.previousAction !== 'none') || 
     (isBigBlind && player.previousAction !== 'none') ||
     (!isSmallBlind && !isBigBlind));

  return (
    <div className={`outer-container ${folded ? 'opacity-50' : ''}`}>
      <div className="player-container">
        
        <div className="player-info">
          <div className={`player-name ${isActive ? 'text-white' : 'text-gray-600'}`}>{name}</div>
          <div className="player-chips">{chips}
            <div className="button-container">
              {isDealer && <div className="dealer-button">D</div>}
              {isSmallBlind && <div className="smallblind-button">S</div>}
              {isBigBlind && <div className="bigblind-button">B</div>}
            </div>
          </div>
          {showBet && <div className="player-bet">{currentBet}</div>}
        </div>
      </div>
      <div className="player-cards">
        {cards.map((card, index) => (
          <Card
            scaleFactor={0.75}
            key={index} 
            rank={card.rank} 
            suit={card.suit} 
            faceDown={!isCurrentPlayer && !folded} 
          />
        ))}
      </div>
    </div>
  );
};

export default Player;