import { Server } from "socket.io";
import {
	User,
	TGamePhase,
	ListEntry,
	Action,
	TGamePhaseCommon,
	TGamePhaseHoldEm,
	TableSeat,
} from "@game/types";
import { Player, Game, Sidepot } from "@game/classes";
import { evaluateHand } from "@game/utils";
import { v4 as uuidv4 } from "uuid";
import { Playwrite_TZ } from "next/font/google";
import { createDropdownMenuScope } from "@radix-ui/react-dropdown-menu";

export function initializeSocket(io: Server) {
	// Store active games
	const games: { [key: string]: Game } = {};
	const gamesArray: ListEntry[] = [];

	// Track recently disconnected users to allow for page navigation
	const pendingReconnects = new Map<
		string,
		{
			userId: string;
			gameId: string;
			timestamp: number;
			timeout: NodeJS.Timeout;
		}
	>();

	// Store user sessions
	const users: { [key: string]: User } = {};

	// Log all events for debugging
	io.engine.on("connection_error", (err) => {
		console.log(
			"Connection error:",
			err.req,
			err.code,
			err.message,
			err.context
		);
	});

	// Handle socket connections
	io.on("connection", (socket) => {
		console.log("User connected:", socket.id);

		// Handle user registration
		socket.on("register", (data) => {
			// Check if data contains profile information
			if (!data || !data.profile) {
				console.error("Invalid register data:", data);
				socket.emit("error", { message: "Invalid registration data" });
				return;
			}

			console.log(
				`Received registration request from '${data.profile.username}'`
			);

			const profile = data.profile;

			users[socket.id] = {
				id: socket.id,
				username: profile.username || "Anonymous",
				chips: profile.balance || 1000, // Starting chips
			};

			console.log(`Registered user:`, users[socket.id]);
			socket.emit("registration_success", { user: users[socket.id] });
		});

		socket.on("get_games_list", () => {
			console.log(`Received request for games list, sending...`, gamesArray);

      socket.join("lobby");
			socket.emit("games_list", gamesArray);
		});

		// Create a new game
		socket.on("create_game", (data) => {
			console.log(`Received request to create game lobby...`);

			const { tableName, creator, maxPlayers, blinds, gameVariant } = data;
			const gameId = uuidv4();
			const userId = socket.id;

			if (!users[userId]) {
				console.error(`User ${userId} not registered`);
				socket.emit("error", { message: "You must register first" });
				return;
			}

			console.log(
				`Creating new game: ${tableName} by ${creator.username}, variant: ${gameVariant}, max players: ${maxPlayers}`
			);

			// Ensure creator has valid chips value
			if (typeof creator.chips !== "number" || isNaN(creator.chips)) {
				console.warn(
					`Invalid chips value for creator ${creator.username}: ${creator.chips}, setting default 1000`
				);
				creator.chips = 1000;
			}

			games[gameId] = new Game(
				gameId,
				tableName,
				creator,
				maxPlayers,
				blinds?.small || 5,
				blinds?.big || 10,
				gameVariant
			);

			const listEntry: ListEntry = {
				index: gamesArray.length,
				id: gameId,
				name: games[gameId].name,
				playerCount: games[gameId].players.length,
				maxPlayers: games[gameId].maxPlayers,
				isStarted: games[gameId].hasStarted,
			};

			gamesArray.push(listEntry);
			console.log(`Added game to list:`, listEntry);

			// Join the game room
			console.log(`Socket.join(${gameId}) executing...`);
			socket.join(gameId);

			console.log(`Emitting socket event 'game_created'...`);
			socket.emit("game_created", { gameId });

			// Update all clients with the new games list
			io.emit("games_list", gamesArray);
		});

		socket.on("get_seat_info", (data) => {
			const gameId = data.gameId;
			const game = games[gameId];
			const seatInfo: Array<number> = [];
			game.tablePositions.forEach((pos, index) => {
				if (pos.occupied) {
					seatInfo.push(pos.seatNumber);
				}
			});

			socket.emit("seat_info", { seatInfo });
			console.log(`Emitting socket event 'seat_info'...`, seatInfo);
		});

		// Join an existing game
		socket.on("join_game", (data) => {
			console.log(`Received request to join game lobby...`);

			if (!data || !data.gameId || !data.user) {
				socket.emit("error", { message: `Invalid join_game data | DATA: ${data}}` });
				return;
			}

			const { gameId, user } = data;

			// Check if this is a reconnection after page navigation
			if (
				user &&
				user.username &&
				pendingReconnects.has(gameId + user.username)
			) {
				const reconnectData = pendingReconnects.get(gameId + user.username);
				if (reconnectData) {
					clearTimeout(reconnectData.timeout);
					pendingReconnects.delete(gameId + user.username);
					console.log(`User ${user.username} reconnected to game ${gameId}`);
				}
			}

			const userId = socket.id;
			const game = games[gameId];

			if (!game) {
				console.log(`Socket Error: Game not found.`);
				socket.emit("error", { message: "Game not found" });
				return;
			}

			if (game.players.length >= game.maxPlayers) {
				console.log(`Socket Error: Game is full.`);
				socket.emit("error", { message: "Game is full" });
				return;
			}

			if (!users[userId]) {
				console.log(`Socket Error: User must register first.`);
				socket.emit("error", { message: "You must register first" });
				return;
			}

			// Check if player is already in the game (by username, not socket id)
			const existingPlayerIndex = game.players.findIndex(
				(p) => p.username === users[userId].username
			);
			if (existingPlayerIndex >= 0) {
				// Update the player's socket ID
				const oldId = game.players[existingPlayerIndex].id;
				game.players[existingPlayerIndex].id = userId;
				console.log(
					`Player ${users[userId].username} reconnected to game '${game.name}' with new socket ID ${userId}`
				);

				// Also update tablePositions to match the new player id
				const seatNum = game.players[existingPlayerIndex].seatNumber;
				if (
					seatNum >= 0 &&
					seatNum < game.tablePositions.length &&
					game.tablePositions[seatNum].playerId === oldId
				) {
					game.tablePositions[seatNum].playerId = userId;
					console.log(
						`Updated tablePositions for seat ${seatNum} to new playerId ${userId}`
					);
				}
			} else {
				const username = user.username;
				// Fix: Use user.balance instead of user.chips
				const chips = user.balance || 1000; // Fallback to 1000 if balance is undefined
				const avatar = user.avatar || user.avatar_url;

				console.log(
					`Player joining with username: ${username}, chips: ${chips} (from balance: ${user.balance}), avatar: ${avatar}`
				);

				// Find an available seat
				let availableSeat = -1;
				for (let i = 0; i < game.tablePositions.length; i++) {
					if (!game.tablePositions[i].occupied) {
						availableSeat = i;
						break;
					}
				}

				if (availableSeat === -1) {
					socket.emit("error", { message: "No available seats" });
					return;
				}

				// Create player object for new player
				const player: Player = new Player(
					userId,
					username,
					availableSeat,
					chips,
					avatar
				);
				player.active = false;
				player.folded = true;

				// Add player to the game
				game.players.push(player);

				// Update table positions
				game.tablePositions[availableSeat].occupied = true;
				game.tablePositions[availableSeat].playerId = player.id;

				// Sort players by seat number to maintain consistent order
				game.sortPlayerList();

				console.log(
					`New player ${player.username} joined game '${game.name}' at seat ${availableSeat}`
				);
			}

			// Join the game room
			console.log(
				`Socket.join(${gameId}) executing for user '${user.username}'...`
			);
			socket.join(gameId);

			// Update the game state for the player who just joined
			socket.emit("game_state", { game: games[gameId].returnGameState() });

			// Let everyone know someone joined
			console.log(
				`Player '${users[userId].username} joining game room '${games[gameId].name}'...`
			);
			io.to(gameId).emit("player_joined", {
				player: users[userId],
				game: games[gameId].returnGameState(),
			});

			// Let everyone know about the updated game state
			io.to(gameId).emit("game_state", {
				game: games[gameId].returnGameState(),
			});

			// Check if we have at least 2 players and all are ready
			if (game.players.length >= 2 && game.phase === "waiting") {
				checkRoundStatus(game, io);
			}

			// Update the games list for all clients
			const gameIndex = gamesArray.findIndex((g) => g.id === gameId);
			if (gameIndex !== -1) {
				gamesArray[gameIndex].playerCount = game.players.length;
				gamesArray[gameIndex].isStarted = game.hasStarted;
				io.emit("games_list", gamesArray);
			}
		});

		// Handle player ready status separately from actions
		socket.on("player_ready", (data) => {
      console.log(`Received socket event 'player_ready'...`, data);
			if (!data || !data.gameId) {
				socket.emit("error", { message: "Invalid ready data" });
				return;
			}

			const { gameId } = data;
			const game = games[gameId];
			const userId = socket.id;

			if (!game) {
				socket.emit("error", { message: "Game not found" });
				return;
			}

			const player = game.players.find((p) => p.id === userId);
			if (!player) {
				socket.emit("error", { message: "Player not found" });
				return;
			}

			// Toggle ready state
			player.ready = !player.ready;
			console.log(
				`${player.username}'s ready status is now set to '${player.ready}'`
			);

			// Send immediate update about this player's ready status
			io.to(gameId).emit("player_ready_changed", {
				playerId: player.id,
				playerName: player.username,
				isReady: player.ready,
				game: game.returnGameState(),
			});

      // Pass ready status back to player for state sync
      socket.to(userId).emit("player_ready_status", { isReady: player.ready });

			// Check if all players are ready to start game or next round
			if (game.players.length >= 2) {
				const allReady = game.players.every((p) => p.ready);

				if (allReady) {
					if (!game.hasStarted) {
						// Initial game start
						console.log("All players ready, starting game...");
						game.status = "playing";
						game.hasStarted = true;

						io.to(gameId).emit("game_starting", {
							message: "All players ready! Game is starting...",
							game: game.returnGameState(),
						});

						// Start the game after a short delay
						setTimeout(() => {
							game.startRound();

							io.to(gameId).emit("game_update", {
								game: game.returnGameState(),
								message: "Game has started!",
							});

							// Notify first player it's their turn
							if (game.activePlayerId) {
								io.to(game.activePlayerId).emit("your_turn", {
									gameId: game.id,
									allowedActions: game.getAllowedActionsForPlayer(
										game.activePlayerId
									),
								});
							}
						}, 1000);
					} else if (game.phase === "waiting" && game.roundCount > 0) {
						// Starting next round
						console.log("All players ready for next round...");

						io.to(gameId).emit("round_starting", {
							message: "All players ready! New round is starting...",
							game: game.returnGameState(),
						});

						setTimeout(() => {
							game.startRound();

							io.to(gameId).emit("game_update", {
								game: game.returnGameState(),
								message: "New round has started!",
							});

							if (game.activePlayerId) {
								io.to(game.activePlayerId).emit("your_turn", {
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
		});

		// Handle player actions (fold, check, call, raise)
		socket.on("player_action", (data) => {
			if (!data || !data.gameId || !data.action) {
				socket.emit("error", { message: "Invalid player action data" });
				return;
			}

			const { gameId, action } = data;
			const game = games[gameId];
			const userId = socket.id;
			const actionType = action.type;

			if (!game) {
				socket.emit("error", { message: "Game not found" });
				return;
			}

			const player = game.players.find((p) => p.id === userId);
			if (!player) {
				socket.emit("error", { message: "Player not found" });
				return;
			}

			// Validate player chips
			if (typeof player.chips !== "number" || isNaN(player.chips)) {
				console.warn(
					`Invalid chips value for player ${player.username} performing action: ${player.chips}, fixing to 1000`
				);
				player.chips = 1000;
			}

			console.log(
				`Received socket event 'player_action'...\nGame Name: ${game.name} (ID: ${gameId})\nUser: ${player.username} (Chips: ${player.chips})\nAction: ${actionType} (${action.amount})`
			);

			if (
				game.hasStarted &&
				actionType !== "toggleReady" &&
				game.activePlayerId !== userId
			) {
				socket.emit("error", { message: "Not your turn" });
				return;
			}

			// Process player action
			let actionSuccess = false;
			let allIn = false;

			switch (actionType) {
				case "fold":
					player.previousAction = "fold";
					player.folded = true;

					console.log(`Player ${player.username} folds`);
					actionSuccess = true;
					break;

				case "check":
					if (game.currentBet > player.currentBet) {
						socket.emit("error", {
							message:
								"You must call or raise. You cannot check when the current bet is higher than the amount you have bet this round.",
						});
						return false;
					}

					player.previousAction = "check";

					// Log player check action
					console.log(`Player ${player.username} checks`);

					// No need to adjust currentBet or player.currentBet since a check doesn't change those
					actionSuccess = true;
					break;

				case "call":
					const callAmount = game.currentBet - player.currentBet;
					if (callAmount > player.chips) {
						// Player is going all-in
						const allInAmount = player.chips;
						player.currentBet += allInAmount;
						player.chips = 0;
						console.log(
							`Player ${player.username} goes all-in for ${allInAmount} chips`
						);
						player.allIn = true;
						allIn = true;

						// Create a sidepot for this all-in player
						game.createSidepot(player, player.currentBet);
					} else {
						game.pot += callAmount;
						player.currentBet = game.currentBet;
						player.chips -= callAmount;
						console.log(
							`Player ${player.username} calls for ${callAmount} chips`
						);
					}
					player.previousAction = "call";
					actionSuccess = true;
					break;

				case "bet":
					const betAmount = action.amount;
					if (betAmount > player.chips) {
						socket.emit("error", {
							message: "You do not have enough chips to bet that amount.",
						});
						return false;
					}
					if (game.currentBet > 0) {
						socket.emit("error", {
							message:
								"You cannot bet when there is already a bet in place. You must call or raise.",
						});
						return false;
					}

					// Handle all-in bet
					if (betAmount === player.chips) {
						console.log(
							`Player ${player.username} goes all-in for ${betAmount} chips`
						);
						allIn = true;
						player.allIn = true;
						player.currentBet = betAmount;
						player.chips = 0;
						game.currentBet = betAmount;
						game.pot += betAmount;

						// Create a sidepot for this all-in player
						game.createSidepot(player, betAmount);
					} else {
						// Normal bet
						console.log(
							`Player ${player.username} bets ${betAmount} chips. The current bet is now ${betAmount}`
						);
						game.pot += betAmount;
						player.currentBet = betAmount;
						player.chips -= betAmount;
						game.currentBet = betAmount;
					}

					player.previousAction = "bet";
					actionSuccess = true;
					break;

				case "raise":
					const raiseTotal = game.currentBet + action.amount;
					const raiseAmount = raiseTotal - player.currentBet;

					if (raiseAmount >= player.chips) {
						// All-in raise

						const allInAmount = player.chips;
						player.currentBet += allInAmount;
						player.chips = 0;
						player.allIn = true;
						game.currentBet = player.currentBet;
						allIn = true;

						console.log(
							`Player ${player.username} reraises, goes all-in for ${player.chips} chips. The bet is now ${game.currentBet}`
						);
						// Create a sidepot for this all-in player
						game.createSidepot(player, player.currentBet);
					} else {
						// Normal raise
						game.pot += raiseAmount;
						player.currentBet = raiseTotal;
						player.chips -= raiseAmount;
						game.currentBet = raiseTotal;
						console.log(
							`Player ${player.username} raises to ${raiseTotal} chips.`
						);
					}
					player.previousAction = "raise";
					actionSuccess = true;
					break;
			}

			// All-in sidepots are now handled in each action case

			// If action was successful, advance the game
			if (actionSuccess) {
				// Track the previous phase to detect phase changes
				const previousPhase = game.phase;

				// Track active players before status check to detect fold-out win
				const activeBefore = game.players.filter((p) => !p.folded).length;

				// Advance to next player or phase
				game.checkPhaseProgress();

				// Check if someone won by everyone else folding
				const activeAfter = game.players.filter((p) => !p.folded).length;
				if (activeBefore > 1 && activeAfter === 1) {
					const winner = game.players.find((p) => !p.folded);
					if (winner) {
						// Emit winner announcement for fold-out win
						io.to(gameId).emit("round_winners", {
							winners: [
								{
									playerId: winner.id,
									playerName: winner.username,
									amount:
										previousPhase !== "waiting"
											? winner.chips -
											  game.players.find((p) => p.id === winner.id)!.chips
											: 0,
									potType: "All pots (win by fold)",
									hand: "Win by fold",
									cards: winner.cards.map((card) => card.name),
								},
							],
							showdown: false,
						});
					}
				}

				// If we've moved to showdown, handle the showdown
				if (game.phase === "showdown" && previousPhase !== "showdown") {
					handleShowdown(game, io);
				}

				// Broadcast updated game state to all players
				io.to(gameId).emit("game_update", { game: game.returnGameState() });

				// If the phase changed, send a specific event
				if (previousPhase !== game.phase) {
					io.to(gameId).emit("phase_changed", {
						previousPhase: previousPhase,
						newPhase: game.phase,
						game: game.returnGameState(),
					});
				}

				// Notify the new active player it's their turn
				if (
					game.status === "playing" /*&&
					game.activePlayerId &&
					game.activePlayerIndex !== null*/
				) {
					console.log(
						`Notifying player '${
							game.players[game.activePlayerIndex!].username
						}' it's their turn`
					);
					io.to(game.activePlayerId).emit("your_turn", {
						gameId: game.id,
						allowedActions: game.getAllowedActionsForPlayer(
							game.activePlayerId
						),
					});

					// Also broadcast a message to everyone about whose turn it is
					io.to(gameId).emit("active_player_changed", {
						activePlayerId: game.activePlayerId,
						activePlayerName:
							game.players.find((p) => p.id === game.activePlayerId)
								?.username || "Unknown player",
					});
				}
			}
		});

		// Handle chat messages
		socket.on("chat_message", (data) => {
			console.log(`Received socket event 'chat_message'...`, data);
			const userId = socket.id;
			let sender = users[userId]?.username || "SYSTEM";


			if (!data || (!data.gameId && data.scope === "game") || !data.message) {
				socket.emit("error", { message: "Invalid chat message data ya doof!" });
				return;
			}

			const { scope, gameId, message } = data;

      if (!gameId && scope !== "lobby")
        console.log(`Emitting socket event 'chat_message' to specific room '${gameId}'...`);
      else if (scope === "lobby")
        console.log(`Emitting socket event 'chat_message' to lobby...`);
      else if (!message) {
        console.error(`Invalid chat message`);
        return;
      }

      const timestamp = formatTimestamp(Date.now());

      const chatPayload = {
        sender,
        message,
        timestamp,
      }

      if (scope === "lobby") {
        // Send to all users in the lobby
        io.to("lobby").emit("chat_message", chatPayload);
      } else if (scope === "game" && gameId) {
        // Send to all users in the game room
        io.to(gameId).emit("chat_message", chatPayload);
      } else {
        console.error(`Invalid chat scope: ${scope}`);
        socket.emit("error", { message: "Invalid chat scope" });
      }
		});

		socket.on("private_message", (data) => {
			console.log(`Received socket event 'private_message'...`);
			const userId = socket.id;
			if (!users[userId]) return;

      const { message, recipient } = data;
      const timestamp = formatTimestamp(Date.now());
			const sender = users[userId].username;

      const targetSocketId = getSocketIdByUsername(users, recipient);
      const privateMsg = true;
      const chatPayload = {
        privateMsg,
        sender,
        message,
        timestamp,
      };

      if (targetSocketId)
        socket.to(targetSocketId).emit("chat_message", chatPayload);
      else
        socket.emit("error", { message: "Recipient not found" });
		});

		// Handle disconnections
		socket.on("disconnect", () => {
			console.log(`Received socket event 'disconnect'...`, socket.id);
			const userId = socket.id;

			// Skip if no user is associated with this socket
			if (!users[userId]) {
				return;
			}

			const username = users[userId].username;

			// Handle player leaving games
			Object.keys(games).forEach((gameId) => {
				const game = games[gameId];
				const playerIndex = game.players.findIndex((p) => p.id === userId);

				if (playerIndex >= 0) {
					// Don't immediately remove the player, set a timeout to allow page navigation
					const player = game.players[playerIndex];

					// Create a reconnection key
					const reconnectKey = gameId + username;

					// Clear any existing timeout
					if (pendingReconnects.has(reconnectKey)) {
						clearTimeout(pendingReconnects.get(reconnectKey)?.timeout);
					}

					// Set a timeout to remove the player if they don't reconnect
					const timeout = setTimeout(() => {
						console.log(
							`Timeout expired for player ${username} in game ${gameId}, removing...`
						);

						// Now actually remove the player
						const currentPlayerIndex = game.players.findIndex(
							(p) => p.username === username
						);
						if (currentPlayerIndex >= 0) {
							const playerToRemove = game.players[currentPlayerIndex];
							const seatNumber = playerToRemove.seatNumber;

							// Update table positions first
							if (seatNumber >= 0 && seatNumber < game.tablePositions.length) {
								game.tablePositions[seatNumber].occupied = false;
								game.tablePositions[seatNumber].playerId = null;
							}

							// Then remove the player from the players array
							game.players.splice(currentPlayerIndex, 1);

							// If player was dealer, small blind, or big blind, adjust roles
							if (game.players.length > 0) {
								// Ensure dealer index is valid
								if (game.dealerIndex >= game.players.length) {
									game.dealerIndex = 0;
								}

								// Recalculate roles if we still have players
								if (game.status === "playing") {
									game.smallBlindIndex =
										(game.dealerIndex + 1) % game.players.length;
									game.bigBlindIndex =
										(game.smallBlindIndex + 1) % game.players.length;
									game.dealerId = game.players[game.dealerIndex].id;
									game.smallBlindId = game.players[game.smallBlindIndex].id;
									game.bigBlindId = game.players[game.bigBlindIndex].id;

                  if (game.activePlayerId === userId) {
                    // If the disconnected player was the active player, find the next one
                    const dcedPlayerIndex = game.activePlayerIndex;

                    // Once found, set the active player id & index to this player's id & index
                    if (dcedPlayerIndex) {
                      const nextPlayer =
                        game.players[
                          (dcedPlayerIndex + 1) % game.players.length
                        ];
                      game.activePlayerId = nextPlayer.id;
                      game.activePlayerIndex =
                        (dcedPlayerIndex + 1) % game.players.length;

                      // Confirm this player is not folded, otherwise advance to the next player again, until a valid player is found
                      while (nextPlayer.folded) {
                        const nextNextPlayer =
                          game.players[
                            (game.activePlayerIndex + 1) % game.players.length
                          ];
                        game.activePlayerId = nextNextPlayer.id;
                        game.activePlayerIndex =
                          (game.activePlayerIndex + 1) % game.players.length;
                      }

                      console.log(
                        `Player ${username} was active, switching to next player: ${nextPlayer.username}`
                      );

                      // Notify the new player it is their turn, and update others as well
                      console.log(
                        `Notifying player '${
                          game.players[game.activePlayerIndex!].username
                        }' it's their turn`
                      );
                      io.to(game.activePlayerId).emit("your_turn", {
                        gameId: game.id,
                        allowedActions: game.getAllowedActionsForPlayer(
                          game.activePlayerId
                        ),
                      });

                      // Also broadcast a message to everyone about whose turn it is

                      const timestamp = formatTimestamp(Date.now());
                      const sysChatPayload = {
                        sender: "SYSTEM",
                        message: `Player '${username}' has disconnected, it is now ${nextPlayer.username}'s turn.`,
                        timestamp,
                      };
                      io.to(gameId).emit("chat_message", sysChatPayload);

                      // INFO This was the code for broadcasting an update message, but there is no corresponding client-side event handler for this emitted event
                      // INFO Unless this becomes necessary, the update message is handled by a chat message from "SYSTEM" as done above
                      /*io.to(gameId).emit("active_player_changed", {
                        activePlayerId: game.activePlayerId,
                        activePlayerName:
                          game.players.find((p) => p.id === game.activePlayerId)
                            ?.username || "Unknown player",
                      });*/
                    }
                  }
                  // Removed this function call for now, the above checks and loop should resolve the active player issue
									//game.findNextActivePlayer();
								}
							}

							if (game.players.length < 2) {
								game.hasStarted = false;
								// Not enough players, reset game
								game.phase = "waiting";
								game.status = "waiting";
								game.communityCards = [];
                game.players[0].chips += game.pot;
								game.pot = 0;
							}

							if (game.players.length === 0) {
								delete games[gameId];

								// Remove from games array
								const gameIndex = gamesArray.findIndex((g) => g.id === gameId);
								if (gameIndex !== -1) {
									gamesArray.splice(gameIndex, 1);
								}

								console.log(
									`Room '${game.name}' (ID: ${gameId}) no longer has any participants, destroying room...`
								);
							} else {
								// Update the games list
								const gameIndex = gamesArray.findIndex((g) => g.id === gameId);
								if (gameIndex !== -1) {
									gamesArray[gameIndex].playerCount = game.players.length;
									gamesArray[gameIndex].isStarted = game.hasStarted;
								}
							}

							// Let remaining players know
							console.log(
								`Emitting socket event 'player_left' to specific room '${gameId}'...`
							);
							io.to(gameId).emit("player_left", {
								playerId: userId,
								game: games[gameId]?.returnGameState(),
							});

							// Update the games list for all clients
							io.emit("games_list", gamesArray);
						}

						// Clean up the pending reconnect
						pendingReconnects.delete(reconnectKey);
					}, 10000); // 10 second grace period for reconnection

					// Store the timeout
					pendingReconnects.set(reconnectKey, {
						userId,
						gameId,
						timestamp: Date.now(),
						timeout,
					});

					console.log(
						`Player ${username} disconnected from game ${gameId}. Setting 10-second timeout for reconnection.`
					);
				}
			});

			// Remove user from users list
			delete users[userId];
		});
	});
}

function checkRoundStatus(game: Game, io) {
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
				io.to(game.id).emit("game_starting", {
					message: "All players ready! Game is starting...",
					game: game.returnGameState(),
				});

				// Start the game after a short delay to allow clients to update UI
				setTimeout(() => {
					// Start the game round
					game.startRound();

					// Send the initial game state to all players
					io.to(game.id).emit("game_update", {
						game: game.returnGameState(),
						message: "Game has started!",
					});

					// Notify the active player it's their turn
					if (game.activePlayerId) {
						io.to(game.activePlayerId).emit("your_turn", {
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
				io.to(game.id).emit("round_starting", {
					message: "All players ready! New round is starting...",
					game: game.returnGameState(),
				});

				// Start the next round after a short delay
				setTimeout(() => {
					game.startRound();

					// Send the updated game state to all players
					io.to(game.id).emit("game_update", {
						game: game.returnGameState(),
						message: "New round has started!",
					});

					// Notify the active player it's their turn
					if (game.activePlayerId) {
						io.to(game.activePlayerId).emit("your_turn", {
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

function isReady(player) {
	return player.ready;
}

// Add a function to determine allowed actions for a player
function getAllowedActions(game, playerId) {
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
function handleShowdown(game, io) {
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
				});
			}

			// Emit winner announcement to all players (win by fold)
			io.to(game.id).emit("round_winners", {
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
		io.to(game.id).emit("game_update", {
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

			const handEval = evaluateHand(hand);

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
		io.to(game.id).emit("round_winners", {
			winners: winnerDetails,
			showdown: true,
		});

		// Reset the game for next round after delay
		setTimeout(() => {
			resetForNextRound(game, io);
		}, 8000); // Give players 8 seconds to see the result
	}
}

function resetForNextRound(game, io) {
	// Sort players first to ensure consistent ordering
	game.sortPlayerList();

	// Make sure the dealer index is valid
	if (game.dealerIndex >= game.players.length) {
		game.dealerIndex = 0;
	}

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
	});

	// Also update roles based on new dealer position
	/*
  if (game.players.length >= 2) {
		game.startRound(); // Start the new round immediately since players are auto-ready

		// Emit game update with new state
		io.to(game.id).emit("game_update", {
			game: game.returnGameState(),
			message: "New round started!",
		});

		// Notify first active player it's their turn
		if (game.activePlayerId) {
			io.to(game.activePlayerId).emit("your_turn", {
				gameId: game.id,
				allowedActions: game.getAllowedActionsForPlayer(game.activePlayerId),
			});
		}
	} else {
		// Not enough players, just emit round ended
		io.to(game.id).emit("round_ended", {
			game: game.returnGameState(),
			message: "Not enough players to start next round.",
		});
	}
    */
}

function getSocketIdByUsername(
  users: { [key: string]: User },
  username: string
): string | null {
  for (const [socketId, user] of Object.entries(users)) {
    if (user.username === username) {
      return socketId;
    }
  }
  return null;
}

function formatTimestamp(timestamp: number | string | Date) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}