import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Player from "./Player";
import Card from "./Card";
import Deck from "./Deck";

interface TableProps {
	players: any[];
	communityCards: any[];
	pot: number;
	dealerIndex: number;
	smallBlindIndex: number;
	bigBlindIndex: number;
	activePlayerIndex: number | null;
	currentPlayerId: string;
	winners?: {
		playerId: string;
		playerName: string;
		amount: number;
		potType: string;
		hand?: string;
		cards?: string[];
	}[];
}

const Table: React.FC<TableProps> = ({
	players,
	communityCards,
	pot,
	dealerIndex,
	smallBlindIndex,
	bigBlindIndex,
	activePlayerIndex,
	currentPlayerId,
	winners = [],
}) => {
	const [prevCommunityCardCount, setCommunityCardCount] = useState(0);
	const [newCardsDealt, setNewCardsDealt] = useState(false);
	const [potChange, setPotChange] = useState(false);
	const [prevPot, setPrevPot] = useState(pot);

	// Track pot changes for animation
	useEffect(() => {
		if (pot !== prevPot) {
			setPotChange(true);
			setPrevPot(pot);
			const timer = setTimeout(() => {
				setPotChange(false);
			}, 1000);

			// Play chip sound when pot increases
			if (pot > prevPot) {
				const audio = new Audio("/assets/sounds/chip_sound.mp3");
				audio.volume = 0.3;
				audio.play().catch((err) => console.log("Audio play failed:", err));
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
		highlight: { scale: 1.2, color: "#ffd700", transition: { duration: 0.3 } },
	};

	// Calculate player positions in a circle
	const getPlayerPosition = (index, totalPlayers) => {
		return {
			top: `${50 - 40 * Math.cos((2 * Math.PI * index) / totalPlayers)}%`,
			left: `${50 + 40 * Math.sin((2 * Math.PI * index) / totalPlayers)}%`,
		};
	};

	// Check if a player is a winner
	const isWinner = (playerId: string) => {
		return winners.some((winner) => winner.playerId === playerId);
	};

	return (
		<div className="poker-table bg-green-800 rounded-full w-full max-w-4xl h-96 relative mx-auto">
			{/* Community cards */}
			<div className="deck-image">
				<Deck scaleFactor={1} />
			</div>
			<div className="community-cards absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex gap-2">
				<AnimatePresence mode="wait">
					{communityCards &&
						communityCards.length > 0 &&
						communityCards.map((card, index) => (
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
				animate={potChange ? "highlight" : "normal"}
			>
				Pot: {pot}
			</motion.div>

			{/* Players positioned around the table */}
			<div className="players-container">
				{players.map((player, index) => {
					let role = 0;

					if (dealerIndex === index && bigBlindIndex === index) role = 4;
					else if (dealerIndex === index) role = 1;
					else if (smallBlindIndex === index) role = 2;
					else if (bigBlindIndex === index) role = 3;

					const position = getPlayerPosition(index, players.length);

					return (
						<motion.div
							key={index}
							className="absolute transform -translate-x-1/2 -translate-y-1/2"
							style={position}
						>
							<Player
								player={player}
								isActive={activePlayerIndex === index}
								isCurrentPlayer={player.id === currentPlayerId}
								role={role}
								roundActive={true}
								isWinner={isWinner(player.id)}
							/>
						</motion.div>
					);
				})}
			</div>
		</div>
	);
};

export default Table;
