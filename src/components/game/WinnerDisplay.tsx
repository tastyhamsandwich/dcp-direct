import React, { useEffect, useState, useRef } from 'react';
import useClickOutside from '@hooks/useClickOutside';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface WinnerInfo {
  playerId: string;
  playerName: string;
  amount: number;
  potType: string;
  hand?: string;
  cards?: string[];
}

interface WinnerDisplayProps {
  winners: WinnerInfo[];
  showdown: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const WinnerDisplay = ({ winners, showdown, isOpen, onClose }: WinnerDisplayProps) => {
  const winnerRef = useRef(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Play win sound
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.4;
      audio.play().catch(err => console.log('Audio play failed:', err));
      
      // Activate confetti
      setConfettiActive(true);
      const timer = setTimeout(() => setConfettiActive(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useClickOutside(winnerRef, onClose);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 0.4, 
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    },
    exit: { 
      opacity: 0, 
      scale: 0.8,
      transition: { duration: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.3 }
    }
  };

  const titleVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: [1, 1.2, 1], 
      opacity: 1,
      color: ["#FBBF24", "#FEF3C7", "#FBBF24"],
      transition: { 
        duration: 1.5,
        repeat: 2,
        repeatType: "reverse" as const
      }
    }
  };

  const amountVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: [1, 1.1, 1],
      transition: { 
        duration: 0.8,
        repeat: Infinity,
        repeatType: "reverse" as const
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            ref={winnerRef}
            className="bg-gray-800 border-2 border-yellow-500 rounded-lg p-6 max-w-2xl w-full mx-4 shadow-lg"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div className="text-center mb-4" variants={itemVariants}>
              <motion.h2 
                className="text-2xl font-bold text-yellow-400"
                variants={titleVariants}
              >
                {winners.length === 1 ? 'Winner!' : 'Winners!'}
              </motion.h2>
            </motion.div>
            
            {/* Quick summary - always visible */}
            <motion.div className="space-y-4">
              {winners.map((winner, index) => (
                <motion.div 
                  key={index} 
                  className="bg-gray-700 rounded-lg p-4"
                  variants={itemVariants}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: 0.3 + (index * 0.1) }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium text-lg">{winner.playerName}</span>
                    <motion.span 
                      className="text-yellow-300 font-bold text-xl"
                      variants={amountVariants}
                    >
                      +{winner.amount} chips
                    </motion.span>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Detailed results button */}
            {showdown && (
              <motion.div 
                className="mt-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-blue-400 hover:text-blue-300 underline text-sm"
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </motion.div>
            )}

            {/* Detailed results - collapsible */}
            <AnimatePresence>
              {showDetails && showdown && (
                <motion.div 
                  className="mt-4 space-y-4"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {winners.map((winner, index) => (
                    <motion.div 
                      key={`details-${index}`}
                      className="bg-gray-700/50 rounded-lg p-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <div className="text-white font-medium mb-1">{winner.hand}</div>
                      {winner.cards && (
                        <div className="flex space-x-1">
                          {winner.cards.map((card, cardIndex) => (
                            <motion.div 
                              key={cardIndex} 
                              className="w-10 h-14 relative"
                              initial={{ opacity: 0, rotateY: 90 }}
                              animate={{ opacity: 1, rotateY: 0 }}
                              transition={{ delay: 0.1 * cardIndex }}
                            >
                              <Image 
                                src={`/assets/cards_en/${card}.png`}
                                alt={card || 'playing card'}
                                width={40}
                                height={56}
                                className="rounded"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/assets/cardback.png';
                                }}
                              />
                            </motion.div>
                          ))}
                        </div>
                      )}
                      <div className="text-gray-300 text-sm mt-2">{winner.potType}</div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div 
              className="mt-6 text-center"
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.8 }}
            >
              <motion.button 
                onClick={onClose}
                className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded transition"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Continue
              </motion.button>
            </motion.div>

            {confettiActive && (
              <div className="confetti-container absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(40)].map((_, i) => {
                  const size = Math.random() * 10 + 5;
                  const left = Math.random() * 100;
                  const animDur = Math.random() * 3 + 2;
                  const delay = Math.random() * 0.5;
                  const color = ['#FFD700', '#FF6347', '#4169E1', '#32CD32', '#FF69B4'][Math.floor(Math.random() * 5)];
                  
                  return (
                    <motion.div
                      key={i}
                      className="absolute rounded-full"
                      style={{
                        width: size + 'px',
                        height: size + 'px',
                        left: left + '%',
                        top: -20,
                        backgroundColor: color
                      }}
                      initial={{ y: -20 }}
                      animate={{ 
                        y: ['0%', '100%'],
                        x: ['-10%', '10%', '-5%', '5%', '0%'],
                        rotate: [0, 360],
                      }}
                      transition={{
                        duration: animDur,
                        delay: delay,
                        ease: "easeOut"
                      }}
                    />
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WinnerDisplay;