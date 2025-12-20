import { Namespace } from "socket.io";
import { Game, Player } from "@game/classes";
import { evaluateHand } from "@game/utils";
import { updatePlayerStats } from "@lib/database";
import { insertTimestamp } from "./common";

export function checkRoundStatus(game: Game, io: Namespace) {
	// Sort players to ensure consistent order
	game.sortPlayerList();

	// Count ready players
	const readyPlayers = game.players.filter((p) => p.ready).length;
	const totalPlayers = game.players.length;

	console.log(
		`Checking round status: ${totalPlayers} players, ${readyPlayers} ready`
	);

	// Check if all players are ready and we're in waiting status
	if (game.status === "waiting" && game.roundCount === 0) {
		const allReady = game.players.every(isReady);
		const enoughPlayers = totalPlayers >= 2;

		console.log(
			`Waiting status check: ${totalPlayers} players, all ready: ${allReady}`
		);

		if (enoughPlayers && allReady) {
			console.log(`All players are ready. Starting game...`);
			game.status = "playing";
			game.hasStarted = true;

			// Announce game starting to all players
			if (game.id) {
				io.to(game.id).emit("POK-game_starting", {
					message: "All players ready! Game is starting...",
					game: game.returnGameState(),
				});

				// Start the game after a short delay to allow clients to update UI
				setTimeout(() => {
					// Start the game round
					game.startRound();

					// Send the initial game state to all players
					io.to(game.id).emit("POK-game_update", {
						game: game.returnGameState(),
						message: "Game has started!",
					});

					// Notify the active player it's their turn
					if (game.activePlayerId) {
						io.to(game.activePlayerId).emit("POK-your_turn", {
							gameId: game.id,
							allowedActions: game.getAllowedActionsForPlayer(
								game.activePlayerId
							),
						});
					}
				}, 1000);
			}
		}
	}

	// If we're already playing and need to check player readiness between rounds
	if (
		game.status === "playing" &&
		game.phase === "waiting" &&
		game.roundCount > 1
	) {
		const allReady = game.players.every(isReady);
		const enoughPlayers = totalPlayers >= 2;

		console.log(
			`Between rounds check: ${totalPlayers} players, all ready: ${allReady}`
		);

		if (enoughPlayers && allReady) {
			console.log(
				`All players are ready for next round. Starting new round...`
			);

			// Announce new round starting
			if (game.id) {
				io.to(game.id).emit("POK-round_starting", {
					message: "All players ready! New round is starting...",
					game: game.returnGameState(),
				});

				// Start the next round after a short delay
				setTimeout(() => {
					game.startRound();

					// Send the updated game state to all players
					io.to(game.id).emit("POK-game_update", {
						game: game.returnGameState(),
						message: "New round has started!",
					});

					// Notify the active player it's their turn
					if (game.activePlayerId) {
						io.to(game.activePlayerId).emit("POK-your_turn", {
							gameId: game.id,
							allowedActions: game.getAllowedActionsForPlayer(
								game.activePlayerId
							),
						});
					}
				}, 1000);
			}
		}
	}
}

export function isReady(player) {
	return player.ready;
}

// Add a function to determine allowed actions for a player
export function getAllowedActions(game, playerId) {
	const player: Player = game.players.find((p) => p.id === playerId);
	if (!player) {
		console.log(`Player not found`);
		return [];
	}

	// Don't allow any actions if it's not the player's turn
	if (game.activePlayerId !== player.id) {
		console.log(`Not ${player.username}'s turn`);
		return [];
	}

	const actions: Action[] = [];

	// Don't allow any actions if player is folded or all-in
	if (player.folded || player.allIn) {
		return actions;
	}

	const isPreflop = game.phase === "preflop";
	const isBigBlind = player.id === game.bigBlindId;
	const noAdditionalBets = game.currentBet === game.bigBlind;

	// Player can always fold
	actions.push("fold");

	// Check is allowed if:
	// 1. No current bet OR
	// 2. Player has matched the current bet OR
	// 3. It's preflop and player is big blind with no raises
	if (
		game.currentBet === 0 ||
		game.currentBet === player.currentBet ||
		(isPreflop && isBigBlind && noAdditionalBets)
	) {
		actions.push("check");
	}

	// Call is allowed if:
	// 1. There's a bet to call AND
	// 2. Player has enough chips
	const callAmount = game.currentBet - player.currentBet;
	if (game.currentBet > 0 && callAmount > 0 && player.chips >= callAmount) {
		actions.push("call");
	}

	// Bet is allowed if:
	// 1. No current bet AND
	// 2. Player has enough chips for minimum bet
	if (
		(game.currentBet === 0 && player.chips >= game.bigBlind) ||
		(isPreflop && isBigBlind && noAdditionalBets)
	) {
		actions.push("bet");
	}

	// Raise is allowed if:
	// 1. There's a current bet AND
	// 2. Player has enough chips for minimum raise
	// 3. Player's current bet is less than the current bet
	const minRaise = game.currentBet * 2 - player.currentBet;
	if (
		game.currentBet > 0 &&
		player.currentBet < game.currentBet &&
		player.chips >= minRaise
	) {
		actions.push("raise");
	}

	console.log(
		`Allowed actions for ${player.username}: ${actions.join(
			", "
		)} (socket call)`
	);
	return actions;
}

// Add a function to handle showdown
export function handleShowdown(game, io: Namespace) {
	// If we're in showdown phase, determine winners
	if (game.phase === "showdown") {
		// If only one player remains (everyone else folded)
		const activePlayers: Player[] = game.players.filter((p) => !p.folded);
		if (activePlayers.length === 1) {
			// Award pot to the last remaining player
			const winner = activePlayers[0];
			let totalWinnings: number = game.pot;
			winner.chips += game.pot;
			winner.previousAction = "win";

      game.stats.players[winner.id].personalStats.mainPotsWon += 1;
      game.stats.players[winner.id].personalstats.mainPotWinnings += game.pot;
      game.stats.players[winner.id].personalStats.totalWinnings += game.pot;
      game.stats.players[winner.id].personalStats.handsWon += 1;
      game.stats.players[winner.id].personalStats.totalHandsPlayed += 1;

			// Handle any sidepots (should be empty in this case)
			if (game.sidepots.length > 0) {
				console.log(
					`Unexpected: ${game.sidepots.length} sidepots exist with only one active player`
				);
				// Just add all sidepots to the winner
				game.sidepots.forEach((sidepot) => {
					const sidepotAmount = sidepot.getAmount();
					winner.chips += sidepotAmount;
					totalWinnings += sidepotAmount;

          game.stats.players[winner.id].personalStats.sidePotsWon += 1;
          game.stats.players[winner.id].personalstats.sidePotWinnings += sidepotAmount;
          game.stats.players[winner.id].personalStats.totalWinnings += sidepotAmount;
				});
			}

			// Emit winner announcement to all players (win by fold)
			io.to(game.id).emit("POK-round_winners", {
				winners: [
					{
						playerId: winner.id,
						playerName: winner.username,
						amount: totalWinnings,
						potType: "All pots (win by fold)",
						hand: "Win by fold",
						cards: winner.cards,
					},
				],
				showdown: false,
			});

			// Reset the game for next round
			setTimeout(() => {
				resetForNextRound(game, io);
			}, 8000); // Give players 8 seconds to see the result

			return;
		}

		// Set all active players' cards to face up for the showdown
		activePlayers.forEach((player) => {
			player.cards.forEach((card) => {
				card.faceUp = true;
			});
		});

		// Send an immediate game state update so clients can see the revealed cards
		io.to(game.id).emit("POK-game_update", {
			game: game.returnGameState(),
			message: "Showdown! All active players reveal their cards.",
		});

		console.log(
			`Distributing pots at showdown with ${activePlayers.length} active players and ${game.sidepots.length} sidepots`
		);

		// Store winner information before distributing pots
		const winnerInfo = activePlayers.map((player) => {
			const hand = game.communityCards
				? player.cards.concat(game.communityCards)
				: player.cards;

			const handEval = evaluateHand(hand) as HandRank;

			console.log(`Evaluating hand for player ${player.username}...`);
			console.log(
				`Hand: ${handEval.hand}, Cards: ${hand.map((card) => card.name)}`
			);

			return {
				playerId: player.id,
				playerName: player.username,
				hand: handEval.hand,
				cards: hand.map((card) => card.name),
			};
		});

		// Distribute pots and track winners and amounts
		const potWinners = game.distributePots();

		// Combine hand information with winning amounts
		const winnerDetails = potWinners.map((winner) => {
			const handInfo = winnerInfo.find(
				(info) => info.playerId === winner.playerId
			);
			return {
				...handInfo,
				amount: winner.amount,
				potType: winner.potType,
			};
		});

		// Emit winner announcement to all players
		io.to(game.id).emit("POK-round_winners", {
			winners: winnerDetails,
			showdown: true,
		});

  game.players.forEach((player) => {
    updatePlayerStats(game.stats.players[player.username]);
  })

	resetForNextRound(game, io);

	}
}

export function resetForNextRound(game, io: Namespace) {

	// Make sure the dealer index is valid
	if (game.dealerIndex >= game.players.length) {
		game.dealerIndex = 0;
	}

  game.resetRound();

  io.to(game.id).emit("POK-round_reset", { game: game.returnGameState() });

  const chatPayload = {
    message: `Round ended, beginning round #${game.roundNumber}...`,
    sender: "SYSTEM",
    timestamp: insertTimestamp()
  }

  io.to(game.id).emit("COM-chat_message", chatPayload);

  /*
	// Reset game state for next round
	game.roundActive = false;
  game.roomStatus = "waiting";
	game.phase = "waiting";
	game.pot = 0;
	game.currentBet = 0;
	game.communityCards = [];
	game.burnPile = [];

	// Reset player states
	game.players.forEach((p) => {
		p.folded = false;
		p.allIn = false;
		p.cards = [];
		p.currentBet = 0;
		p.previousAction = "none";
		p.ready = false;
	});*/

	// Also update roles based on new dealer position
	/*
  if (game.players.length >= 2) {
		game.startRound(); // Start the new round immediately since players are auto-ready

		// Emit game update with new state
		io.to(game.id).emit("POK-game_update", {
			game: game.returnGameState(),
			message: "New round started!",
		});

		// Notify first active player it's their turn
		if (game.activePlayerId) {
			io.to(game.activePlayerId).emit("POK-your_turn", {
				gameId: game.id,
				allowedActions: game.getAllowedActionsForPlayer(game.activePlayerId),
			});
		}
	} else {
		// Not enough players, just emit round ended
		io.to(game.id).emit("POK-round_ended", {
			game: game.returnGameState(),
			message: "Not enough players to start next round.",
		});
	}
    */
}

export function initializePlayerStatsObject(game: Game, player: Player): void {
  if (!game.stats.players[player.username]) {
    game.stats.players[player.username] = {
      id: "",
      name: player.username,
      personalStats: {
        totalBets: 0,
        timesCalled: 0,
        timesBet: 0,
        timesRaised: 0,
        timesFolded: 0,
        timesChecked: 0,
        totalWinnings: 0,
        mainPotsWon: 0,
        sidePotsWon: 0,
        mainPotWinnings: 0,
        sidePotWinnings: 0,
        handsWon: 0,
        totalHandsPlayed: 0,
        gamesPlayed: 0,
        gamesWon: 0,
        biggestPot: 0,
        lastUpdated: Date.now().toString(),
      },
      gameStats: {
        gameId: game.id,
        gameName: game.name,
        buyIn: 0,
        cashOut: 0,
        handsPlayed: 0,
        handsWon: 0,
        biggestPot: 0,
        joinedAt: Date.now().toString(),
        leftAt: "",
        totalBets: 0,
        timesCalled: 0,
        timesBet: 0,
        timesRaised: 0,
        timesFolded: 0,
        timesChecked: 0,
      },
    };
  }
}
