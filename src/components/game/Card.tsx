import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { capitalize } from '@lib/utils';
import { rankToNumStr, suitNameToInitial } from '@game/utils';
import { motion } from 'framer-motion';
import { type Suit } from "@game/types";

interface CardProps {
  scaleFactor: number;
  rank: string;
  suit: string;
  faceDown?: boolean;
  index?: number;
  animate?: boolean;
}

const Card: React.FC<CardProps> = ({ 
  scaleFactor, 
  rank, 
  suit, 
  faceDown = false, 
  index = 0,
  animate = true
}) => {
  const [hasMounted, setHasMounted] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [isFlipped, setIsFlipped] = useState(faceDown);

  const baseCardWidth = 142;
  const baseCardHeight = 212;

  const finalCardWidth = (baseCardWidth / 2) * scaleFactor;
  const finalCardHeight = (baseCardHeight / 2) * scaleFactor;
  
  // Convert 'four' to '4', 'spades' to 'S', etc...
  let rankNum: string = rankToNumStr(rank);
  let safeSuit = typeof suit === "string" && suit ? suit : "hearts";
  let suitLetter: string = suitNameToInitial(safeSuit as Suit);
  const cardSrc = `/assets/cards_en/${rankNum}${suitLetter}.png`;

  useEffect(() => {
    // Play sound when card is dealt
    if (animate && !hasMounted) {
      const audio = new Audio('/assets/sounds/card_flip.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => console.log('Audio play failed:', err));
      setHasMounted(true);
    }
  }, [animate, hasMounted]);

  // Handle changes to faceDown prop
  useEffect(() => {
    if (hasMounted && isFlipped !== faceDown) {
      setFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipped(faceDown);
        setFlipping(false);
      }, 200); // Half of the flip animation duration
      
      return () => clearTimeout(timer);
    }
  }, [faceDown, hasMounted, isFlipped]);

  const initialAnimation = animate ? {
    scale: [0.5, 1],
    opacity: [0, 1],
    rotateY: [90, 0],
    x: [50, 0]
  } : {};

  const transitionProps = animate ? {
    delay: index * 0.1,
    duration: 0.4,
    ease: "easeOut"
  } : {};

  const flipAnimation = {
    rotateY: flipping ? 90 : 0
  };

  const flipTransition = {
    duration: 0.4,
    ease: "easeInOut"
  };

  return (
    <motion.div
      initial={animate ? { scale: 0.5, opacity: 0, x: 50 } : {}}
      animate={flipping ? flipAnimation : initialAnimation}
      transition={flipping ? flipTransition : transitionProps}
      className="card-container"
    >
      <Image 
        src={isFlipped ? '/assets/cardback.png' : cardSrc} 
        width={finalCardWidth} 
        height={finalCardHeight} 
        alt={isFlipped ? 'A playing card' : `${rank} of ${suit}`} 
      />
    </motion.div>
  );
};

export default Card;