import { Namespace } from "socket.io";
import { Card } from "@game/classes";
import { PinochleDeck, PinochleCard } from "@game/pinochle";
import { DeterminePlayableCards } from "@game/pinochleRules";

export function buildPinochlePlayerState(
	id: string,
	username: string,
	seatNumber: number,
	avatar?: string
): PinochlePlayerState {
	return {
		id,
		username,
		seatNumber,
		team: seatNumber % 2 === 0 ? "A" : "B",
		ready: false,
		cards: [],
		tricksWon: 0,
		meldScore: 0,
		meldCards: [],
		totalScore: 0,
		passedBid: false,
		roundPoints: 0,
	};
}

export function buildPinochleState(game?: PinochleGame | null) {
	if (!game) return null;
	return {
		id: game.id,
		name: game.name,
		wagerPerGame: game.wagerPerGame ?? 0,
		players: game.players.map((p) => ({
			id: p.id,
			username: p.username,
			seatNumber: p.seatNumber,
			team: p.team,
			ready: p.ready,
			cards: sortPinochleHand(p.cards, game.trumpSuit),
			tricksWon: p.tricksWon,
			meldScore: p.meldScore,
			meldCards: p.meldCards,
			totalScore: p.totalScore,
			passedBid: p.passedBid,
			roundPoints: p.roundPoints,
		})),
		phase: game.phase,
		status: game.status,
		dealerId: game.dealerId,
		activePlayerId: game.activePlayerId,
		roundBid: game.roundBid || undefined,
		bidLeaderId: game.bidLeaderId,
		biddingTeam: game.biddingTeam,
		trumpSuit: game.trumpSuit ?? null,
		trick: game.trick,
		scoreTeamA: game.scoreTeamA,
		scoreTeamB: game.scoreTeamB,
		meldTeamA: game.meldTeamA,
		meldTeamB: game.meldTeamB,
		trickPointsTeamA: game.trickPointsTeamA,
		trickPointsTeamB: game.trickPointsTeamB,
		setsTeamA: game.setsTeamA,
		setsTeamB: game.setsTeamB,
		deckCount: game.deck?.cards?.length ?? 0,
	};
}

export function handlePinochleJoin({
	socket,
	io,
	gameId,
	user,
	gamesArray,
	pinochleGames,
	broadcastGamesList,
	pendingReconnects,
}: {
	socket: any;
	io: Namespace;
	gameId: string;
	user: any;
	gamesArray: ListEntry[];
	pinochleGames: Record<string, PinochleGame>;
	broadcastGamesList: () => void;
	pendingReconnects?: Map<
		string,
		{
			userId: string;
			gameId: string;
			timestamp: number;
			timeout: NodeJS.Timeout;
		}
	>;
}) {
	const reconnectKey =
		user?.username && gameId ? `${gameId}${user.username}` : null;

	if (reconnectKey && pendingReconnects?.has(reconnectKey)) {
		const reconnectData = pendingReconnects.get(reconnectKey);
		if (reconnectData?.timeout) {
			clearTimeout(reconnectData.timeout);
		}
		pendingReconnects.delete(reconnectKey);
		console.log(
			`User ${user.username} reconnected to pinochle game ${gameId}`
		);
	}

	const game = pinochleGames[gameId];
	if (!game) {
		socket.emit("COM-error", { message: "Game not found" });
		return;
	}

	// Allow reconnect by username
	const existingPlayer = game.players.find((p) => p.username === user.username);
	if (existingPlayer) {
		existingPlayer.id = socket.id;
		existingPlayer.ready = false;
	} else {
		if (game.players.length >= 4) {
			socket.emit("COM-error", { message: "Game is full" });
			return;
		}
		const takenSeats = new Set(game.players.map((p) => p.seatNumber));
		let seatNumber = 0;
		for (let i = 0; i < 4; i++) {
			if (!takenSeats.has(i)) {
				seatNumber = i;
				break;
			}
		}
		const newPlayer = buildPinochlePlayerState(
			socket.id,
			user.username,
			seatNumber,
			user.avatar || user.avatar_url
		);
		game.players.push(newPlayer);
		game.players.sort((a, b) => a.seatNumber - b.seatNumber);
	}

	if (!game.dealerId) {
		game.dealerIndex = 0;
		game.dealerId = game.players[0].id;
	}

	socket.join(gameId);

	// Update games list entry
	const gameIndex = gamesArray.findIndex((g) => g.id === gameId);
	if (gameIndex !== -1) {
		gamesArray[gameIndex].playerCount = game.players.length;
		gamesArray[gameIndex].isStarted = game.roundActive;
	} else {
		gamesArray.push({
			index: gamesArray.length,
			id: gameId,
			name: game.name,
			playerCount: game.players.length,
			maxPlayers: 4,
			isStarted: game.roundActive,
			gameType: "Pinochle",
		});
	}

	const state = buildPinochleState(game);
	socket.emit("PIN-pinochle_state", state);
	io.to(gameId).emit("PIN-pinochle_update", state);
	broadcastGamesList();
}

export function handlePinochleReady(
	game: PinochleGame,
	socket,
	io: Namespace,
	gamesArray?: ListEntry[],
	broadcastGamesList?: () => void
) {
	if (!game) return;
	const player = game.players.find((p) => p.id === socket.id);
	if (!player) {
		socket.emit("COM-error", { message: "Player not found" });
		return;
	}
	player.ready = !player.ready;

	io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));

	const allReady =
		game.players.length === 4 && game.players.every((p) => p.ready);
	if (allReady && game.phase === "waiting") {
		startPinochleRound(game, io, gamesArray, broadcastGamesList);
	}
}

export function startPinochleRound(
	game: PinochleGame,
	io: Namespace,
	gamesArray?: ListEntry[],
	broadcastGamesList?: () => void
) {
	if (!game || game.players.length !== 4) return;
	const readyToStart = game.players.length === 4 && game.players.every((p) => p.ready);
	if (!readyToStart) {
		io.to(game.id).emit("COM-error", {
			message: "Four ready players are required to start a round.",
		});
		return;
	}
	if (game.roundActive) return;
	game.roundNumber += 1;
	game.roundActive = true;
	game.phase = "dealing";
	game.status = "dealing";
	game.trumpSuit = null;
	game.roundBid = 49; // next bid after this is 50
	game.bidLeaderId = undefined;
	game.biddingTeam = undefined;
	game.trick = { leadSuit: null, cards: [] };
	game.trickPointsTeamA = 0;
	game.trickPointsTeamB = 0;
	game.meldTeamA = 0;
	game.meldTeamB = 0;

	// Reset per-player round state
	game.players.forEach((p) => {
		p.cards = [];
		p.tricksWon = 0;
		p.passedBid = false;
		p.meldScore = 0;
		p.meldCards = [];
		p.roundPoints = 0;
		if (game.roundNumber > 1) p.ready = false;
	});

	dealPinochleHands(game);

	const nextIndex = (game.dealerIndex + 1) % game.players.length;
	game.activePlayerIndex = nextIndex;
	game.activePlayerId = game.players[nextIndex].id;
	game.phase = "bid";
	game.status = "bidding";

	if (gamesArray) {
		const listEntry = gamesArray.find((g) => g.id === game.id);
		if (listEntry) {
			listEntry.isStarted = true;
		}
		broadcastGamesList?.();
	}

	io.to(game.id).emit("PIN-pinochle_hand_dealt", buildPinochleState(game));
	io.to(game.id).emit("PIN-pinochle_bid_update", {
		roundBid: game.roundBid,
		activePlayerId: game.activePlayerId,
		bidLeaderId: game.bidLeaderId,
	});
	io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));
}

export function dealPinochleHands(game: PinochleGame) {
	game.deck = new PinochleDeck();
	game.deck.shuffle();

	for (let r = 0; r < 4; r++) {
		for (let p = 0; p < game.players.length; p++) {
			const currentPosition = (game.dealerIndex + 1) % game.players.length;
			const playerIndex = (currentPosition + p) % game.players.length;
			const player = game.players[playerIndex];
			const drawFive: PinochleCard[] = [];
			for (let i = 0; i < 5; i++) {
				const card = game.deck.draw();
				card.faceUp = false;
				drawFive.push(card);
			}
			drawFive.forEach((card) => player.cards.push(card));
		}
	}

	game.players.forEach((player) => {
		player.cards = sortPinochleHand(player.cards);
	});
}

export function handlePinochleBid(
	game: PinochleGame,
	socket,
	io: Namespace,
	amount: number
) {
	if (!game || game.phase !== "bid" || game.activePlayerId !== socket.id) {
		socket.emit("COM-error", { message: "Not your turn to bid" });
		return;
	}
	const player = game.players.find((p) => p.id === socket.id);
	if (!player) {
		socket.emit("COM-error", { message: "Player not found" });
		return;
	}

	const normalized = normalizePinochleBid(amount);
	const minBid = nextPinochleBid(game.roundBid || 49);
	if (normalized < minBid) {
		socket.emit("COM-error", { message: `Minimum bid is ${minBid}` });
		return;
	}

	game.roundBid = normalized;
	game.bidLeaderId = player.id;
	game.biddingTeam = player.team;
	player.passedBid = false;

	const remaining = game.players.filter((p) => !p.passedBid).length;
	if (remaining > 1) {
		const nextIndex = findNextActiveBidder(game, player.seatNumber);
		game.activePlayerIndex = nextIndex;
		game.activePlayerId = game.players[nextIndex].id;
	} else {
		// Only one bidder left, await trump selection from bid leader
		game.activePlayerIndex = game.players.findIndex(
			(p) => p.id === game.bidLeaderId
		);
		game.activePlayerId = game.bidLeaderId;
		game.status = "awaiting_trump";
	}

	io.to(game.id).emit("PIN-pinochle_bid_update", {
		roundBid: game.roundBid,
		bidLeaderId: game.bidLeaderId,
		biddingTeam: game.biddingTeam,
		activePlayerId: game.activePlayerId,
		trumpSuit: game.trumpSuit,
	});
	io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));
}

export function handlePinochleBidPass(game: PinochleGame, socket, io: Namespace) {
	if (!game || game.phase !== "bid") return;
	const player = game.players.find((p) => p.id === socket.id);
	if (!player) {
		socket.emit("COM-error", { message: "Player not found" });
		return;
	}
	player.passedBid = true;

	const remainingPlayers = game.players.filter((p) => !p.passedBid);
	if (remainingPlayers.length === 0) {
		game.status = "All players passed. Redeal.";
		game.roundActive = false;
		game.phase = "waiting";
		io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));
		return;
	}

	if (remainingPlayers.length === 1) {
		const lastBidder = remainingPlayers[0];
		game.bidLeaderId = lastBidder.id;
		game.biddingTeam = lastBidder.team;
		if (game.roundBid < 50) game.roundBid = 50;
		game.activePlayerId = lastBidder.id;
		game.activePlayerIndex = game.players.findIndex(
			(p) => p.id === lastBidder.id
		);
		game.status = "awaiting_trump";
	} else {
		const nextIndex = findNextActiveBidder(game, player.seatNumber);
		game.activePlayerIndex = nextIndex;
		game.activePlayerId = game.players[nextIndex].id;
	}

	game.phase = "bid";
	io.to(game.id).emit("PIN-pinochle_bid_update", {
		roundBid: game.roundBid,
		bidLeaderId: game.bidLeaderId,
		biddingTeam: game.biddingTeam,
		activePlayerId: game.activePlayerId,
		trumpSuit: game.trumpSuit,
	});
	io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));
}

export function handlePinochleSetTrump(
	game: PinochleGame,
	socket,
	io: Namespace,
	trump: Suit
) {
	if (!game || game.phase !== "bid" || game.bidLeaderId !== socket.id) {
		socket.emit("COM-error", { message: "You cannot set trump now" });
		return;
	}
	const player = game.players.find((p) => p.id === socket.id);
	if (!player) {
		socket.emit("COM-error", { message: "Player not found" });
		return;
	}

	const marriageSuits = getMarriageSuits(player.cards);
	if (marriageSuits.length === 0) {
		game.status = "Bidder had no marriages - automatic set";
		completePinochleRound(game, io, { bidderAutoSet: true });
		return;
	}
	if (!marriageSuits.includes(trump)) {
		socket.emit("COM-error", {
			message: `Invalid trump. You must choose a suit where you have a marriage.`,
		});
		return;
	}

	game.trumpSuit = trump;
	game.players.forEach((p) => {
		p.cards = sortPinochleHand(p.cards, trump);
	});
	game.phase = "playing";
	game.status = "playing";

	game.meldTeamA = 0;
	game.meldTeamB = 0;
	game.players.forEach((p) => {
		const meldResult = calculatePinochleMeld(p.cards, trump);
		p.meldScore = meldResult.total;
		p.meldCards = meldResult.meldCards;
		if (p.team === "A") game.meldTeamA += p.meldScore;
		else game.meldTeamB += p.meldScore;
	});

	game.activePlayerIndex = game.players.findIndex(
		(p) => p.id === game.bidLeaderId
	);
	game.activePlayerId = game.bidLeaderId;
	game.trick = { leadSuit: null, cards: [] };

	io.to(game.id).emit("PIN-pinochle_bid_update", {
		roundBid: game.roundBid,
		bidLeaderId: game.bidLeaderId,
		biddingTeam: game.biddingTeam,
		trumpSuit: game.trumpSuit,
		activePlayerId: game.activePlayerId,
	});
	io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));
}

export function handlePinochlePlayCard(
	game: PinochleGame,
	socket,
	io: Namespace,
	payloadCard: any
) {
	if (!game || game.phase !== "playing") return;
	if (game.activePlayerId !== socket.id) {
		socket.emit("COM-error", { message: "Not your turn" });
		return;
	}
	const playerIndex = game.players.findIndex((p) => p.id === socket.id);
	if (playerIndex === -1) {
		socket.emit("COM-error", { message: "Player not found" });
		return;
	}
	const player = game.players[playerIndex];

	const selectedIndex = findCardIndex(player.cards, payloadCard);
	if (selectedIndex === -1) {
		socket.emit("COM-error", { message: "Card not in hand" });
		return;
	}

	const allowed = getAllowedPinochleCards(
		player.cards,
		game.trick,
		game.trumpSuit
	);
	const selectedCard = player.cards[selectedIndex];
	if (!allowed.some((c) => c === selectedCard)) {
		socket.emit("COM-error", { message: "You must follow suit / beat if able" });
		return;
	}

	// Play the card
	selectedCard.faceUp = true;
	player.cards.splice(selectedIndex, 1);
	if (game.trick.cards.length === 0) {
		game.trick.leadSuit = selectedCard.suit;
	}
	game.trick.cards.push({ playerId: player.id, card: selectedCard });

	// Determine next action
	if (game.trick.cards.length === game.players.length) {
		// Complete trick
		const winner = determineTrickWinner(
			game.trick,
			game.trumpSuit,
			game.players
		);
		const winnerPlayer = game.players.find((p) => p.id === winner.playerId);
		if (winnerPlayer) winnerPlayer.tricksWon += 1;

		const trickPoints = game.trick.cards.reduce((sum, entry) => {
			return ["ace", "ten", "king"].includes(entry.card.rank as string)
				? sum + 1
				: sum;
		}, 0);

		if (winnerPlayer?.team === "A") game.trickPointsTeamA += trickPoints;
		else if (winnerPlayer?.team === "B") game.trickPointsTeamB += trickPoints;

		const isLastTrick = game.players.every((p) => p.cards.length === 0);
		if (isLastTrick && winnerPlayer) {
			if (winnerPlayer.team === "A") game.trickPointsTeamA += 2;
			else game.trickPointsTeamB += 2;
		}

		io.to(game.id).emit("PIN-pinochle_trick_complete", {
			trick: game.trick,
			winnerPlayerId: winner.playerId,
		});

		game.trick = { leadSuit: null, cards: [] };
		game.activePlayerId = winner.playerId;
		game.activePlayerIndex = game.players.findIndex(
			(p) => p.id === winner.playerId
		);

		io.to(game.id).emit("PIN-pinochle_trick_update", {
			trick: game.trick,
			activePlayerId: game.activePlayerId,
		});
		io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));

		if (isLastTrick) {
			completePinochleRound(game, io);
		}
	} else {
		// Pass turn to next player clockwise
		game.activePlayerIndex = (game.activePlayerIndex! + 1) % game.players.length;
		game.activePlayerId = game.players[game.activePlayerIndex].id;
		io.to(game.id).emit("PIN-pinochle_trick_update", {
			trick: game.trick,
			activePlayerId: game.activePlayerId,
		});
		io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));
	}
}

export function completePinochleRound(
	game: PinochleGame,
	io: Namespace,
	options: { bidderAutoSet?: boolean } = {}
) {
	if (!game) return;
	const biddingTeam = game.biddingTeam;
	if (!biddingTeam) {
		game.phase = "waiting";
		game.status = "No bid winner";
		game.roundActive = false;
		io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));
		return;
	}
	const bidderPoints =
		biddingTeam === "A" ? game.trickPointsTeamA : game.trickPointsTeamB;
	const bidderMeld =
		biddingTeam === "A" ? game.meldTeamA : game.meldTeamB;
	const defenderPoints =
		biddingTeam === "A" ? game.trickPointsTeamB : game.trickPointsTeamA;
	const defenderMeld =
		biddingTeam === "A" ? game.meldTeamB : game.meldTeamA;

	const isAutoSet = !!options.bidderAutoSet;
	const required = Math.max(game.roundBid - bidderMeld, 20);
	const bidderMetBid = !isAutoSet && bidderPoints >= required;

	let bidderGain = bidderMetBid ? bidderPoints + bidderMeld : 0;
	let defenderGain =
		!isAutoSet && defenderMeld >= 20 && defenderPoints >= 20
			? defenderPoints + defenderMeld
			: 0;

	if (biddingTeam === "A") {
		if (bidderGain > 0) {
			game.scoreTeamA += bidderGain;
		} else {
			game.setsTeamA += 1;
			game.scoreTeamA -= game.roundBid;
		}
		game.scoreTeamB += defenderGain;
	} else {
		if (bidderGain > 0) {
			game.scoreTeamB += bidderGain;
		} else {
			game.setsTeamB += 1;
			game.scoreTeamB -= game.roundBid;
		}
		game.scoreTeamA += defenderGain;
	}

	game.phase = "scoring";
	game.status = bidderGain > 0 ? "round_complete" : "bid_set";
	game.roundActive = false;

	const winner = determinePinochleWinner(game, biddingTeam);
	if (winner) {
		game.phase = "postgame";
		game.status = "game_complete";
		io.to(game.id).emit("PIN-pinochle_game_end", {
			...buildPinochleState(game),
			winner,
		});
	} else {
		rotateDealer(game);
		io.to(game.id).emit("PIN-pinochle_round_end", buildPinochleState(game));
		game.phase = "waiting";
		game.trumpSuit = null;
		game.roundBid = 0;
		game.bidLeaderId = undefined;
		game.biddingTeam = undefined;
		game.trick = { leadSuit: null, cards: [] };
		game.players.forEach((p) => {
			p.passedBid = false;
			p.ready = false;
			p.cards = [];
			p.tricksWon = 0;
			p.meldCards = [];
			p.meldScore = 0;
			p.roundPoints = 0;
		});
		io.to(game.id).emit("PIN-pinochle_update", buildPinochleState(game));
	}
}

export function determinePinochleWinner(game: PinochleGame, biddingTeam?: TeamId) {
	const { scoreTeamA, scoreTeamB, setsTeamA, setsTeamB } = game;
	if (setsTeamA >= 2 && setsTeamB >= 2) return biddingTeam;
	if (setsTeamA >= 2) return "B";
	if (setsTeamB >= 2) return "A";
	if (scoreTeamA >= 350 && scoreTeamB >= 350) return biddingTeam;
	if (scoreTeamA >= 350) return "A";
	if (scoreTeamB >= 350) return "B";
	return null;
}

export function rotateDealer(game: PinochleGame) {
	game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
	game.dealerId = game.players[game.dealerIndex].id;
}

export function findNextActiveBidder(game: PinochleGame, currentSeat: number) {
	for (let i = 1; i <= game.players.length; i++) {
		const idx = (currentSeat + i) % game.players.length;
		if (!game.players[idx].passedBid) return idx;
	}
	return game.activePlayerIndex ?? 0;
}

export function normalizePinochleBid(raw: number): number {
	let bid = Math.max(50, Math.floor(raw || 0));
	if (bid <= 60) return bid;
	if (bid < 100) return 60 + Math.floor((bid - 60) / 5) * 5;
	return 100 + Math.floor((bid - 100) / 10) * 10;
}

export function nextPinochleBid(current: number): number {
	const increment = current >= 100 ? 10 : current >= 60 ? 5 : 1;
	const candidate = current + increment;
	return normalizePinochleBid(candidate);
}

export function sortPinochleHand(hand: PinochleCard[], trumpSuit?: Suit | null): PinochleCard[] {
  if (!Array.isArray(hand)) return [];
  const present = new Set(hand.map((card) => card.suit));
  const prefByColor: Record<"black" | "red", Suit[]> = {
    black: ["spades", "clubs"],
    red: ["hearts", "diamonds"],
  };
  const suitColor = (suit: Suit): "black" | "red" =>
    suit === "spades" || suit === "clubs" ? "black" : "red";

  let suitOrder: Suit[];
  if (trumpSuit && present.has(trumpSuit)) {
    const remaining = new Set(present);
    const order: Suit[] = [];
    const addSuit = (s: Suit) => {
      order.push(s);
      remaining.delete(s);
    };
    addSuit(trumpSuit);

    let needColor: "black" | "red" =
      suitColor(trumpSuit) === "black" ? "red" : "black";

    while (remaining.size > 0) {
      let candidates = Array.from(remaining).filter(
        (suit) => suitColor(suit) === needColor
      );
      if (candidates.length === 0) {
        candidates = Array.from(remaining);
      }
      const preference = prefByColor[needColor];
      const next =
        candidates.find((suit) => preference.includes(suit)) || candidates[0];
      addSuit(next);
      needColor = suitColor(next) === "black" ? "red" : "black";
    }
    suitOrder = order;
  } else {
    const candidates: Suit[][] = [
      ["spades", "hearts", "clubs", "diamonds"], // B R B R
      ["hearts", "spades", "diamonds", "clubs"], // R B R B
    ];

    const scoredCandidates = candidates.map((order, idx) => {
      const filtered = order.filter((suit) => present.has(suit));
      const firstPos = order.findIndex((suit) => present.has(suit));
      return {
        filtered,
        presentCount: filtered.length,
        firstPos: firstPos === -1 ? Number.MAX_SAFE_INTEGER : firstPos,
        index: idx,
      };
    });

    const best =
      scoredCandidates.reduce((bestSoFar, candidate) => {
        if (candidate.presentCount > bestSoFar.presentCount) return candidate;
        if (
          candidate.presentCount === bestSoFar.presentCount &&
          candidate.firstPos < bestSoFar.firstPos
        )
          return candidate;
        return bestSoFar;
      }, scoredCandidates[0]) || scoredCandidates[0];

    suitOrder = best.filtered;
  }
  const rankOrder: PinochleRank[] = ["ace", "ten", "king", "queen", "jack"];
  const rankWeight = (rank: Rank) => {
    const idx = rankOrder.indexOf(rank);
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
  };
  return suitOrder.flatMap((suit) =>
    hand
      .filter((card) => card.suit === suit)
      .sort(
        (a, b) =>
          rankWeight(a.rank as PinochleRank) -
          rankWeight(b.rank as PinochleRank)
      )
  );
}

export function getMarriageSuits(hand: PinochleCard[]): Suit[] {
  const suits: Suit[] = ["spades", "clubs", "hearts", "diamonds"];
  const hasMarriage = (suit: Suit) => {
    const kings = hand.filter(
      (c) => c.suit === suit && c.rank === "king"
    ).length;
    const queens = hand.filter(
      (c) => c.suit === suit && c.rank === "queen"
    ).length;
    return Math.min(kings, queens) > 0;
  };
  return suits.filter(hasMarriage);
}

export function calculatePinochleMeld(
  hand: PinochleCard[],
  trumpSuit: Suit
): {
  total: number;
  meldCards: PinochleCard[];
  meldCount: MeldCount;
} {
  const meldCount = countMeldTypes(hand, trumpSuit);
  const meldCards = determineMeldCards(hand, trumpSuit, meldCount);
  const total = scoreMeld(meldCount);
  return { total, meldCards, meldCount };
}

export function countMeldTypes(hand: PinochleCard[], trumpSuit: Suit): MeldCount {
  const countAround = (rank: Rank) => {
    const suits: Suit[] = ["spades", "clubs", "hearts", "diamonds"];
    const perSuit = suits.map(
      (suit) =>
        hand.filter((card) => card.suit === suit && card.rank === rank).length
    );
    return Math.min(...perSuit);
  };
  const pinochleSets = Math.min(
    hand.filter((c) => c.suit === "spades" && c.rank === "queen").length,
    hand.filter((c) => c.suit === "diamonds" && c.rank === "jack").length
  );

  const runRanks: PinochleRank[] = ["ace", "ten", "king", "queen", "jack"];
  const trumpCounts = runRanks.map(
    (rank) => hand.filter((c) => c.suit === trumpSuit && c.rank === rank).length
  );
  const trumpRuns = Math.min(...trumpCounts);

  const marriageCount = (suit: Suit) => {
    const kings = hand.filter(
      (c) => c.suit === suit && c.rank === "king"
    ).length;
    const queens = hand.filter(
      (c) => c.suit === suit && c.rank === "queen"
    ).length;
    const base = Math.min(kings, queens);
    return base * (suit === trumpSuit ? 4 : 2);
  };

  return {
    acesAround: countAround("ace"),
    kingsAround: countAround("king"),
    queensAround: countAround("queen"),
    jacksAround: countAround("jack"),
    pinochles: pinochleSets,
    trumpRuns,
    marriages: {
      spades: marriageCount("spades"),
      clubs: marriageCount("clubs"),
      hearts: marriageCount("hearts"),
      diamonds: marriageCount("diamonds"),
    },
  };
}

export function scoreMeld(meldObject: MeldCount): number {
	let totalMeld = 0;

	switch (meldObject.acesAround) {
		case 1:
			totalMeld += 10;
			break;
		case 2:
			totalMeld += 100;
			break;
		case 3:
			totalMeld += 200;
			break;
		case 4:
			totalMeld += 300;
			break;
	}

	switch (meldObject.kingsAround) {
		case 1:
			totalMeld += 8;
			break;
		case 2:
			totalMeld += 80;
			break;
		case 3:
			totalMeld += 160;
			break;
		case 4:
			totalMeld += 240;
			break;
	}

	switch (meldObject.queensAround) {
		case 1:
			totalMeld += 6;
			break;
		case 2:
			totalMeld += 60;
			break;
		case 3:
			totalMeld += 120;
			break;
		case 4:
			totalMeld += 180;
			break;
	}

	switch (meldObject.jacksAround) {
		case 1:
			totalMeld += 4;
			break;
		case 2:
			totalMeld += 40;
			break;
		case 3:
			totalMeld += 80;
			break;
		case 4:
			totalMeld += 120;
			break;
	}

	switch (meldObject.pinochles) {
		case 1:
			totalMeld += 4;
			break;
		case 2:
			totalMeld += 30;
			break;
		case 3:
			totalMeld += 90;
			break;
		case 4:
			totalMeld += 300;
			break;
	}

	switch (meldObject.trumpRuns) {
		case 1:
			totalMeld += 11;
			break;
		case 2:
			totalMeld += 142;
			break;
		case 3:
			totalMeld += 288;
			break;
		case 4:
			totalMeld += 334;
			break;
	}

	totalMeld += meldObject.marriages.spades;
	totalMeld += meldObject.marriages.clubs;
	totalMeld += meldObject.marriages.hearts;
	totalMeld += meldObject.marriages.diamonds;

	return totalMeld;
}

export function determineMeldCards(
  hand: PinochleCard[],
  trumpSuit: Suit,
  meldObject: MeldCount
): PinochleCard[] {
  const suits: Suit[] = ["spades", "clubs", "hearts", "diamonds"];
  const highlight = new Set<PinochleCard>();
  const cardsBySuit: Record<Suit, PinochleCard[]> = {
    spades: hand.filter((card) => card.suit === "spades"),
    clubs: hand.filter((card) => card.suit === "clubs"),
    hearts: hand.filter((card) => card.suit === "hearts"),
    diamonds: hand.filter((card) => card.suit === "diamonds"),
  };
  const bySuitAndRank = (suit: Suit, rank: Rank) =>
    cardsBySuit[suit].filter((card) => card.rank === rank);
  const addFirstN = (cards: PinochleCard[], n: number) => {
    for (let i = 0; i < Math.min(n, cards.length); i++) {
      highlight.add(cards[i]);
    }
  };

  const addAround = (rank: PinochleRank, count: number) => {
    const perSuit = suits.map((suit) => bySuitAndRank(suit, rank));
    for (let i = 0; i < count; i++) {
      perSuit.forEach((arr) => arr[i] && highlight.add(arr[i]));
    }
  };

  addAround("ace", meldObject.acesAround);
  addAround("king", meldObject.kingsAround);
  addAround("queen", meldObject.queensAround);
  addAround("jack", meldObject.jacksAround);

  const queensSpades = bySuitAndRank("spades", "queen");
  const jacksDiamonds = bySuitAndRank("diamonds", "jack");
  const pinochleSets = Math.min(queensSpades.length, jacksDiamonds.length);
  for (let i = 0; i < pinochleSets; i++) {
    highlight.add(queensSpades[i]);
    highlight.add(jacksDiamonds[i]);
  }

  const runRanks: PinochleRank[] = ["ace", "ten", "king", "queen", "jack"];
  const trumpRankCards = runRanks.map((rank) => bySuitAndRank(trumpSuit, rank));
  const runSets = Math.min(...trumpRankCards.map((arr) => arr.length));
  for (let i = 0; i < runSets; i++) {
    trumpRankCards.forEach((arr) => highlight.add(arr[i]));
  }

  suits.forEach((suit) => {
    const kings = bySuitAndRank(suit, "king");
    const queens = bySuitAndRank(suit, "queen");
    const marriageSets = Math.min(kings.length, queens.length);
    for (let i = 0; i < marriageSets; i++) {
      highlight.add(kings[i]);
      highlight.add(queens[i]);
    }
  });

  return Array.from(highlight);
}

export function getAllowedPinochleCards(
	playerHand: PinochleCard[],
	trick: PinochleTrickState,
	trumpSuit: Suit | null | undefined
): PinochleCard[] {
	if (!trumpSuit) return playerHand;
	if (trick.cards.length === 0) return playerHand;
	const leadingCards = trick.cards.map((entry) => entry.card);
	return DeterminePlayableCards(playerHand, leadingCards, trumpSuit);
}

export function findCardIndex(hand: Card[], payload: any): number {
	if (!payload) return -1;
	const targetSuit: Suit | undefined = payload.suit;
	const targetRank: Rank | undefined = payload.rank;
	const targetName: string | undefined = payload.name;
	return hand.findIndex((card) => {
		if (targetSuit && targetRank) {
			return card.suit === targetSuit && card.rank === targetRank;
		}
		if (targetName && targetName.length >= 2) {
			const rankCode = targetName[0];
			const suitCode = targetName[1];
			const rankMap: Record<string, Rank> = {
				A: "ace",
				K: "king",
				Q: "queen",
				J: "jack",
				T: "ten",
				9: "nine",
			};
			const suitMap: Record<string, Suit> = {
				S: "spades",
				H: "hearts",
				D: "diamonds",
				C: "clubs",
			};
			return (
				card.rank === rankMap[rankCode?.toUpperCase()] &&
				card.suit === suitMap[suitCode?.toUpperCase()]
			);
		}
		return false;
	});
}

export function determineTrickWinner(
	trick: PinochleTrickState,
	trumpSuit: Suit | null | undefined,
	players: PinochlePlayerState[]
): { playerId: string } {
	const leadSuit = trick.leadSuit;
	const cards = trick.cards;
	let contenders = cards;
	if (trumpSuit) {
		const trumpCards = cards.filter((c) => c.card.suit === trumpSuit);
		if (trumpCards.length > 0) contenders = trumpCards;
		else contenders = cards.filter((c) => c.card.suit === leadSuit);
	} else {
		contenders = cards.filter((c) => c.card.suit === leadSuit);
	}
	const winning = contenders.reduce((best, current) => {
		if (!best) return current;
		return current.card.getValue() > best.card.getValue()
			? current
			: best;
	}, contenders[0]);
	return { playerId: winning.playerId };
}
