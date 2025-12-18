"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@contexts/authContext";
import { io, Socket } from "socket.io-client";
import Card from "@components/game/Card";
import DraggableChat from "@comps/game/Chat";
import { ResolveSocketUrl } from "@lib/socketUrl";

type AnyCard = {
	suit?: Suit;
	rank?: Rank | string;
	name?: string;
	faceUp?: boolean;
};

type TrickCard = {
	playerId: string;
	card: AnyCard;
};

type PinochlePlayer = {
	id: string;
	username: string;
	seatNumber?: number;
	team?: "A" | "B";
	ready?: boolean;
	cards: AnyCard[];
	tricksWon?: number;
	meldScore?: number;
	totalScore?: number;
};

type PinochlePhase =
	| "waiting"
	| "dealing"
	| "bid"
	| "playing"
	| "scoring"
	| "postgame"
	| "complete";

type PinochleGameState = {
	id: string;
	name: string;
	players: PinochlePlayer[];
	phase: PinochlePhase;
	status?: string;
	dealerId?: string;
	activePlayerId?: string;
	roundBid?: number;
	bidLeaderId?: string;
	biddingTeam?: "A" | "B";
	trumpSuit?: Suit | null;
	trick?: {
		leadSuit?: Suit | null;
		cards: TrickCard[];
	};
	scoreTeamA?: number;
	scoreTeamB?: number;
	meldTeamA?: number;
	meldTeamB?: number;
	wagerPerGame?: number;
	//kittyCount?: number;
	//deckCount?: number;
};

const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];

const getBidIncrement = (value: number): number => {
	if (value >= 100) return 10;
	if (value >= 60) return 5;
	return 1;
};

const normalizeBidValue = (raw: number): number => {
	let bid = Math.max(50, Math.floor(raw || 0));

	if (bid <= 60) {
		return bid;
	}

	if (bid < 100) {
		const offset = bid - 60;
		return 60 + Math.floor(offset / 5) * 5;
	}

	const offset = bid - 100;
	return 100 + Math.floor(offset / 10) * 10;
};

const nextBidAfter = (currentBid: number): number => {
	const increment = getBidIncrement(currentBid);
	const candidate = currentBid + increment;
	return normalizeBidValue(candidate);
};

function normalizeCard(
	card: AnyCard | null | undefined
): { suit: Suit; rank: Rank; faceUp?: boolean } | null {
	if (!card) return null;

	if (card.suit && card.rank) {
		return {
			suit: card.suit,
			rank: card.rank as Rank,
			faceUp: card.faceUp,
		};
	}

	if (card.name && card.name.length >= 2) {
		const rankCode = card.name[0];
		const suitCode = card.name[1];

		const suitMap: Record<string, Suit> = {
			S: "spades",
			H: "hearts",
			D: "diamonds",
			C: "clubs",
		};

		const rankMap: Record<string, Rank> = {
			A: "ace",
			K: "king",
			Q: "queen",
			J: "jack",
			T: "ten",
			9: "nine",
		};

		const mappedSuit = suitMap[suitCode.toUpperCase()];
		const mappedRank = rankMap[rankCode.toUpperCase()];

		if (mappedSuit && mappedRank) {
			return {
				suit: mappedSuit,
				rank: mappedRank as Rank,
				faceUp: card.faceUp,
			};
		}
	}

	return null;
}

export default function PinochleGamePage({
	params,
}: {
	params: Promise<{ gameId: string }>;
}) {
	const { gameId } = use(params);
	const { user, loading } = useAuth();
	const router = useRouter();
	const [gameState, setGameState] = useState<PinochleGameState | null>(null);
	const [isConnected, setIsConnected] = useState(false);
	const [bidAmount, setBidAmount] = useState<number>(50);
	const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(
		null
	);
	const socketRef = useRef<Socket | null>(null);

	const currentPlayerId = socketRef.current?.id;
	const myPlayer = useMemo(
		() => gameState?.players.find((p) => p.id === currentPlayerId),
		[gameState, currentPlayerId]
	);

	const isDealer = gameState?.dealerId === currentPlayerId;
	const canBid =
		gameState?.phase === "bid" &&
		gameState?.activePlayerId === currentPlayerId;
	const canPlayCard =
		gameState?.phase === "playing" &&
		gameState?.activePlayerId === currentPlayerId;

	const bidLeaderName = gameState?.players.find(
		(p) => p.id === gameState?.bidLeaderId
	)?.username;
	const activePlayerName = gameState?.players.find(
		(p) => p.id === gameState?.activePlayerId
	)?.username;

	const showTrumpSelector =
		gameState?.phase === "bid" &&
		!gameState.trumpSuit &&
		gameState?.bidLeaderId === currentPlayerId;

	const minNextBid = useMemo(() => {
		const current = gameState?.roundBid ?? 49;
		return nextBidAfter(current);
	}, [gameState?.roundBid]);

	const bidStep = useMemo(
		() => getBidIncrement(Math.max(bidAmount, gameState?.roundBid ?? 50)),
		[bidAmount, gameState?.roundBid]
	);

	const handleStateUpdate = (payload: any) => {
		const incoming =
			payload?.game || payload?.state || payload?.gameState || payload;

		if (!incoming) return;

		setGameState((prev) => ({
			...(prev || {}),
			...incoming,
		}));
	};

	useEffect(() => {
		// Ensure bid control is always aligned to allowed increments and above current bid
		setBidAmount((prev) => {
			const sanitized = normalizeBidValue(prev);
			return sanitized < minNextBid ? minNextBid : sanitized;
		});
	}, [minNextBid, gameState?.phase]);

	useEffect(() => {
		if (!gameId || !user) return;

		const socket = io(`${ResolveSocketUrl()}/pinochle`, {
			transports: ["websocket"],
			withCredentials: true,
		});

		socketRef.current = socket;

		socket.on("connect", () => {
			setIsConnected(true);

			socket.emit("register", { profile: user });
			socket.emit("join_game", {
				gameId,
				user,
				gameType: "Pinochle",
			});
			socket.emit("pinochle_join", {
				gameId,
				user,
			});
		});

		socket.on("disconnect", () => {
			setIsConnected(false);
		});

		// Core state updates
		socket.on("pinochle_state", handleStateUpdate);
		socket.on("pinochle_update", handleStateUpdate);
		socket.on("pinochle_hand_dealt", handleStateUpdate);
		socket.on("pinochle_round_end", handleStateUpdate);
		socket.on("pinochle_game_end", handleStateUpdate);

		// Fallback to generic game events in case the server reuses them
		socket.on("game_state", handleStateUpdate);
		socket.on("game_update", handleStateUpdate);

		// Bidding / trick detail updates
		socket.on("pinochle_bid_update", (data) => {
			setGameState((prev) =>
				prev
					? {
							...prev,
							roundBid: data?.roundBid ?? prev.roundBid,
							bidLeaderId: data?.bidLeaderId ?? prev.bidLeaderId,
							biddingTeam: data?.biddingTeam ?? prev.biddingTeam,
							trumpSuit: data?.trumpSuit ?? prev.trumpSuit,
					  }
					: prev
			);
		});

		socket.on("pinochle_trick_update", (data) => {
			setGameState((prev) =>
				prev
					? {
							...prev,
							trick: data?.trick ?? prev.trick,
							activePlayerId: data?.activePlayerId ?? prev.activePlayerId,
					  }
					: prev
			);
		});

		socket.on("player_left", handleStateUpdate);
		socket.on("player_joined", handleStateUpdate);
		socket.on("player_ready_changed", handleStateUpdate);

		socket.on("error", (error) => {
			console.error("Socket error:", error.message);
		});

		return () => {
			socket.disconnect();
			socketRef.current = null;
		};
	}, [gameId, user]);

	const emitWithGameId = (event: string, payload: Record<string, any> = {}) => {
		if (!socketRef.current || !gameId) return;
		socketRef.current.emit(event, {
			gameId,
			...payload,
		});
	};

	const handleDeal = () => {
		if (!isDealer) return;
		emitWithGameId("pinochle_deal");
	};

	const handleBid = () => {
		if (!canBid) return;
		const normalizedBid = normalizeBidValue(bidAmount);
		const finalBid = Math.max(normalizedBid, minNextBid);
		setBidAmount(finalBid);
		emitWithGameId("pinochle_bid", { amount: finalBid });
	};

	const handlePassBid = () => {
		if (!canBid) return;
		emitWithGameId("pinochle_bid_pass");
	};

	const handleSetTrump = (suit: Suit) => {
		if (!showTrumpSelector) return;
		emitWithGameId("pinochle_set_trump", { trump: suit });
	};

	const handlePlayCard = () => {
		if (!canPlayCard || selectedCardIndex === null || !myPlayer) return;
		const card = myPlayer.cards[selectedCardIndex];
		emitWithGameId("pinochle_play_card", { card });
		setSelectedCardIndex(null);
	};

	const handleToggleReady = () => {
		emitWithGameId("player_ready");
	};

	const handleBidInputChange = (value: number) => {
		const normalized = normalizeBidValue(value);
		const safeValue = Math.max(normalized, minNextBid);
		setBidAmount(safeValue);
	};

	if (loading) {
		return <div className="text-center p-10 text-gray-200">Loading...</div>;
	}

	if (!user) {
		return (
			<div className="text-center p-10 text-gray-200">
				You must be logged in to play.
			</div>
		);
	}

	return (
		<div className="container mx-auto p-4 bg-gray-900 text-gray-200 min-h-screen">
			<div className="bg-gray-800 border-l-4 border-blue-700 p-4 mb-4 rounded">
				<p className="text-gray-200">
					{isConnected
						? "Connected to game server"
						: "Disconnected from game server"}
				</p>
			</div>

			<h1 className="text-2xl font-bold mb-4 text-gray-100">
				Pinochle Room: {gameState?.name || gameId}
			</h1>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
				<div className="bg-gray-800 p-4 rounded-lg shadow space-y-2">
					<div className="text-sm text-gray-400">Phase</div>
					<div className="text-xl font-semibold text-gray-100">
						{gameState?.phase ?? gameState?.status ?? "waiting"}
					</div>
					<div className="text-sm text-gray-400">Active Player</div>
					<div className="text-lg text-gray-100">
						{activePlayerName || "—"}
					</div>
				</div>
				<div className="bg-gray-800 p-4 rounded-lg shadow space-y-2">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-sm text-gray-400">Current Bid</div>
							<div className="text-xl font-semibold text-gray-100">
								{gameState?.roundBid ?? "—"}
							</div>
						</div>
						<div className="text-right">
							<div className="text-sm text-gray-400">Bidder</div>
							<div className="text-lg text-gray-100">
								{bidLeaderName || "—"}
							</div>
						</div>
					</div>
					<div className="text-sm text-gray-400">Trump Suit</div>
					<div className="text-lg text-gray-100">
						{gameState?.trumpSuit || (showTrumpSelector ? "Select trump" : "—")}
					</div>
				</div>
				<div className="bg-gray-800 p-4 rounded-lg shadow space-y-2">
					<div className="flex justify-between">
						<div>
							<div className="text-sm text-gray-400">Team A</div>
							<div className="text-lg font-semibold text-gray-100">
								{gameState?.scoreTeamA ?? 0} pts
							</div>
							<div className="text-xs text-gray-400">
								Meld: {gameState?.meldTeamA ?? 0}
							</div>
						</div>
						<div className="text-right">
							<div className="text-sm text-gray-400">Team B</div>
							<div className="text-lg font-semibold text-gray-100">
								{gameState?.scoreTeamB ?? 0} pts
							</div>
							<div className="text-xs text-gray-400">
								Meld: {gameState?.meldTeamB ?? 0}
							</div>
						</div>
					</div>
					<div className="text-sm text-gray-400">
						Dealer:{" "}
						<span className="text-gray-100">
							{gameState?.players.find((p) => p.id === gameState?.dealerId)
								?.username || "—"}
						</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 space-y-6">
					<div className="bg-gray-800 p-4 rounded-lg shadow">
						<div className="flex flex-wrap items-center gap-3 mb-4">
							{isDealer && (
								<button
									onClick={handleDeal}
									className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-md"
									disabled={gameState?.phase === "playing"}
								>
									Deal Hands
								</button>
							)}

							{showTrumpSelector && (
								<div className="flex items-center gap-2">
									<span className="text-sm text-gray-300">Set Trump:</span>
									{SUITS.map((suit) => (
										<button
											key={suit}
											onClick={() => handleSetTrump(suit)}
											className="px-3 py-1 bg-purple-700 hover:bg-purple-800 text-white rounded text-sm"
										>
											{suit}
										</button>
									))}
								</div>
							)}

							{gameState?.phase === "waiting" && (
								<button
									onClick={handleToggleReady}
									className="px-3 py-2 bg-green-700 hover:bg-green-800 text-white rounded-md text-sm"
								>
									{myPlayer?.ready ? "Unready" : "Ready"}
								</button>
							)}
						</div>

						{gameState?.phase === "bid" && (
							<div className="flex flex-col sm:flex-row gap-3 items-center">
								<div className="flex items-center gap-2 w-full sm:w-auto">
									<label className="text-sm text-gray-300" htmlFor="bidInput">
										Your bid
									</label>
									<input
										id="bidInput"
										type="number"
										value={bidAmount}
										min={minNextBid}
										step={bidStep}
										onChange={(e) =>
											handleBidInputChange(Number(e.target.value))
										}
										onBlur={(e) =>
											handleBidInputChange(Number(e.target.value))
										}
										className="w-28 border border-gray-600 bg-gray-700 text-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-600"
										disabled={!canBid}
									/>
								</div>
								<div className="flex gap-2 w-full sm:w-auto">
									<button
										onClick={handleBid}
										disabled={!canBid}
										className={`px-4 py-2 rounded-md ${
											canBid
												? "bg-blue-700 hover:bg-blue-800 text-white"
												: "bg-gray-700 text-gray-400 cursor-not-allowed"
										}`}
									>
										Bid
									</button>
									<button
										onClick={handlePassBid}
										disabled={!canBid}
										className={`px-4 py-2 rounded-md ${
											canBid
												? "bg-red-700 hover:bg-red-800 text-white"
												: "bg-gray-700 text-gray-400 cursor-not-allowed"
										}`}
									>
										Pass
									</button>
								</div>
								<div className="text-sm text-gray-400">
									Bids: 50-60 by 1s, 60-100 by 5s, 100+ by 10s. Only the active bidder may act.
								</div>
							</div>
						)}

						{gameState?.phase === "playing" && (
							<div className="flex flex-col sm:flex-row items-center gap-3">
								<button
									onClick={handlePlayCard}
									disabled={!canPlayCard || selectedCardIndex === null}
									className={`px-4 py-2 rounded-md ${
										canPlayCard && selectedCardIndex !== null
											? "bg-green-700 hover:bg-green-800 text-white"
											: "bg-gray-700 text-gray-400 cursor-not-allowed"
									}`}
								>
									Play Selected Card
								</button>
								<div className="text-sm text-gray-400">
									{canPlayCard
										? "It's your turn to play."
										: "Waiting for your turn."}
								</div>
							</div>
						)}
					</div>

					<div className="bg-gray-800 p-4 rounded-lg shadow">
						<h2 className="text-lg font-semibold text-gray-100 mb-3">
							Current Trick
						</h2>
						{gameState?.trick?.cards?.length ? (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{gameState.trick.cards.map((entry, idx) => {
									const normalized = normalizeCard(entry.card);
									const playerName =
										gameState.players.find((p) => p.id === entry.playerId)
											?.username || entry.playerId;
									return (
										<div
											key={`${entry.playerId}-${idx}`}
											className="flex items-center gap-3 bg-gray-700 p-3 rounded"
										>
											<div className="w-32 text-gray-200">{playerName}</div>
											{normalized ? (
												<Card
													scaleFactor={1}
													rank={normalized.rank}
													suit={normalized.suit}
													faceDown={normalized.faceUp === false}
												/>
											) : (
												<span className="text-sm text-gray-400">
													Card hidden
												</span>
											)}
										</div>
									);
								})}
							</div>
						) : (
							<div className="text-sm text-gray-400">
								No cards played in this trick yet.
							</div>
						)}
					</div>

					<div className="bg-gray-800 p-4 rounded-lg shadow">
						<h2 className="text-lg font-semibold text-gray-100 mb-3">
							Your Hand
						</h2>
						{myPlayer?.cards?.length ? (
							<div className="flex flex-wrap gap-3">
								{myPlayer.cards.map((card, idx) => {
									const normalized = normalizeCard(card);
									return (
										<button
											key={`${card.name || `${card.suit}-${idx}`}`}
											onClick={() => setSelectedCardIndex(idx)}
											className={`p-1 rounded border ${
												selectedCardIndex === idx
													? "border-blue-500 bg-gray-700"
													: "border-transparent"
											}`}
											disabled={!canPlayCard && gameState?.phase !== "playing"}
										>
											{normalized ? (
												<Card
													scaleFactor={1}
													rank={normalized.rank}
													suit={normalized.suit}
													faceDown={false}
												/>
											) : (
												<span className="text-sm text-gray-400">
													Unknown
												</span>
											)}
										</button>
									);
								})}
							</div>
						) : (
							<div className="text-sm text-gray-400">
								You have no cards yet.
							</div>
						)}
					</div>
				</div>

				<div className="space-y-6">
					<div className="bg-gray-800 p-4 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-100 mb-3">
							Players
						</h3>
						<ul className="space-y-2">
							{gameState?.players.map((player) => {
								const teamLabel =
									player.team ||
									((player.seatNumber ?? 0) % 2 === 0 ? "A" : "B");
								return (
									<li
										key={player.id}
										className={`p-3 rounded border ${
											player.id === currentPlayerId
												? "border-blue-600 bg-gray-700"
												: "border-gray-700 bg-gray-800"
										}`}
									>
										<div className="flex justify-between items-center">
											<div>
												<div className="text-gray-100 font-medium">
													{player.username}
													{player.id === gameState?.dealerId && (
														<span className="ml-2 text-xs text-purple-300">
															Dealer
														</span>
													)}
												</div>
												<div className="text-xs text-gray-400">
													Team {teamLabel}
												</div>
											</div>
											<div className="text-right text-sm text-gray-300">
												<div>
													Meld: {player.meldScore ?? "—"}
												</div>
												<div>
													Tricks: {player.tricksWon ?? 0}
												</div>
												{player.ready && (
													<div className="text-green-400 text-xs">Ready</div>
												)}
												{player.id === gameState?.activePlayerId && (
													<div className="text-blue-400 text-xs">Active</div>
												)}
											</div>
										</div>
									</li>
								);
							})}
						</ul>
					</div>

					<DraggableChat socket={socketRef.current} scope="pinochle" />

					{process.env.NODE_ENV !== "production" && gameState && (
						<div className="p-4 bg-gray-950 text-green-300 rounded overflow-x-auto">
							<h2 className="text-lg font-bold mb-2">[DEBUG] Game State</h2>
							<pre className="text-xs whitespace-pre-wrap break-all max-h-96 overflow-y-auto border border-green-700 rounded bg-gray-900 p-2 mb-4">
								{JSON.stringify(gameState, null, 2)}
							</pre>
						</div>
					)}
				</div>
			</div>

			<div className="mt-6">
				<button
					onClick={() => router.push("/game")}
					className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
				>
					Back to Lobby
				</button>
			</div>
		</div>
	);
}
