import React, { useState, useEffect } from 'react';
import Card from './Card';
import Deck from './Deck';
import Player from './Player';
import { motion, AnimatePresence } from 'framer-motion';

interface TableProps {
  gameState: any;
  currentPlayerId?: string;
  onAction: any;
}

const Table: React.FC<TableProps> = ({ gameState, currentPlayerId, onAction }) => {
  const { players, communityCards, pot, currentTurn, dealerIndex, smallBlindIndex, bigBlindIndex, roundActive } = gameState;
  const [prevPot, setPrevPot] = useState<number>(pot);
  const [prevCommunityCardCount, setCommunityCardCount] = useState<number>(communityCards.length);
  const [potChange, setPotChange] = useState<boolean>(false);
  const [newCardsDealt, setNewCardsDealt] = useState<boolean>(false);

  // Handle pot changes for animation
  useEffect(() => {
    if (prevPot !== pot) {
      setPotChange(true);
      const timer = setTimeout(() => {
        setPotChange(false);
        setPrevPot(pot);
      }, 1000);
      
      // Play chip sound when pot increases
      if (pot > prevPot) {
        const audio = new Audio('/assets/sounds/chip_sound.mp3');
        audio.volume = 0.3;
        audio.play().catch(err => console.log('Audio play failed:', err));
      }

      return () => clearTimeout(timer);
    }
  }, [pot, prevPot]);

  // Detect new community cards being dealt
  useEffect(() => {
    if (communityCards.length > prevCommunityCardCount) {
      setNewCardsDealt(true);
      const timer = setTimeout(() => {
        setNewCardsDealt(false);
        setCommunityCardCount(communityCards.length);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [communityCards.length, prevCommunityCardCount]);

  // Animation variants
  const potVariants = {
    normal: { scale: 1, color: "#ffffff" },
    highlight: { scale: 1.2, color: "#ffd700", transition: { duration: 0.3 } }
  };

  // Calculate player positions in a circle
  const getPlayerPosition = (index, totalPlayers) => {
    return {
      top: `${50 - 40 * Math.cos(2 * Math.PI * index / totalPlayers)}%`,
      left: `${50 + 40 * Math.sin(2 * Math.PI * index / totalPlayers)}%`,
    };
  };

  return (
    <div className="poker-table bg-green-800 rounded-full w-full max-w-4xl h-96 relative mx-auto">
      {/* Community cards */}
      <div className="deck-image">
        <Deck scaleFactor={1} />
      </div>
      <div className="community-cards absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
        <AnimatePresence mode="wait">
          {(communityCards && communityCards.length > 0) && communityCards.map((card, index) => (
            <Card 
              scaleFactor={1} 
              key={index} 
              rank={card.rank} 
              suit={card.suit} 
              index={index}
              animate={index >= prevCommunityCardCount || newCardsDealt}
            />
          ))}
        </AnimatePresence>
      </div>
      
      {/* Pot */}
      <motion.div 
        className="pot absolute top-1/3 left-1/2 transform -translate-x-1/2 text-white font-bold"
        variants={potVariants}
        animate={potChange ? 'highlight' : 'normal'}
      >
        Pot: {pot}
      </motion.div>
      
      {/* Players positioned around the table */}
      <div className="players-container">
        {players.map((player, index) => {
          let role = 0;

          if (dealerIndex === index && bigBlindIndex === index)
            role = 4;
          else if (dealerIndex === index)
            role = 1;
          else if (smallBlindIndex === index)
            role = 2;
          else if (bigBlindIndex === index)
            role = 3;
          
          const position = getPlayerPosition(index, players.length);

          return (
            <motion.div 
              key={player.id}
              className={`player-${index} absolute`} 
              style={position}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                boxShadow: currentTurn === player.id ? 
                  "0px 0px 20px rgba(255,215,0,0.5)" : 
                  "none" 
              }}
              transition={{ 
                duration: 0.5, 
                delay: index * 0.1
              }}
            >
              <Player 
                player={player} 
                isCurrentPlayer={player.id === currentPlayerId}
                isActive={currentTurn === player.id}
                role={role}
                roundActive={roundActive}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Table;