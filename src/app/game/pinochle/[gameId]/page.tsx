"use client";

import React, { use, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@contexts/authContext";
import { io, Socket } from "socket.io-client";
import Card from "@components/game/Card";
import DraggableChat from "@comps/game/Chat";
import { ResolveSocketUrl } from "@lib/socketUrl";
import { DeterminePlayableCards } from "@game/pinochleRules";
import { motion } from "framer-motion";


type AnyCard = {
  suit?: Suit;
  rank?: PinochleRank | string;
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
  meldCards?: AnyCard[];
  tricksWon?: number;
  meldScore?: number;
  totalScore?: number;
  passedBid?: boolean;
  roundPoints?: number;
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
	trickPointsTeamA?: number;
	trickPointsTeamB?: number;
	setsTeamA?: number;
	setsTeamB?: number;
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
): { suit: Suit; rank: PinochleRank; faceUp?: boolean } | null {
  if (!card) return null;

  if (card.suit && card.rank) {
    return {
      suit: card.suit,
      rank: card.rank as PinochleRank,
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

    const rankMap: Record<string, PinochleRank> = {
      A: "ace",
      K: "king",
      Q: "queen",
      J: "jack",
      T: "ten",
    };

    const mappedSuit = suitMap[suitCode.toUpperCase()];
    const mappedRank = rankMap[rankCode.toUpperCase()];

    if (mappedSuit && mappedRank) {
      return {
        suit: mappedSuit,
        rank: mappedRank as PinochleRank,
        faceUp: card.faceUp,
      };
    }
  }

  return null;
}

const getPinochleRankValue = (rank?: PinochleRank | string): number => {
  const rankMap: Record<string, number> = {
    jack: 1,
    queen: 2,
    king: 3,
    ten: 4,
    ace: 5,
  };
  return rank ? rankMap[rank.toString().toLowerCase()] ?? -Infinity : -Infinity;
};

const getAllowedPlayableCards = (
	hand: AnyCard[],
	trick?: PinochleGameState["trick"],
	trumpSuit?: Suit | null
): AnyCard[] => {
	if (!hand?.length) return [];
	if (!trumpSuit || !trick?.cards?.length || !trick.leadSuit) return hand;

	const normalizedHand = hand
    .map((card) => ({ card, normalized: normalizeCard(card) }))
    .filter((entry) => !!entry.normalized) as {
    card: AnyCard;
    normalized: { suit: Suit; rank: PinochleRank };
  }[];

	if (!normalizedHand.length) return hand;

	const normalizedCards = normalizedHand.map((entry) => ({
		suit: entry.normalized.suit,
		rank: entry.normalized.rank,
		rankValue: getPinochleRankValue(entry.normalized.rank) as PinochleRankValue,
	}));
	const leadingCards = (trick.cards || [])
		.map((entry) => normalizeCard(entry.card))
		.filter((card): card is { suit: Suit; rank: PinochleRank } => !!card)
		.map((card) => ({
			suit: card.suit,
			rank: card.rank,
			rankValue: getPinochleRankValue(card.rank) as PinochleRankValue,
		}));

	const allowedNormalized = DeterminePlayableCards(
		normalizedCards,
		leadingCards,
		trumpSuit
	);
	const allowedIndexes = new Set(
		allowedNormalized
			.map((card) => normalizedCards.indexOf(card))
			.filter((index) => index >= 0)
	);
	return normalizedHand
		.filter((_, index) => allowedIndexes.has(index))
		.map((entry) => entry.card);
};

const seatOrder = ["bottom", "right", "top", "left"] as const;
type SeatPosition = (typeof seatOrder)[number];

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
	const [pendingPlay, setPendingPlay] = useState<TrickCard | null>(null);
	const [showMeldModal, setShowMeldModal] = useState(false);
	const [showRoundRecap, setShowRoundRecap] = useState(false);
	const [autoReadyNextHand, setAutoReadyNextHand] = useState(false);
	const [completedTrick, setCompletedTrick] =
		useState<PinochleGameState["trick"] | null>(null);
	const [completedTrickWinnerId, setCompletedTrickWinnerId] = useState<
		string | null
	>(null);
	const [isCollectingTrick, setIsCollectingTrick] = useState(false);
	const socketRef = useRef<Socket | null>(null);
	const lastMeldTokenRef = useRef<string | null>(null);
	const lastAutoReadyTokenRef = useRef<string | null>(null);

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

	const awaitingTrump =
		gameState?.phase === "bid" &&
		gameState?.status === "awaiting_trump" &&
		gameState?.activePlayerId === gameState?.bidLeaderId;

	const showTrumpSelector =
		awaitingTrump &&
		!gameState?.trumpSuit &&
		gameState?.bidLeaderId === currentPlayerId;

	const availableTrumpSuits = useMemo(() => {
		if (!myPlayer?.cards?.length) return [];

		const counts: Record<Suit, { kings: number; queens: number }> = {
			spades: { kings: 0, queens: 0 },
			hearts: { kings: 0, queens: 0 },
			diamonds: { kings: 0, queens: 0 },
			clubs: { kings: 0, queens: 0 },
		};

		myPlayer.cards.forEach((card) => {
			const normalized = normalizeCard(card);
			if (!normalized) return;
			if (normalized.rank === "king") counts[normalized.suit].kings += 1;
			if (normalized.rank === "queen") counts[normalized.suit].queens += 1;
		});

		return SUITS.filter(
			(suit) => Math.min(counts[suit].kings, counts[suit].queens) > 0
		);
	}, [myPlayer?.cards]);

	const minNextBid = useMemo(() => {
		const current = gameState?.roundBid ?? 49;
		return nextBidAfter(current);
	}, [gameState?.roundBid]);

	const bidStep = useMemo(
		() => getBidIncrement(Math.max(bidAmount, gameState?.roundBid ?? 50)),
		[bidAmount, gameState?.roundBid]
	);
	const bidDecrement = bidAmount > 100 ? 10 : bidAmount > 60 ? 5 : 1;
	const canDecreaseBid = canBid && bidAmount > minNextBid;

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

			socket.emit("COM-register", { profile: user });
			socket.emit("COM-join_game", {
				gameId,
				user,
				gameType: "Pinochle",
			});
			socket.emit("PIN-pinochle_join", {
				gameId,
				user,
			});
		});

		socket.on("disconnect", () => {
			setIsConnected(false);
		});

		// Core state updates
		socket.on("PIN-pinochle_state", handleStateUpdate);
		socket.on("PIN-pinochle_update", handleStateUpdate);
		socket.on("PIN-pinochle_hand_dealt", handleStateUpdate);
		socket.on("PIN-pinochle_round_end", handleStateUpdate);
		socket.on("PIN-pinochle_game_end", handleStateUpdate);

		// Fallback to generic game events in case the server reuses them
		socket.on("POK-game_state", handleStateUpdate);
		socket.on("POK-game_update", handleStateUpdate);

		// Bidding / trick detail updates
		socket.on("PIN-pinochle_bid_update", (data) => {
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

		socket.on("PIN-pinochle_trick_update", (data) => {
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
		socket.on("PIN-pinochle_trick_complete", (data) => {
			if (data?.trick) {
				setCompletedTrick(data.trick);
				setCompletedTrickWinnerId(data?.winnerPlayerId ?? null);
			}
		});

		socket.on("POK-player_left", handleStateUpdate);
		socket.on("POK-player_joined", handleStateUpdate);
		socket.on("POK-player_ready_changed", handleStateUpdate);

		socket.on("COM-error", (error) => {
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
		emitWithGameId("PIN-pinochle_deal");
	};

	const handleBid = () => {
		if (!canBid) return;
		const normalizedBid = normalizeBidValue(bidAmount);
		const finalBid = Math.max(normalizedBid, minNextBid);
		setBidAmount(finalBid);
		emitWithGameId("PIN-pinochle_bid", { amount: finalBid });
	};

	const handlePassBid = () => {
		if (!canBid) return;
		emitWithGameId("PIN-pinochle_bid_pass");
	};

	const handleSetTrump = (suit: Suit) => {
		if (!showTrumpSelector) return;
		emitWithGameId("PIN-pinochle_set_trump", { trump: suit });
	};

	const handleToggleReady = () => {
		emitWithGameId("COM-player_ready");
	};

	const handleBidInputChange = (value: number) => {
		const normalized = normalizeBidValue(value);
		const safeValue = Math.max(normalized, minNextBid);
		setBidAmount(safeValue);
	};

	const allowedPlayableCards = useMemo(
		() =>
			getAllowedPlayableCards(
				myPlayer?.cards || [],
				gameState?.trick,
				gameState?.trumpSuit
			),
		[myPlayer?.cards, gameState?.trick, gameState?.trumpSuit]
	);
	const allowedCardSet = useMemo(
		() => new Set(allowedPlayableCards),
		[allowedPlayableCards]
	);

	const isMeldPhase =
		gameState?.phase === "scoring" ||
		gameState?.status === "meld" ||
		gameState?.status === "scoring";

	useEffect(() => {
		if (isMeldPhase) {
			setShowMeldModal(true);
		}
	}, [isMeldPhase]);

	useEffect(() => {
		const meldToken = [
			gameState?.roundBid ?? "",
			gameState?.trumpSuit ?? "",
			gameState?.meldTeamA ?? "",
			gameState?.meldTeamB ?? "",
		].join("|");
		const shouldOpen =
			gameState?.phase === "playing" &&
			!!gameState?.trumpSuit &&
			gameState?.meldTeamA !== undefined &&
			gameState?.meldTeamB !== undefined &&
			lastMeldTokenRef.current !== meldToken;
		if (shouldOpen) {
			lastMeldTokenRef.current = meldToken;
			setShowMeldModal(true);
		}
		if (gameState?.phase === "waiting") {
			lastMeldTokenRef.current = null;
		}
	}, [
		gameState?.phase,
		gameState?.trumpSuit,
		gameState?.meldTeamA,
		gameState?.meldTeamB,
		gameState?.roundBid,
	]);

	const isRoundRecapPhase =
		gameState?.status === "round_complete" || gameState?.status === "bid_set";

	useEffect(() => {
		if (isRoundRecapPhase) {
			setShowRoundRecap(true);
		}
	}, [isRoundRecapPhase]);

	useEffect(() => {
		if (!autoReadyNextHand) {
			lastAutoReadyTokenRef.current = null;
			return;
		}
		if (!isRoundRecapPhase || gameState?.phase !== "waiting") return;
		if (!myPlayer || myPlayer.ready) return;

		const token = [
			gameState?.scoreTeamA ?? 0,
			gameState?.scoreTeamB ?? 0,
			gameState?.setsTeamA ?? 0,
			gameState?.setsTeamB ?? 0,
			gameState?.status ?? "",
		].join("|");

		if (lastAutoReadyTokenRef.current === token) return;
		lastAutoReadyTokenRef.current = token;
		handleToggleReady();
	}, [
		autoReadyNextHand,
		gameState?.phase,
		gameState?.status,
		gameState?.scoreTeamA,
		gameState?.scoreTeamB,
		gameState?.setsTeamA,
		gameState?.setsTeamB,
		isRoundRecapPhase,
		myPlayer?.ready,
	]);

	const orderedPlayers = useMemo(() => {
		const players = gameState?.players || [];
		if (!players.length) return [] as PinochlePlayer[];
		const hasSeats = players.some((p) => typeof p.seatNumber === "number");
		const sorted = hasSeats
			? [...players].sort(
					(a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0)
			  )
			: [...players];
		if (!myPlayer || !hasSeats) return sorted;
		const mySeatIndex = sorted.findIndex((p) => p.id === myPlayer.id);
		if (mySeatIndex === -1) return sorted;
		return [...sorted.slice(mySeatIndex), ...sorted.slice(0, mySeatIndex)];
	}, [gameState?.players, myPlayer]);

	const seatMap = useMemo(() => {
		const map = new Map<SeatPosition, PinochlePlayer | undefined>();
		seatOrder.forEach((position, index) => {
			map.set(position, orderedPlayers[index]);
		});
		return map;
	}, [orderedPlayers]);

	const meldDisplayPlayers = useMemo(() => {
		if (!orderedPlayers.length) return [] as PinochlePlayer[];
		if (!myPlayer?.team) return orderedPlayers.slice(0, 4);
		const myTeamPlayers = orderedPlayers.filter(
			(player) => player.team === myPlayer.team
		);
		const orderedMyTeam = myTeamPlayers.sort((a, b) => {
			if (a.id === myPlayer.id) return -1;
			if (b.id === myPlayer.id) return 1;
			return 0;
		});
		const opponentPlayers = orderedPlayers.filter(
			(player) => player.team !== myPlayer.team
		);
		return [...orderedMyTeam, ...opponentPlayers];
	}, [myPlayer?.team, orderedPlayers]);

	const handRows = useMemo(() => {
		const cards = myPlayer?.cards || [];
		if (cards.length <= 12) return [cards];
		const splitIndex = Math.ceil(cards.length / 2);
		return [cards.slice(0, splitIndex), cards.slice(splitIndex)];
	}, [myPlayer?.cards]);

	useEffect(() => {
		if (!pendingPlay || !gameState?.trick?.cards) return;
		const alreadyRecorded = gameState.trick.cards.some(
			(entry) => entry.playerId === pendingPlay.playerId
		);
		if (alreadyRecorded) {
			setPendingPlay(null);
		}
	}, [gameState?.trick?.cards, pendingPlay]);

	useEffect(() => {
		if (!gameState?.trick?.cards?.length) {
			setPendingPlay(null);
		}
	}, [gameState?.trick?.cards?.length]);

	useEffect(() => {
		if (!completedTrick?.cards?.length || !completedTrickWinnerId) return;
		setIsCollectingTrick(false);
		const pauseTimer = setTimeout(() => setIsCollectingTrick(true), 500);
		const clearTimer = setTimeout(() => {
			setCompletedTrick(null);
			setCompletedTrickWinnerId(null);
			setIsCollectingTrick(false);
		}, 1200);
		return () => {
			clearTimeout(pauseTimer);
			clearTimeout(clearTimer);
		};
	}, [completedTrick, completedTrickWinnerId]);

	const suitIcon = (suit: Suit) => {
		switch (suit) {
			case "spades":
				return "M24 2c6 7 11 11 11 18 0 6-4 10-9 10-2 0-4-1-6-3 1 4 3 7 6 10H22c3-3 5-6 6-10-2 2-4 3-6 3-5 0-9-4-9-10 0-7 5-11 11-18z";
			case "hearts":
				return "M24 38C13 29 6 23 6 16a8 8 0 0 1 15-4 8 8 0 0 1 15 4c0 7-7 13-12 18z";
			case "diamonds":
				return "M24 4l14 20-14 20L10 24 24 4z";
			default:
				return "M24 6c6 4 12 9 12 16 0 5-3 9-8 9-2 0-4-1-6-2 1 3 2 6 5 9H21c3-3 4-6 5-9-2 1-4 2-6 2-5 0-8-4-8-9 0-7 6-12 12-16z";
		}
	};

	const myTeam = myPlayer?.team || "A";
	const opponentTeam = myTeam === "A" ? "B" : "A";
	const teamStats = useMemo(() => {
		const meldA = gameState?.meldTeamA ?? 0;
		const meldB = gameState?.meldTeamB ?? 0;
		const tricksA = gameState?.trickPointsTeamA ?? 0;
		const tricksB = gameState?.trickPointsTeamB ?? 0;
		return {
			teamA: {
				meld: meldA,
				tricks: tricksA,
				total: meldA + tricksA,
				score: gameState?.scoreTeamA ?? 0,
			},
			teamB: {
				meld: meldB,
				tricks: tricksB,
				total: meldB + tricksB,
				score: gameState?.scoreTeamB ?? 0,
			},
		};
	}, [
		gameState?.meldTeamA,
		gameState?.meldTeamB,
		gameState?.trickPointsTeamA,
		gameState?.trickPointsTeamB,
		gameState?.scoreTeamA,
		gameState?.scoreTeamB,
	]);

	const bidderTeam = gameState?.biddingTeam;
	const bidderMeld =
		bidderTeam === "A" ? teamStats.teamA.meld : teamStats.teamB.meld;
	const tricksNeeded = Math.max((gameState?.roundBid ?? 0) - bidderMeld, 20);
	const trickCenterOffset = { x: 0, y: -30 };

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
		<div className="min-h-screen bg-gradient-to-b from-[#0b0416] via-[#120c25] to-[#0a0818] text-gray-100">
			<div className="mx-auto max-w-6xl px-4 py-6">
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
					<div className="rounded border border-white/10 bg-black/40 px-3 py-2">
						{isConnected
							? "Connected to game server"
							: "Disconnected from game server"}
					</div>
					<div className="text-right text-xs uppercase tracking-[0.25em] text-white/60">
						Pinochle Room {gameState?.name || gameId}
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-[240px_1fr_280px]">
					<div className="rounded-lg border border-black/40 bg-white/10 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
						<div className="text-lg font-semibold text-white/90">Scoreboard</div>
						<div className="mt-4 space-y-3 text-sm">
							<div className="rounded-md border border-white/10 bg-white/5 p-3">
								<div className="flex items-center justify-between text-xs uppercase text-white/60">
									<span>You</span>
									<span>Them</span>
								</div>
								<div className="mt-2 grid grid-cols-2 gap-2 text-center text-lg">
									<div>
										<div className="text-xs uppercase text-white/50">Meld</div>
										<div className="font-bold text-emerald-300">
											{gameState?.meldTeamA ?? 0}
										</div>
									</div>
									<div>
										<div className="text-xs uppercase text-white/50">Meld</div>
										<div className="font-bold text-red-300">
											{gameState?.meldTeamB ?? 0}
										</div>
									</div>
									<div>
										<div className="text-xs uppercase text-white/50">Tricks</div>
										<div className="font-bold text-emerald-300">
											{gameState?.trickPointsTeamA ?? 0}
										</div>
									</div>
									<div>
										<div className="text-xs uppercase text-white/50">Tricks</div>
										<div className="font-bold text-red-300">
											{gameState?.trickPointsTeamB ?? 0}
										</div>
									</div>
								</div>
								<div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-center text-lg">
									<div>
										<div className="text-xs uppercase text-white/50">Score</div>
										<div className="font-bold text-emerald-300">
											{gameState?.scoreTeamA ?? 0}
										</div>
									</div>
									<div>
										<div className="text-xs uppercase text-white/50">Score</div>
										<div className="font-bold text-red-300">
											{gameState?.scoreTeamB ?? 0}
										</div>
									</div>
								</div>
								<div className="mt-3 border-t border-white/10 pt-3 text-xs uppercase text-white/60">
									Round Bid{" "}
									<span className="text-white/90">
										{gameState?.roundBid ?? "-"}
									</span>
								</div>
							</div>
							<div className="rounded-md border border-white/10 bg-white/5 p-3 text-xs uppercase text-white/60">
								<div>Phase</div>
								<div className="mt-1 text-base font-semibold text-white/90">
									{gameState?.phase ?? gameState?.status ?? "waiting"}
								</div>
								<div className="mt-2">Active</div>
								<div className="text-base text-white/80">
									{activePlayerName || "-"}
								</div>
								<div className="mt-2">Trump</div>
								<div className="text-base text-white/80">
									{gameState?.trumpSuit || (showTrumpSelector ? "Select" : "-")}
								</div>
							</div>
						</div>
					</div>

					<div className="relative rounded-[28px] border border-[#1d1206] bg-[#082e14] shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
						<div className="absolute inset-0 rounded-[28px] border-4 border-[#3d2107]" />
						<div className="relative flex min-h-[520px] flex-col items-center justify-between px-6 py-8">
							<div
								className={`text-lg font-semibold tracking-wide text-white/90 ${
									seatMap.get("top")?.id === gameState?.activePlayerId
										? "font-bold text-yellow-300 underline"
										: ""
								}`}
							>
								{seatMap.get("top")?.username || "Waiting for partner"}
							</div>
							<div
								className={`absolute left-6 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/80 ${
									seatMap.get("left")?.id === gameState?.activePlayerId
										? "font-bold text-yellow-300 underline"
										: ""
								}`}
							>
								{seatMap.get("left")?.username || "Waiting..."}
							</div>
							<div
								className={`absolute right-6 top-1/2 -translate-y-1/2 text-sm font-semibold text-white/80 ${
									seatMap.get("right")?.id === gameState?.activePlayerId
										? "font-bold text-yellow-300 underline"
										: ""
								}`}
							>
								{seatMap.get("right")?.username || "Waiting..."}
							</div>
							<div
								className={`absolute bottom-8 text-lg font-semibold text-white/90 ${
									myPlayer?.id === gameState?.activePlayerId
										? "font-bold text-yellow-300 underline"
										: ""
								}`}
							>
								{myPlayer?.username || "You"}
							</div>

							<div className="relative mt-10 flex h-60 w-60 items-center justify-center">
								{(
									completedTrick?.cards?.length
										? completedTrick.cards
										: [
												...(gameState?.trick?.cards || []),
												...(pendingPlay ? [pendingPlay] : []),
										  ]
								).map((entry, idx) => {
									const normalized = normalizeCard(entry.card);
									const seatIndex = orderedPlayers.findIndex(
										(player) => player.id === entry.playerId
									);
									const seat =
										seatOrder[seatIndex >= 0 ? seatIndex : 0] || "bottom";
									const motionStart = {
										bottom: { x: 0, y: 140 },
										top: { x: 0, y: -140 },
										left: { x: -160, y: 0 },
										right: { x: 160, y: 0 },
									}[seat];
									const baseStop = {
										bottom: { x: 0, y: 35 },
										top: { x: 0, y: -85 },
										left: { x: -70, y: -20 },
										right: { x: 70, y: -20 },
									}[seat];
									const overlapOffset = {
										bottom: { x: idx * 6, y: idx * 4 },
										top: { x: idx * 6, y: -idx * 4 },
										left: { x: -idx * 4, y: idx * 6 },
										right: { x: idx * 4, y: -idx * 6 },
									}[seat];
									const winnerSeatIndex = orderedPlayers.findIndex(
										(player) => player.id === completedTrickWinnerId
									);
									const winnerSeat =
										seatOrder[winnerSeatIndex >= 0 ? winnerSeatIndex : 0] ||
										"bottom";
									const collectTarget = {
										bottom: { x: 0, y: 220 },
										top: { x: 0, y: -220 },
										left: { x: -260, y: 0 },
										right: { x: 260, y: 0 },
									}[winnerSeat];

									if (!normalized) {
										return (
											<div
												key={`${entry.playerId}-${idx}`}
												className="text-xs text-white/70"
											>
												Card hidden
											</div>
										);
									}

									return (
										<motion.div
											key={`${entry.playerId}-${idx}`}
											initial={{ opacity: 0, ...motionStart }}
											animate={{
												opacity: 1,
												x: isCollectingTrick
													? collectTarget.x
													: baseStop.x + overlapOffset.x + trickCenterOffset.x,
												y: isCollectingTrick
													? collectTarget.y
													: baseStop.y + overlapOffset.y + trickCenterOffset.y,
											}}
											transition={{ duration: 0.2, ease: "easeOut" }}
											className="absolute"
											style={{ zIndex: 10 + idx }}
										>
											<Card
												scaleFactor={1.05}
												rank={normalized.rank}
												suit={normalized.suit}
												faceDown={false}
											/>
										</motion.div>
									);
								})}
							</div>

							{gameState?.phase === "bid" && (
								<>
									{(["top", "left", "right", "bottom"] as SeatPosition[]).map(
										(position) => {
											const player = seatMap.get(position);
											if (!player) return null;
											const isActive = player.id === gameState?.activePlayerId;
											const isLeader = player.id === gameState?.bidLeaderId;
											const label = player.passedBid
												? "PASS"
												: isLeader
													? `${gameState?.roundBid ?? ""}`
													: "--";
											const isBottomBidder =
												position === "bottom" && player.id === myPlayer?.id;
											const positionClasses = {
												top: "top-24 left-1/2 -translate-x-1/2",
												left: "left-16 top-1/2 -translate-y-1/2",
												right: "right-16 top-1/2 -translate-y-1/2",
												bottom: "bottom-24 left-1/2 -translate-x-1/2",
											}[position];
											return (
												<div
													key={`bid-${position}`}
													className={`absolute ${positionClasses} rounded-lg border-2 border-black/50 bg-[#f6f0c4] px-5 py-4 text-center text-xl font-bold uppercase text-black shadow-[0_10px_20px_rgba(0,0,0,0.35)] ${
														isActive ? "ring-2 ring-red-400" : ""
													}`}
												>
													{isBottomBidder ? (
														<div className="flex flex-col items-center gap-2">
															<div className="flex items-center gap-2">
																<button
																	type="button"
																	onClick={() =>
																		handleBidInputChange(
																			bidAmount - bidDecrement
																		)
																	}
																	disabled={!canDecreaseBid}
																	className="rounded border border-black/30 px-2 py-1 text-lg font-bold text-black/70 disabled:opacity-40"
																>
																	-
																</button>
																<button
																	onClick={handleBid}
																	disabled={!canBid}
																	className="min-w-[60px] rounded border border-black/40 px-3 py-1 text-2xl font-bold text-black disabled:opacity-40"
																>
																	{bidAmount}
																</button>
																<button
																	type="button"
																	onClick={() =>
																		handleBidInputChange(bidAmount + bidStep)
																	}
																	disabled={!canBid}
																	className="rounded border border-black/30 px-2 py-1 text-lg font-bold text-black/70 disabled:opacity-40"
																>
																	+
																</button>
															</div>
															<button
																onClick={handlePassBid}
																disabled={!canBid}
																className="rounded border border-black/40 px-4 py-1 text-sm font-semibold uppercase text-black/80 disabled:opacity-40"
															>
																Pass
															</button>
														</div>
													) : (
														label
													)}
												</div>
											);
										}
									)}
								</>
							)}
						</div>
					</div>

					<div className="space-y-4">
						<div className="rounded-lg border border-white/10 bg-black/40 p-4 text-sm text-white/70">
							<div className="mb-2 text-xs uppercase tracking-[0.2em] text-white/60">
								Actions
							</div>
							<div className="flex flex-wrap gap-2">
								{isDealer && (
									<button
										onClick={handleDeal}
										className="rounded bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
										disabled={gameState?.phase === "playing"}
									>
										Deal
									</button>
								)}
								{gameState?.phase === "waiting" && (
									<button
										onClick={handleToggleReady}
										className="rounded bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
									>
										{myPlayer?.ready ? "Unready" : "Ready"}
									</button>
								)}
							</div>
							<label className="mt-3 flex items-center gap-2 text-xs text-white/70">
								<input
									type="checkbox"
									checked={autoReadyNextHand}
									onChange={(event) =>
										setAutoReadyNextHand(event.target.checked)
									}
									className="h-4 w-4 accent-emerald-400"
								/>
								Auto-ready for next deal
							</label>
							{gameState?.phase === "bid" && (
								<div className="mt-4 text-xs uppercase tracking-[0.2em] text-white/60">
									Bidding in progress...
								</div>
							)}
						</div>

						<DraggableChat socket={socketRef.current} scope="pinochle" />

						{process.env.NODE_ENV !== "production" && gameState && (
							<div className="rounded-lg border border-emerald-900 bg-black/70 p-4 text-xs text-emerald-200">
								<h2 className="text-sm font-semibold">[DEBUG] Game State</h2>
								<pre className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap break-all rounded border border-emerald-900 bg-black/60 p-2">
									{JSON.stringify(gameState, null, 2)}
								</pre>
							</div>
						)}
					</div>
				</div>

				<div className="mt-8 rounded-2xl border border-white/10 bg-black/50 p-4">
					<div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
						<span>Your Hand</span>
						<span>
							{canPlayCard
								? "Click a card to play."
								: "Waiting for your turn."}
						</span>
					</div>
					{handRows.length ? (
						<div className="space-y-3">
							{handRows.map((row, rowIndex) => (
								<div
									key={`hand-row-${rowIndex}`}
									className="flex flex-nowrap justify-center overflow-x-auto pb-2"
									style={{ gap: 0 }}
								>
									{row.map((card, idx) => {
										const globalIndex =
											rowIndex === 0 ? idx : idx + handRows[0].length;
										const normalized = normalizeCard(card);
										const isAllowed =
											!canPlayCard || allowedCardSet.has(card);
										const isSelected = selectedCardIndex === globalIndex;
										return (
											<button
												key={`${card.name || `${card.suit}-${globalIndex}`}`}
												onClick={() => {
													if (canPlayCard && isAllowed && myPlayer) {
														setPendingPlay({
															playerId: myPlayer.id,
															card,
														});
														emitWithGameId("PIN-pinochle_play_card", { card });
														setSelectedCardIndex(null);
														return;
													}
													setSelectedCardIndex((prev) =>
														prev === globalIndex ? null : globalIndex
													);
												}}
												className={`relative -ml-8 first:ml-0 focus:outline-none ${
													isSelected ? "z-20" : "z-10"
												} ${canPlayCard && !isAllowed ? "opacity-50" : ""}`}
												disabled={canPlayCard && !isAllowed}
											>
												<div
													className={`rounded-lg border-2 ${
														isSelected
															? "border-amber-400 shadow-[0_0_12px_rgba(252,211,77,0.8)]"
															: "border-transparent"
													}`}
												>
													{normalized ? (
														<Card
															scaleFactor={0.95}
															rank={normalized.rank}
															suit={normalized.suit}
															faceDown={false}
															animate={false}
														/>
													) : (
														<span className="text-xs text-white/60">
															Unknown
														</span>
													)}
												</div>
											</button>
										);
									})}
								</div>
							))}
						</div>
					) : (
						<div className="text-sm text-white/60">You have no cards yet.</div>
					)}
				</div>

				<div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-white/60">
					<button
						onClick={() => router.push("/game")}
						className="rounded bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
					>
						Back to Lobby
					</button>
					<div className="uppercase tracking-[0.2em]">
						{bidLeaderName ? `Bidder: ${bidLeaderName}` : "Waiting for bid"}
					</div>
				</div>
			</div>

			{showTrumpSelector && (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
					<div className="w-full max-w-lg rounded-2xl border border-black/60 bg-[#f6f0c4] p-6 text-black shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
						<div className="text-lg font-semibold uppercase tracking-[0.2em] text-black/70">
							Declare Trump
						</div>
						<div className="mt-4 grid grid-cols-2 gap-4">
							{availableTrumpSuits.map((suit) => (
								<button
									key={suit}
									onClick={() => handleSetTrump(suit)}
									className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-black/30 bg-white/80 px-4 py-6 text-sm font-semibold uppercase shadow-[0_8px_18px_rgba(0,0,0,0.25)] hover:bg-white"
								>
									<svg
										viewBox="0 0 48 48"
										className="h-12 w-12"
										aria-hidden
									>
										<path d={suitIcon(suit)} fill="currentColor" />
									</svg>
									{suit}
								</button>
							))}
						</div>
					</div>
				</div>
			)}

			{showMeldModal && (
				<div
					className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4"
					onClick={() => setShowMeldModal(false)}
				>
					<div
						className="w-full max-w-4xl rounded-2xl border border-black/60 bg-[#f7f5c6] p-6 text-black shadow-[0_26px_60px_rgba(0,0,0,0.55)]"
					>
						<div className="mb-4 text-lg font-semibold uppercase tracking-[0.2em] text-black/70">
							Meld Scoring
						</div>
						<div className="grid gap-6">
							{meldDisplayPlayers.map((player, index) => {
								const meldCards = player.meldCards || [];
								const teamTotal =
									player.team === "A"
										? gameState?.meldTeamA
										: gameState?.meldTeamB;
								const showTeamTotal = index === 0 || index === 2;
								return (
									<div
										key={`meld-${player.id}`}
										className="grid grid-cols-[180px_1fr_120px] items-center gap-6"
									>
										<div className="text-xl font-semibold text-black/80">
											{player.username}
										</div>
										<div className="flex flex-wrap gap-2">
											{meldCards.length ? (
												meldCards.map((card, cardIndex) => {
													const normalized = normalizeCard(card);
													return normalized ? (
														<Card
															key={`${player.id}-${cardIndex}`}
															scaleFactor={0.6}
															rank={normalized.rank}
															suit={normalized.suit}
															faceDown={false}
															animate={false}
														/>
													) : null;
												})
											) : (
												<div className="text-sm text-black/50">
													No meld cards.
												</div>
											)}
										</div>
										<div className="text-right text-2xl font-bold text-black/80">
											{player.meldScore ?? 0}
											{showTeamTotal && (
												<div className="mt-2 text-base font-semibold text-black/60">
													Team {player.team} total: {teamTotal ?? 0}
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
						<div className="mt-6 text-right text-xs uppercase tracking-[0.2em] text-black/60">
							Click anywhere to close
						</div>
					</div>
				</div>
			)}

			{showRoundRecap && (
				<div
					className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 px-4"
					onClick={() => setShowRoundRecap(false)}
				>
					<div
						className="w-full max-w-xl rounded-2xl border border-black/60 bg-[#f7f5c6] p-6 text-black shadow-[0_26px_60px_rgba(0,0,0,0.55)]"
					>
						<div className="mb-4 text-lg font-semibold uppercase tracking-[0.2em] text-black/70">
							Round Recap
						</div>
						<div className="grid grid-cols-[1fr_120px_120px] gap-y-4 text-xl font-semibold">
							<div />
							<div className="text-center">You</div>
							<div className="text-center">Them</div>

							<div>Bid</div>
							<div className="text-center">
								{bidderTeam === myTeam ? gameState?.roundBid ?? "-" : "-"}
							</div>
							<div className="text-center">
								{bidderTeam === opponentTeam
									? gameState?.roundBid ?? "-"
									: "-"}
							</div>

							<div>Meld</div>
							<div className="text-center">
								{myTeam === "A" ? teamStats.teamA.meld : teamStats.teamB.meld}
							</div>
							<div className="text-center">
								{myTeam === "A" ? teamStats.teamB.meld : teamStats.teamA.meld}
							</div>

							<div>Needed</div>
							<div className="text-center">
								{bidderTeam === myTeam ? tricksNeeded : "-"}
							</div>
							<div className="text-center">
								{bidderTeam === opponentTeam ? tricksNeeded : "-"}
							</div>

							<div>Tricks</div>
							<div className="text-center">
								{myTeam === "A" ? teamStats.teamA.tricks : teamStats.teamB.tricks}
							</div>
							<div className="text-center">
								{myTeam === "A" ? teamStats.teamB.tricks : teamStats.teamA.tricks}
							</div>

							<div className="border-t border-black/30 pt-3">Total</div>
							<div className="border-t border-black/30 pt-3 text-center">
								{myTeam === "A" ? teamStats.teamA.total : teamStats.teamB.total}
							</div>
							<div className="border-t border-black/30 pt-3 text-center">
								{myTeam === "A" ? teamStats.teamB.total : teamStats.teamA.total}
							</div>

							<div className="border-t border-black/30 pt-3">Score</div>
							<div className="border-t border-black/30 pt-3 text-center">
								{myTeam === "A" ? teamStats.teamA.score : teamStats.teamB.score}
							</div>
							<div className="border-t border-black/30 pt-3 text-center">
								{myTeam === "A" ? teamStats.teamB.score : teamStats.teamA.score}
							</div>
						</div>
						<div className="mt-6 text-right text-xs uppercase tracking-[0.2em] text-black/60">
							Click anywhere to close
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
