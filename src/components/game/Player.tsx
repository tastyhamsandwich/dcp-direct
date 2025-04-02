import React from 'react';
import Card from './Card';
import './player.modules.css';
import { motion } from 'framer-motion';

interface PlayerProps {
  player: any;
  isActive: boolean;
  isCurrentPlayer: boolean;
  role: number;
  roundActive?: boolean;
}

const Player: React.FC<PlayerProps> = ({ 
  player, 
  isActive, 
  isCurrentPlayer, 
  role, 
  roundActive = false 
}) => {
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

  // Animation for player info when active
  const activeAnimation = {
    scale: isActive ? [1, 1.03, 1] : 1,
    boxShadow: isActive ? 
      "0px 0px 20px 5px rgba(255,215,0,0.5)" : 
      "0px 0px 15px 1px rgba(0,0,0,1)",
    transition: {
      duration: 0.5,
      repeat: isActive ? Infinity : 0,
      repeatType: "reverse" as const
    }
  };

  return (
    <div className={`outer-container ${folded ? 'opacity-50' : ''}`}>
      <div className="player-container">
        <motion.div 
          className="player-info"
          animate={activeAnimation}
        >
          <div className={`player-name ${isActive ? 'text-white' : 'text-gray-600'}`}>{name}</div>
          <div className="player-chips">{chips}
            <div className="button-container">
              {isDealer && <div className="dealer-button">D</div>}
              {isSmallBlind && <div className="smallblind-button">S</div>}
              {isBigBlind && <div className="bigblind-button">B</div>}
            </div>
          </div>
          {showBet && 
            <motion.div 
              className="player-bet"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentBet}
            </motion.div>
          }
        </motion.div>
      </div>
      <div className="player-cards">
        {cards.map((card, index) => (
          <Card
            scaleFactor={0.75}
            key={index}
            index={index} 
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