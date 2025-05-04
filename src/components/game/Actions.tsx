import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ActionsProps {
	roundStatus: string;
	canCheck: boolean;
	gameCurrentBet: number;
	playerCurrentBet: number;
	minRaise: number;
	playerChips: number;
	gamePhase: string;
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
	gamePhase,
	onAction,
	isActive,
	allowedActions = ["fold", "check", "call", "bet", "raise"],
	isPlayerReady = false,
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
			const audio = new Audio("/assets/sounds/notification.mp3");
			audio.volume = 0.2;
			audio.play().catch((err) => console.log("Audio play failed:", err));
		}
		setPrevIsActive(isActive);
	}, [isActive, prevIsActive]);

	// Debug: Show allowedActions and key props
	useEffect(() => {
		console.log('[ACTIONS DEBUG] allowedActions:', allowedActions);
		console.log('[ACTIONS DEBUG] Props:', {
			isActive,
			gamePhase,
			gameCurrentBet,
			playerCurrentBet,
			minRaise,
			playerChips,
			canCheck,
			isPlayerReady,
			roundStatus,
		});
	}, [allowedActions, isActive, gamePhase, gameCurrentBet, playerCurrentBet, minRaise, playerChips, canCheck, isPlayerReady, roundStatus]);

	// Debug: Show which actions are allowed by client-side validation
	useEffect(() => {
		const actions = ["fold", "check", "call", "bet", "raise"];
		const allowed = actions.map(a => ({
			action: a,
			clientAllowed: isActionAllowed(a),
		}));
		console.log('[ACTIONS DEBUG] Client-side allowed:', allowed);
	}, [isActive, allowedActions, gamePhase, gameCurrentBet, playerCurrentBet, minRaise, playerChips, canCheck]);

	const toggleReady = () => {
		onAction("player_ready");
	};

	// Enhanced action validation
	const isActionAllowed = (action: string) => {
		// First check if we're the active player
		if (!isActive) return false;

		// Then check if the action is in our allowed actions list
		if (!allowedActions?.includes(action)) return false;

		// Additional validation based on game state
		switch (action) {
			case "fold":
				// Can always fold if it's our turn (allowedActions check already handles special cases)
				return true;

			case "check":
				// Can only check if no one has made a bet yet or we're big blind preflop with no raises
				return (
					(gameCurrentBet === 0 && gameCurrentBet === playerCurrentBet) ||
					(gamePhase === "preflop" && gameCurrentBet === playerCurrentBet)
				);

			case "call":
				// Can only call if there's a bet to call and we have enough chips
				return (
					gameCurrentBet > 0 &&
					gameCurrentBet > playerCurrentBet &&
					playerChips >= gameCurrentBet - playerCurrentBet
				);

			case "bet":
				// Can only bet if there's no current bet and we have enough chips
				return gameCurrentBet === 0 && playerChips >= minRaise;

			case "raise":
				// Can only raise if:
				// 1. There's a current bet AND
				// 2. We have enough chips for minimum raise
				const minRaiseAmount = gameCurrentBet * 2 - playerCurrentBet;
				return gameCurrentBet > 0 && playerChips >= minRaiseAmount;

			default:
				return false;
		}
	};

	// Animation variants
	const containerVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: {
			opacity: 1,
			y: 0,
			transition: {
				duration: 0.3,
				when: "beforeChildren",
				staggerChildren: 0.1,
			},
		},
		exit: {
			opacity: 0,
			y: 20,
			transition: { duration: 0.2 },
		},
	};

	const buttonVariants = {
		hidden: { opacity: 0, scale: 0.8 },
		visible: {
			opacity: 1,
			scale: 1,
			transition: { duration: 0.2 },
		},
	};

	const activePlayerHighlight = {
		hidden: { boxShadow: "0px 0px 0px rgba(59, 130, 246, 0)" },
		visible: {
			boxShadow: isActive
				? "0px 0px 15px rgba(59, 130, 246, 0.7)"
				: "0px 0px 0px rgba(59, 130, 246, 0)",
		},
	};

	// Optionally, render a debug panel in the UI (visible in dev only)
	const showDebug = process.env.NODE_ENV !== 'production';

	if (roundStatus === "waiting") {
		return (
			<>
				{showDebug && (
					<div className="bg-gray-950 text-green-300 text-xs p-2 mb-2 rounded">
						<strong>[ACTIONS DEBUG]</strong>
						<div>allowedActions: {JSON.stringify(allowedActions)}</div>
						<div>isActive: {String(isActive)}, gamePhase: {gamePhase}, gameCurrentBet: {gameCurrentBet}, playerCurrentBet: {playerCurrentBet}, minRaise: {minRaise}, playerChips: {playerChips}, canCheck: {String(canCheck)}, isPlayerReady: {String(isPlayerReady)}, roundStatus: {roundStatus}</div>
					</div>
				)}
				<motion.div
					className="player-actions bg-gray-900 p-2 rounded-lg mt-2"
					initial="hidden"
					animate="visible"
					variants={containerVariants}
				>
					<motion.button
						onClick={toggleReady}
						className={`px-4 py-2 rounded text-white ${
							isReady ? "bg-blue-600" : "bg-red-600"
						}`}
						variants={buttonVariants}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
					>
						{isReady ? "Ready" : "Not Ready"}
					</motion.button>
				</motion.div>
			</>
		);
	} else {
		return (
			<>
				{showDebug && (
					<div className="bg-gray-950 text-green-300 text-xs p-2 mb-2 rounded">
						<strong>[ACTIONS DEBUG]</strong>
						<div>allowedActions: {JSON.stringify(allowedActions)}</div>
						<div>isActive: {String(isActive)}, gamePhase: {gamePhase}, gameCurrentBet: {gameCurrentBet}, playerCurrentBet: {playerCurrentBet}, minRaise: {minRaise}, playerChips: {playerChips}, canCheck: {String(canCheck)}, isPlayerReady: {String(isPlayerReady)}, roundStatus: {roundStatus}</div>
					</div>
				)}
				<motion.div
					className="player-actions bg-gray-900 p-2 rounded-lg mt-2"
					initial="hidden"
					animate="visible"
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
							className={`bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded ${
								!isActive || !isActionAllowed("fold")
									? "opacity-50 cursor-not-allowed"
									: ""
							}`}
							onClick={() => onAction("fold")}
							disabled={!isActive || !isActionAllowed("fold")}
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
									className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded ${
										!isActive || !isActionAllowed("check")
											? "opacity-50 cursor-not-allowed"
											: ""
									}`}
									onClick={() => onAction("check")}
									disabled={!isActive || !isActionAllowed("check")}
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
									className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded ${
										!isActive || !isActionAllowed("call")
											? "opacity-50 cursor-not-allowed"
											: ""
									}`}
									onClick={() => onAction("call", gameCurrentBet)}
									disabled={!isActive || !isActionAllowed("call")}
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
										className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mt-1 ${
											!isActive || !isActionAllowed("bet")
												? "opacity-50 cursor-not-allowed"
												: ""
										}`}
										onClick={() => onAction("bet", raiseAmount)}
										disabled={!isActive || !isActionAllowed("bet")}
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
										className={`bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded mt-1 ${
											!isActive || !isActionAllowed("raise")
												? "opacity-50 cursor-not-allowed"
												: ""
										}`}
										onClick={() =>
											isActive &&
											isActionAllowed("raise") &&
											onAction("raise", raiseAmount)
										}
										disabled={!isActive || !isActionAllowed("raise")}
										variants={buttonVariants}
										whileHover={isActive ? { scale: 1.05 } : {}}
										whileTap={isActive ? { scale: 0.95 } : {}}
										initial={{ opacity: 0, y: 10 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: 10 }}
										transition={{ duration: 0.2 }}
									>
										Raise total bet to{" "}
										{raiseAmount + (gameCurrentBet - playerCurrentBet)}
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
			</>
		);
	}
};

export default Actions;