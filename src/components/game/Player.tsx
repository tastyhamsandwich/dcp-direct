import React from "react";
import Card from "./Card";
import "./player.modules.css";
import { motion } from "framer-motion";
import Image from 'next/image';
import { getUsernameColor } from '@lib/utils';

interface PlayerProps {
	player: {
		id: string;
		name: string;
		chips: number;
		cards: any[];
		folded: boolean;
		currentBet: number;
		previousAction?: string;
	};
	isActive: boolean;
	isCurrentPlayer: boolean;
	role: number;
	roundActive?: boolean;
	isWinner?: boolean;
}

const Player: React.FC<PlayerProps> = ({
	player,
	isActive,
	isCurrentPlayer,
	role,
	roundActive = false,
	isWinner = false,
}) => {
	const { name, chips, cards, folded, currentBet } = player;

	const isDealer = role === 1 || role === 4;
	const isSmallBlind = role === 2;
	const isBigBlind = role === 3 || role === 4;

	// Only show currentBet as a separate bet indicator if we're in an active round
	// AND it's not just the initial blind posting
	const showBet =
		currentBet > 0 &&
		roundActive &&
		((isSmallBlind && player.previousAction !== "none") ||
			(isBigBlind && player.previousAction !== "none") ||
			(!isSmallBlind && !isBigBlind));

	return (
    <div className="outer-container">
      <motion.div
        className={`player-container ${isActive ? "active" : ""}`}
        animate={
          isWinner
            ? {
                boxShadow: [
                  "0 0 0px rgba(59, 130, 246, 0)",
                  "0 0 20px rgba(59, 130, 246, 0.8)",
                  "0 0 0px rgba(59, 130, 246, 0)",
                ],
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                },
              }
            : {}
        }
      >
        <motion.div
          className="player-info"
          initial={false}
          animate={{
            scale: isActive ? 1.05 : 1,
            borderColor: isActive ? "#4CAF50" : "#1e2939",
          }}
          transition={{ duration: 0.2 }}
        >
          <div className="flex flex-col justify-between items-left mr-10">
            <div className="flex">
              <div className={`player-name text-lg font-semibold ${getUsernameColor(name)}`}>{name}</div>
              <div className="button-container text-xs align-top absolute top-3 right-5">
                {isDealer && <div className="dealer-button">D</div>}
                {isSmallBlind && <div className="smallblind-button">S</div>}
                {isBigBlind && <div className="bigblind-button">B</div>}
              </div>
            </div>
            <div className="flex m-1">
              <Image
                className="mr-1"
                src="/assets/chips.png"
                alt="Chips"
                width={16}
                height={16}
              />
              {chips}
            </div>
          </div>
          {showBet && (
            <motion.div
              className="player-bet"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {currentBet}
            </motion.div>
          )}
        </motion.div>
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
      </motion.div>
    </div>
  );
};

export default Player;
