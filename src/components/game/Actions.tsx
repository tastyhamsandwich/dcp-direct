import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionsProps {
  roundStatus: string;
  canCheck: boolean;
  gameCurrentBet: number;
  playerCurrentBet: number;
  minRaise: number;
  playerChips: number;
  onAction: (actionType: string, amount?: number) => void;
  isActive: boolean; // Add this prop to enable/disable buttons based on turn
  allowedActions?: string[]; // Optional array of allowed actions
  isPlayerReady?: boolean; // Whether this player is ready for the next round
}

const Actions: React.FC<ActionsProps> = ({ 
  roundStatus, 
  canCheck, 
  gameCurrentBet, 
  playerCurrentBet,
  minRaise, 
  playerChips, 
  onAction,
  isActive,
  allowedActions = ['fold', 'check', 'call', 'bet', 'raise'],
  isPlayerReady = false
}) => {
  const [raiseAmount, setRaiseAmount] = useState<number>(minRaise);
  const [isReady, setIsReady] = useState<boolean>(isPlayerReady);
  const [prevIsActive, setPrevIsActive] = useState<boolean>(isActive);

  // Update raise amount when minimum changes
  useEffect(() => {
    setRaiseAmount(minRaise);
  }, [minRaise]);

  // Sync ready state with props
  useEffect(() => {
    setIsReady(isPlayerReady);
  }, [isPlayerReady]);

  // Play sound when it becomes the player's turn
  useEffect(() => {
    if (!prevIsActive && isActive) {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.2;
      audio.play().catch(err => console.log('Audio play failed:', err));
    }
    setPrevIsActive(isActive);
  }, [isActive, prevIsActive]);

  const toggleReady = () => {
    onAction('toggleReady');
    // Don't manually set isReady here - we'll let the server update it
    // and then sync through props for consistency
  }

  // Check if an action is allowed
  const isActionAllowed = (action: string) => {
    return allowedActions.includes(action);
  }

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.3,
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0,
      y: 20,
      transition: { duration: 0.2 }
    }
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { duration: 0.2 }
    }
  };

  const activePlayerHighlight = {
    hidden: { boxShadow: "0px 0px 0px rgba(59, 130, 246, 0)" },
    visible: { 
      boxShadow: isActive 
        ? "0px 0px 15px rgba(59, 130, 246, 0.7)" 
        : "0px 0px 0px rgba(59, 130, 246, 0)"
    }
  };

  if (roundStatus === 'waiting') {
    return (
      <motion.div 
        className="player-actions bg-gray-900 p-2 rounded-lg mt-2"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.button 
          onClick={toggleReady}
          className={`px-4 py-2 rounded text-white ${isReady ? 'bg-blue-600' : 'bg-red-600'}`}
          variants={buttonVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isReady ? 'Ready' : 'Not Ready'}
        </motion.button>
      </motion.div>
    )
  } else {
    return (
      <motion.div 
        className="player-actions bg-gray-900 p-2 rounded-lg mt-2"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        variants={activePlayerHighlight}
      >
        <AnimatePresence>
          {!isActive && (
            <motion.div 
              className="text-gray-400 text-center mb-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Waiting for your turn...
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          className="action-buttons flex gap-2"
          variants={containerVariants}
        >
          <motion.button 
            className={`bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded ${!isActive || 
!isActionAllowed('fold') ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={() => isActive && isActionAllowed('fold') && onAction('fold')}
            disabled={!isActive || !isActionAllowed('fold')}
            variants={buttonVariants}
            whileHover={isActive ? { scale: 1.05 } : {}}
            whileTap={isActive ? { scale: 0.95 } : {}}
          >
            Fold
          </motion.button>

          <AnimatePresence mode="wait">
            {canCheck ? (
              <motion.button 
                key="check-button"
                className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded ${!isActive || 
!isActionAllowed('check') ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isActive && isActionAllowed('check') && onAction('check')}
                disabled={!isActive || !isActionAllowed('check')}
                variants={buttonVariants}
                whileHover={isActive ? { scale: 1.05 } : {}}
                whileTap={isActive ? { scale: 0.95 } : {}}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                Check
              </motion.button>
            ) : (
              <motion.button 
                key="call-button"
                className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded ${!isActive || 
!isActionAllowed('call') ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => isActive && isActionAllowed('call') && onAction('call', gameCurrentBet)}
                disabled={!isActive || !isActionAllowed('call')}
                variants={buttonVariants}
                whileHover={isActive ? { scale: 1.05 } : {}}
                whileTap={isActive ? { scale: 0.95 } : {}}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                Call {gameCurrentBet - playerCurrentBet}
              </motion.button>
            )}
          </AnimatePresence>

          <motion.div 
            className="raise-action flex flex-col w-full"
            variants={buttonVariants}
          >
            <motion.input
              type="range"
              min={minRaise}
              max={playerChips}
              value={raiseAmount}
              onChange={(e) => setRaiseAmount(parseInt(e.target.value))}
              className="w-full"
              disabled={!isActive}
              initial={{ opacity: 0 }}
              animate={{ opacity: isActive ? 1 : 0.5 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div 
              className="text-gray-300 text-xs text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              Bet {raiseAmount}
            </motion.div>

            <AnimatePresence mode="wait">
              {gameCurrentBet === 0 ? (
                <motion.button 
                  key="bet-button"
                  className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mt-1 ${!isActive || 
!isActionAllowed('bet') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => isActive && isActionAllowed('bet') && onAction('bet', raiseAmount)}
                  disabled={!isActive || !isActionAllowed('bet')}
                  variants={buttonVariants}
                  whileHover={isActive ? { scale: 1.05 } : {}}
                  whileTap={isActive ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  Bet {raiseAmount}
                </motion.button>
              ) : (
                <motion.button
                  key="raise-button"
                  className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mt-1 ${!isActive || 
!isActionAllowed('raise') ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => isActive && isActionAllowed('raise') && onAction('raise', raiseAmount)}
                  disabled={!isActive || !isActionAllowed('raise')}
                  variants={buttonVariants}
                  whileHover={isActive ? { scale: 1.05 } : {}}
                  whileTap={isActive ? { scale: 0.95 } : {}}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  Raise total bet to {raiseAmount + (gameCurrentBet - playerCurrentBet)}
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
          
          <motion.div 
            className="text-xs text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
          >
            PlayerCB: {playerCurrentBet}
            GameCB: {gameCurrentBet}
          </motion.div>
        </motion.div>
      </motion.div>
    );
  };
};

export default Actions;