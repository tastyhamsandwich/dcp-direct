import { Server, Namespace } from "socket.io";
//import {	User,	TGamePhase,	ListEntry,	Action,	TGamePhaseCommon,	TGamePhaseHoldEm,	TableSeat,  HandRank,  GameType,  Suit,  Rank } from "@types/game";
import { Player, Game, Sidepot, Card } from "@game/classes";
import { evaluateHand } from "@game/utils";
import { v4 as uuidv4 } from "uuid";
import { Playwrite_TZ } from "next/font/google";
import { createDropdownMenuScope } from "@radix-ui/react-dropdown-menu";
import { updatePlayerStats } from "@lib/database"
import { PinochleDeck, PinochleCard, PinochlePlayer } from "@game/pinochle";
import { DeterminePlayableCards } from "@game/pinochleRules";

export function initializeSocket(io: Server) {
	// Store active games
	const pokerGames: { [key: string]: Game } = {};
	const pinochleGames: { [key: string]: PinochleGame } = {};
	const gamesArray: ListEntry[] = [];
	const gameNamespaces: Record<string, string> = {};

	const defaultNamespace = io.of("/");
	const lobbyNamespace = io.of("/lobby");
	const pokerNamespace = io.of("/poker");
	const pinochleNamespace = io.of("/pinochle");

	const resolveNamespaceForGameType = (gameType: GameType): string =>
		gameType === "Pinochle" ? "/pinochle" : "/poker";

	const broadcastGamesList = () => {
		[
			defaultNamespace,
			lobbyNamespace,
			pokerNamespace,
			pinochleNamespace,
		].forEach((namespace) => {
			namespace.emit("COM-games_list", gamesArray);
		});
	};

	const normalizeGameListFilter = (
		rawValue?: GameListFilter | string | null
	): GameListFilter => {
		const normalized = (rawValue || "").toString().toLowerCase();
		if (normalized === "pinochle") return "Pinochle";
		if (normalized === "poker") return "Poker";
		return "Both";
	};

	const filterGamesList = (filter: GameListFilter): ListEntry[] => {
		if (filter === "Both") {
			return gamesArray;
		}

		const normalizedFilter = filter.toLowerCase();
		return gamesArray.filter(
			(game) => (game.gameType || "Poker").toLowerCase() === normalizedFilter
		);
	};

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

	// Handle socket connections per namespace
	const registerNamespaceHandlers = (namespace: Namespace) => {
		namespace.on("connection", (socket) => {
			const io = namespace;
			const defaultGameType: GameType | null =
				namespace.name === "/pinochle"
					? "Pinochle"
					: namespace.name === "/poker"
						? "Poker"
						: null;
			console.log("User connected:", socket.id);

			const createPinochleGame = (data: any) => {
				if (defaultGameType && defaultGameType !== "Pinochle") {
					socket.emit("COM-error", {
						message:
							"Pinochle games are available on the /pinochle namespace. Please reconnect there to create one.",
					});
					return;
				}

				const { tableName, creator, wagerPerGame } = data || {};
				const userId = socket.id;

				if (!users[userId]) {
					console.error(`User ${userId} not registered`);
					socket.emit("COM-error", { message: "You must register first" });
					return;
				}

				const gameId = uuidv4();
				const normalizedWager =
					typeof wagerPerGame === "number" && !isNaN(wagerPerGame)
						? Math.max(0, Math.floor(wagerPerGame))
						: 0;
				console.log(
					`Creating new pinochle game: ${tableName} by ${
						creator?.username || "Unknown"
					}, wager: ${normalizedWager}`
				);

				const creatorPlayer = buildPinochlePlayerState(
					userId,
					creator.username,
					0,
					creator.avatar || creator.avatar_url
				);

				pinochleGames[gameId] = {
					id: gameId,
					name: tableName,
					players: [creatorPlayer],
					phase: "waiting",
					status: "waitingForPlayers",
					dealerIndex: 0,
					dealerId: userId,
					activePlayerId: undefined,
					activePlayerIndex: undefined,
					roundBid: 0,
					bidLeaderId: undefined,
					biddingTeam: undefined,
					trumpSuit: null,
					deck: new PinochleDeck(),
					trick: { leadSuit: null, cards: [] },
					scoreTeamA: 0,
					scoreTeamB: 0,
					meldTeamA: 0,
					meldTeamB: 0,
					trickPointsTeamA: 0,
					trickPointsTeamB: 0,
					setsTeamA: 0,
					setsTeamB: 0,
					roundNumber: 0,
					roundActive: false,
					wagerPerGame: normalizedWager,
				};
				gameNamespaces[gameId] = resolveNamespaceForGameType("Pinochle");

				const listEntry: ListEntry = {
					index: gamesArray.length,
					id: gameId,
					name: tableName,
					playerCount: 1,
					maxPlayers: 4,
					isStarted: false,
					gameType: "Pinochle",
					wagerPerGame: normalizedWager,
				};

				gamesArray.push(listEntry);
				socket.join(gameId);
				socket.emit("COM-game_created", { gameId, gameType: "Pinochle" });
				broadcastGamesList();
				io.to(gameId).emit("PIN-pinochle_state", buildPinochleState(pinochleGames[gameId]));
			};

			const createPokerGame = (data: any, requestedGameType: GameType = "Poker") => {
				if (defaultGameType && defaultGameType !== "Poker") {
					socket.emit("COM-error", {
						message:
							"Poker games are available on the /poker namespace. Please reconnect there to create one.",
					});
					return;
				}

				const { tableName, creator, maxPlayers, blinds, gameVariant } = data || {};
				const userId = socket.id;

				if (!users[userId]) {
					console.error(`User ${userId} not registered`);
					socket.emit("COM-error", { message: "You must register first" });
					return;
				}

				const gameId = uuidv4();
				const resolvedVariant = gameVariant || "TexasHoldEm";
				console.log(
					`Creating new poker game: ${tableName} by ${
						creator?.username || "Unknown"
					}, variant: ${resolvedVariant}, max players: ${maxPlayers}`
				);

				// Ensure creator has valid chips value
				if (typeof creator.chips !== "number" || isNaN(creator.chips)) {
					console.warn(
						`Invalid chips value for creator ${creator.username}: ${creator.chips}, setting default 1000`
					);
					creator.chips = 1000;
				}

				pokerGames[gameId] = new Game(
					gameId,
					tableName,
					creator,
					maxPlayers,
					blinds?.small || 5,
					blinds?.big || 10,
					resolvedVariant
				);
				gameNamespaces[gameId] = resolveNamespaceForGameType(requestedGameType);

				const listEntry: ListEntry = {
					index: gamesArray.length,
					id: gameId,
					name: pokerGames[gameId].name,
					playerCount: pokerGames[gameId].players.length,
					maxPlayers: pokerGames[gameId].maxPlayers,
					isStarted: pokerGames[gameId].hasStarted,
					gameType: requestedGameType,
				};

				gamesArray.push(listEntry);
				console.log(`Added game to list:`, listEntry);

				// Join the game room
				console.log(`Socket.join(${gameId}) executing...`);
				socket.join(gameId);

				console.log(`Emitting socket event 'COM-game_created'...`);
				socket.emit("COM-game_created", { gameId, gameType: requestedGameType });

				// Update all clients with the new games list
				broadcastGamesList();
			};

		// Handle user registration
		socket.on("COM-register", (data) => {
			// Check if data contains profile information
			if (!data || !data.profile) {
				console.error("Invalid register data:", data);
				socket.emit("COM-error", { message: "Invalid registration data" });
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
			socket.emit("COM-registration_success", { user: users[socket.id] });
		});

		socket.on("COM-get_games_list", (data) => {
			const requestedFilter = normalizeGameListFilter(
				(data as { gameType?: GameListFilter; filter?: GameListFilter })?.gameType ||
					(data as { filter?: GameListFilter })?.filter
			);
			console.log(
				`Received request for games list (filter: ${requestedFilter}), sending...`,
				gamesArray
			);

      socket.join("lobby");
			socket.emit("COM-games_list", filterGamesList(requestedFilter));
		});

		// Create a new game
		socket.on("COM-create_game", (data) => {
			console.log(`Received request to create game lobby...`);

			const requestedGameType: GameType =
				(data?.gameType || defaultGameType || "")
					.toString()
					.toLowerCase() === "pinochle"
					? "Pinochle"
					: "Poker";

      switch (requestedGameType) {
        case "Pinochle":
          createPinochleGame({ ...data, gameType: "Pinochle" });
          return;
        case "Poker":
          createPokerGame({ ...data, gameType: "Poker" }, "Poker");
          return;
        default:
          throw new Error(`Invalid game type in payload. requestedGameType: ${requestedGameType}`);
      }
		});

		// Explicit game creation events by type
		socket.on("PIN-create_pinochle_game", (data) => {
			console.log(`Received request to create pinochle game lobby...`);
			createPinochleGame({ ...data, gameType: "Pinochle" });
		});

		socket.on("POK-create_poker_game", (data) => {
			console.log(`Received request to create poker game lobby...`);
			createPokerGame({ ...data, gameType: "Poker" }, "Poker");
		});

		socket.on("POK-get_seat_info", (data) => {
			const gameId = data.gameId;
			const pokerGame = pokerGames[gameId];
			const seatInfo: Array<number> = [];
			pokerGame.tablePositions.forEach((pos, index) => {
				if (pos.occupied) {
					seatInfo.push(pos.seatNumber);
				}
			});

			socket.emit("POK-seat_info", { seatInfo });
			console.log(`Emitting socket event 'POK-seat_info'...`, seatInfo);
		});

		// Join an existing game
		socket.on("COM-join_game", (data) => {
			console.log(`Received request to join game lobby...`);

			if (!data || !data.gameId || !data.user) {
				socket.emit("COM-error", { message: `Invalid join_game data | DATA: ${data}}` });
				return;
				}

				const { gameId, user } = data;
				const resolvedGameType: GameType =
					(data?.gameType ||
						defaultGameType ||
						gamesArray.find((g) => g.id === gameId)?.gameType ||
						"Poker"
          ).toString().toLowerCase() === "pinochle"	? "Pinochle" : "Poker";
				const canonicalNamespace = resolveNamespaceForGameType(resolvedGameType);
				const storedNamespace = gameNamespaces[gameId] || canonicalNamespace;

				if (!gameNamespaces[gameId]) {
					gameNamespaces[gameId] = storedNamespace;
				}

				if (storedNamespace !== namespace.name) {
					if (storedNamespace === "/" && namespace.name === canonicalNamespace) {
						gameNamespaces[gameId] = canonicalNamespace;
					} else {
						socket.emit("COM-error", {
							message: `This table is hosted on the '${storedNamespace}' namespace. Please reconnect there to join.`,
						});
						return;
					}
				}

				if (defaultGameType && resolvedGameType !== defaultGameType) {
					socket.emit("COM-error", {
						message: `${resolvedGameType} games are handled on the /${resolvedGameType.toLowerCase()} namespace. Please reconnect there to join.`,
					});
					return;
				}

				if (resolvedGameType === "Pinochle" || pinochleGames[gameId]) {
					handlePinochleJoin({
						socket,
						io,
						gameId,
					user,
					gamesArray,
					pinochleGames,
					broadcastGamesList,
					pendingReconnects,
				});
				return;
			}

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
			const pokerGame = pokerGames[gameId];

			if (!pokerGame) {
				console.log(`Socket Error: Game not found.`);
				socket.emit("COM-error", { message: "Game not found" });
				return;
			}

			if (pokerGame.players.length >= pokerGame.maxPlayers) {
				console.log(`Socket Error: Game is full.`);
				socket.emit("COM-error", { message: "Game is full" });
				return;
			}

			if (!users[userId]) {
				console.log(`Socket Error: User must register first.`);
				socket.emit("COM-error", { message: "You must register first" });
				return;
			}

			// Check if player is already in the game (by username, not socket id)
			const existingPlayerIndex = pokerGame.players.findIndex((p) => p.username === users[userId].username);

			if (existingPlayerIndex >= 0) {

				// Update the player's socket ID
				const oldId = pokerGame.players[existingPlayerIndex].id;
				pokerGame.players[existingPlayerIndex].id = userId;
				console.log(`Player ${users[userId].username} reconnected to game '${pokerGame.name}' with new socket ID ${userId}`);

				// Also update tablePositions to match the new player id
				const seatNum = pokerGame.players[existingPlayerIndex].seatNumber;
				if (seatNum >= 0 && seatNum < pokerGame.tablePositions.length &&	pokerGame.tablePositions[seatNum].playerId === oldId) {
					pokerGame.tablePositions[seatNum].playerId = userId;
					console.log(`Updated tablePositions for seat ${seatNum} to new playerId ${userId}`);
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
        for (let i = 0; i < pokerGame.tablePositions.length; i++) {
          if (!pokerGame.tablePositions[i].occupied) {
            availableSeat = i;
            break;
          }
        }

        if (availableSeat === -1) {
          socket.emit("COM-error", { message: "No available seats" });
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
        player.game = pokerGame;

        // Add player to the game
        pokerGame.addPlayer(player);

        // Update table positions
        pokerGame.tablePositions[availableSeat].occupied = true;
        pokerGame.tablePositions[availableSeat].playerId = player.id;

        // Sort players by seat number to maintain consistent order
        pokerGame.sortPlayerList();

        console.log(
          `New player ${player.username} joined game '${pokerGame.name}' at seat ${availableSeat}`
        );

        // Initialize player's statistis tracking object
        initializePlayerStatsObject(pokerGame, player);
      }

			// Join the game room
			console.log(`Socket.join(${gameId}) executing for user '${user.username}'...`);
			socket.join(gameId);

			// Update the game state for the player who just joined
			socket.emit("POK-game_state", { game: pokerGames[gameId].returnGameState() });

			// Let everyone know someone joined
			console.log(`Player '${users[userId].username} joining game room '${pokerGames[gameId].name}'...`);
			io.to(gameId).emit("POK-player_joined", {
				player: users[userId],
				game: pokerGames[gameId].returnGameState(),
			});

			// Let everyone know about the updated game state
			io.to(gameId).emit("POK-game_state", {
				game: pokerGames[gameId].returnGameState(),
			});

			// Check if we have at least 2 players and all are ready
			if (pokerGame.players.length >= 2 && pokerGame.phase === "waiting") {
				checkRoundStatus(pokerGame, io);
			}

				// Update the games list for all clients
				const gameIndex = gamesArray.findIndex((g) => g.id === gameId);
				if (gameIndex !== -1) {
					gamesArray[gameIndex].playerCount = pokerGame.players.length;
					gamesArray[gameIndex].isStarted = pokerGame.hasStarted;
					broadcastGamesList();
				}

		});

			socket.on("PIN-pinochle_join", (data) => {
				const { gameId, user } = data || {};
				if (!gameId || !user) {
					socket.emit("COM-error", { message: "Invalid join_game data" });
					return;
				}

				const canonicalNamespace = resolveNamespaceForGameType("Pinochle");
				const storedNamespace = gameNamespaces[gameId] || canonicalNamespace;

				if (!gameNamespaces[gameId]) {
					gameNamespaces[gameId] = storedNamespace;
				}

				if (storedNamespace !== namespace.name) {
					if (storedNamespace === "/" && namespace.name === canonicalNamespace) {
						gameNamespaces[gameId] = canonicalNamespace;
					} else {
						socket.emit("COM-error", {
							message: `This table is hosted on the '${storedNamespace}' namespace. Please reconnect there to join.`,
						});
						return;
					}
				}

				if (defaultGameType === "Poker") {
					socket.emit("COM-error", {
						message:
							"Pinochle games are available on the /pinochle namespace. Please reconnect there to join.",
					});
					return;
				}

				handlePinochleJoin({
					socket,
					io,
					gameId,
					user,
					gamesArray,
					pinochleGames,
					broadcastGamesList,
					pendingReconnects,
				});
			});

		// Handle player ready status separately from actions
		socket.on("COM-player_ready", (data) => {
      console.log(`Received socket event 'COM-player_ready'...`, data);
			if (!data || !data.gameId) {
				socket.emit("COM-error", { message: "Invalid ready data" });
				return;
			}

				const { gameId } = data;
				const pinochleGame = pinochleGames[gameId];
				if (pinochleGame) {
					handlePinochleReady(
						pinochleGame,
						socket,
						io,
						gamesArray,
						broadcastGamesList
					);
					return;
				}
			const game = pokerGames[gameId];
			const userId = socket.id;

			if (!game) {
				socket.emit("COM-error", { message: "Game not found" });
				return;
			}

			const player = game.players.find((p) => p.id === userId);
			if (!player) {
				socket.emit("COM-error", { message: "Player not found" });
				return;
			}

			// Toggle ready state
			player.ready = !player.ready;
			console.log(
				`${player.username}'s ready status is now set to '${player.ready}'`
			);

			// Send immediate update about this player's ready status
			io.to(gameId).emit("POK-player_ready_changed", {
				playerId: player.id,
				playerName: player.username,
				isReady: player.ready,
				game: game.returnGameState(),
			});

      // Pass ready status back to player for state sync
      socket.to(userId).emit("POK-player_ready_status", { isReady: player.ready });

			// Check if all players are ready to start game or next round
			if (game.players.length >= 2) {
				const allReady = game.players.every((p) => p.ready);

				if (allReady) {
					if (!game.hasStarted) {
						// Initial game start
						console.log("All players ready, starting game...");
						game.status = "playing";
						game.hasStarted = true;

						io.to(gameId).emit("POK-game_starting", {
							message: "All players ready! Game is starting...",
							game: game.returnGameState(),
						});

						// Start the game after a short delay
						setTimeout(() => {
							game.startRound();

							io.to(gameId).emit("POK-game_update", {
								game: game.returnGameState(),
								message: "Game has started!",
							});

							// Notify first player it's their turn
							if (game.activePlayerId) {
								io.to(game.activePlayerId).emit("POK-your_turn", {
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

						io.to(gameId).emit("POK-round_starting", {
							message: "All players ready! New round is starting...",
							game: game.returnGameState(),
						});

						setTimeout(() => {
							game.startRound();

							io.to(gameId).emit("POK-game_update", {
								game: game.returnGameState(),
								message: "New round has started!",
							});

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
		});

			socket.on("PIN-pinochle_deal", (data) => {
				const { gameId } = data || {};
				const game = pinochleGames[gameId];
				if (!game) return;
				if (game.dealerId && game.dealerId !== socket.id) {
					socket.emit("COM-error", { message: "Only the dealer can deal." });
					return;
				}
				startPinochleRound(game, io, gamesArray, broadcastGamesList);
			});

		socket.on("PIN-pinochle_bid", (data) => {
			const { gameId, amount } = data || {};
			if (!gameId || typeof amount !== "number") return;
			handlePinochleBid(pinochleGames[gameId], socket, io, amount);
		});

		socket.on("PIN-pinochle_bid_pass", (data) => {
			const { gameId } = data || {};
			if (!gameId) return;
			handlePinochleBidPass(pinochleGames[gameId], socket, io);
		});

		socket.on("PIN-pinochle_set_trump", (data) => {
			const { gameId, trump } = data || {};
			if (!gameId || !trump) return;
			handlePinochleSetTrump(pinochleGames[gameId], socket, io, trump);
		});

		socket.on("PIN-pinochle_play_card", (data) => {
			const { gameId, card } = data || {};
			if (!gameId || !card) return;
			handlePinochlePlayCard(pinochleGames[gameId], socket, io, card);
		});

		// Handle player actions (fold, check, call, raise)
		socket.on("POK-player_action", (data) => {
			if (!data || !data.gameId || !data.action) {
				socket.emit("COM-error", { message: "Invalid player action data" });
				return;
			}

			const { gameId, action } = data;
			const game = pokerGames[gameId];
			const userId = socket.id;
			const actionType = action.type;

			if (!game) {
				socket.emit("COM-error", { message: "Game not found" });
				return;
			}

			const player = game.players.find((p) => p.id === userId);
			if (!player) {
				socket.emit("COM-error", { message: "Player not found" });
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
				`Received socket event 'POK-player_action'...\nGame Name: ${game.name} (ID: ${gameId})\nUser: ${player.username} (Chips: ${player.chips})\nAction: ${actionType} (${action.amount})`
			);

			if (
				game.hasStarted &&
				actionType !== "toggleReady" &&
				game.activePlayerId !== userId
			) {
				socket.emit("COM-error", { message: "Not your turn" });
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

          // Update player stats
          game.stats.players[player.username].personalStats.timesFolded += 1;
          game.stats.players[player.username].gameStats.timesFolded += 1;
          break;

        case "check":
          if (game.currentBet > player.currentBet) {
            socket.emit("COM-error", {
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

          // Update player stats
          if (game.stats.players[player.username]) {
            game.stats.players[player.username].personalStats.timesChecked += 1;
            game.stats.players[player.username].gameStats.timesChecked += 1;
          }
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

          // Update player stats
          if (game.stats.players[player.username]) {
            game.stats.players[player.username].personalStats.totalBets += callAmount;
            game.stats.players[player.username].gameStats.totalBets += callAmount;
            game.stats.players[player.username].personalStats.timesBet += 1;
            game.stats.players[player.username].gameStats.timesBet += 1;
          }
          break;

        case "bet":
          const betAmount = action.amount;
          if (betAmount > player.chips) {
            socket.emit("COM-error", {
              message: "You do not have enough chips to bet that amount.",
            });
            return false;
          }
          if (game.currentBet > 0) {
            socket.emit("COM-error", {
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
            game.stats[player.id].betTotal += betAmount;

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

          // Update player stats
          if (game.stats.players[player.username]) {
            game.stats.players[player.username].personalStats.totalBets += betAmount;
            game.stats.players[player.username].gameStats.totalBets += betAmount;
            game.stats.players[player.username].personalStats.timesBet += 1;
            game.stats.players[player.username].gameStats.timesBet += 1;
          }
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


            if (game.stats.players[player.username]) {
              if (!allIn)
                game.stats.players[player.username].personalStats.totalBets += raiseAmount;
              else
                game.stats.players[player.username].personalStats.totalBets += allInAmount;
            }
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

          // Update player stats
          if (game.stats.players[player.username]) {
            game.stats.players[player.username].personalStats.totalBets += raiseAmount;
            game.stats.players[player.username].gameStats.totalBets += raiseAmount;
            game.stats.players[player.username].personalStats.timesRaised += 1;
            game.stats.players[player.username].gameStats.timesRaised += 1;
          }
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
						io.to(gameId).emit("POK-round_winners", {
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
				io.to(gameId).emit("POK-game_update", { game: game.returnGameState() });

				// If the phase changed, send a specific event
				if (previousPhase !== game.phase) {
					io.to(gameId).emit("POK-phase_changed", {
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
					io.to(game.activePlayerId).emit("POK-your_turn", {
						gameId: game.id,
						allowedActions: game.getAllowedActionsForPlayer(
							game.activePlayerId
						),
					});

					// Also broadcast a message to everyone about whose turn it is
					io.to(gameId).emit("POK-active_player_changed", {
						activePlayerId: game.activePlayerId,
						activePlayerName:
							game.players.find((p) => p.id === game.activePlayerId)
								?.username || "Unknown player",
					});
				}
			}
		});

		// Handle chat messages
		socket.on("COM-chat_message", (data) => {
			console.log(`Received socket event 'COM-chat_message'...`, data);
			const userId = socket.id;
			let sender = users[userId]?.username || "SYSTEM";


			if (!data || (!data.gameId && data.scope === "game") || !data.message) {
				socket.emit("COM-error", { message: "Invalid chat message data ya doof!" });
				return;
			}

			const { scope, gameId, message } = data;

      if (!gameId && scope !== "lobby")
        console.log(`Emitting socket event 'COM-chat_message' to specific room '${gameId}'...`);
      else if (scope === "lobby")
        console.log(`Emitting socket event 'COM-chat_message' to lobby...`);
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
        io.to("lobby").emit("COM-chat_message", chatPayload);
      } else if (scope === "game" && gameId) {
        // Send to all users in the game room
        io.to(gameId).emit("COM-chat_message", chatPayload);
      } else if (scope === "pinochle" && gameId) {
        // Send to all users in the game room
        io.to(gameId).emit("COM-chat_message", chatPayload);
      } else {
        console.error(`Invalid chat scope: ${scope}`);
        socket.emit("COM-error", { message: "Invalid chat scope" });
      }
		});

		socket.on("COM-private_message", (data) => {
			console.log(`Received socket event 'COM-private_message'...`);
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
        socket.to(targetSocketId).emit("COM-chat_message", chatPayload);
      else
        socket.emit("COM-error", { message: "Recipient not found" });
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
			Object.keys(pokerGames).forEach((gameId) => {
				const game = pokerGames[gameId];
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
                      io.to(game.activePlayerId).emit("POK-your_turn", {
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
                      io.to(gameId).emit("COM-chat_message", sysChatPayload);

                      // INFO This was the code for broadcasting an update message, but there is no corresponding client-side event handler for this emitted event
                      // INFO Unless this becomes necessary, the update message is handled by a chat message from "SYSTEM" as done above
                      /*io.to(gameId).emit("POK-active_player_changed", {
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
								if (game.players.length > 0 && game.pot > 0) {
									game.players[0].chips += game.pot;
								}
								game.pot = 0;
								}

								if (game.players.length === 0) {
									delete pokerGames[gameId];
									delete gameNamespaces[gameId];

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
								`Emitting socket event 'POK-player_left' to specific room '${gameId}'...`
							);
							io.to(gameId).emit("POK-player_left", {
								playerId: userId,
								game: pokerGames[gameId]?.returnGameState(),
							});

								// Update the games list for all clients
								broadcastGamesList();
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

			// Handle Pinochle disconnects
			Object.keys(pinochleGames).forEach((gameId) => {
				const game = pinochleGames[gameId];
				const playerIndex = game.players.findIndex((p) => p.id === userId);
				if (playerIndex >= 0) {
					const player = game.players[playerIndex];
					const reconnectKey = `${gameId}${player.username}`;

					if (pendingReconnects.has(reconnectKey)) {
						clearTimeout(pendingReconnects.get(reconnectKey)?.timeout);
					}

					const timeout = setTimeout(() => {
						const targetGame = pinochleGames[gameId];
						if (!targetGame) {
							pendingReconnects.delete(reconnectKey);
							return;
						}

						const removalIndex = targetGame.players.findIndex(
							(p) => p.username === player.username
						);

						if (removalIndex < 0) {
							pendingReconnects.delete(reconnectKey);
							return;
						}

						targetGame.players.splice(removalIndex, 1);
						targetGame.roundActive = false;
						targetGame.phase = "waiting";
						targetGame.status = "waitingForPlayers";
						targetGame.trumpSuit = null;
						targetGame.roundBid = 0;
						targetGame.bidLeaderId = undefined;
						targetGame.biddingTeam = undefined;
						targetGame.trick = { leadSuit: null, cards: [] };
						targetGame.activePlayerId = undefined;
						targetGame.activePlayerIndex = undefined;
						targetGame.meldTeamA = 0;
						targetGame.meldTeamB = 0;
						targetGame.trickPointsTeamA = 0;
						targetGame.trickPointsTeamB = 0;

						if (targetGame.players.length === 0) {
							delete pinochleGames[gameId];
							delete gameNamespaces[gameId];
							const idx = gamesArray.findIndex((g) => g.id === gameId);
							if (idx !== -1) gamesArray.splice(idx, 1);
						} else {
							targetGame.dealerIndex = 0;
							targetGame.dealerId = targetGame.players[0].id;
							const listEntry = gamesArray.find((g) => g.id === gameId);
							if (listEntry) {
								listEntry.playerCount = targetGame.players.length;
								listEntry.isStarted = targetGame.roundActive;
							}
							io.to(gameId).emit(
								"PIN-pinochle_update",
								buildPinochleState(targetGame)
							);
						}

						broadcastGamesList();
						pendingReconnects.delete(reconnectKey);
					}, 10000);

					pendingReconnects.set(reconnectKey, {
						userId,
						gameId,
						timestamp: Date.now(),
						timeout,
					});

					console.log(
						`Player ${player.username} disconnected from pinochle game ${gameId}. Setting 10-second timeout for reconnection.`
					);
				}
			});
		});
	});
};

	registerNamespaceHandlers(defaultNamespace);
	registerNamespaceHandlers(lobbyNamespace);
	registerNamespaceHandlers(pokerNamespace);
	registerNamespaceHandlers(pinochleNamespace);
}

function checkRoundStatus(game: Game, io: Namespace) {
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
function handleShowdown(game, io: Namespace) {
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

function resetForNextRound(game, io: Namespace) {

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

// ---------- Pinochle helpers ----------
function buildPinochlePlayerState(
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

function buildPinochleState(game?: PinochleGame | null) {
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

function handlePinochleJoin({
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

function handlePinochleReady(
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

function startPinochleRound(
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

function dealPinochleHands(game: PinochleGame) {
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

function handlePinochleBid(
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

function handlePinochleBidPass(game: PinochleGame, socket, io: Namespace) {
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

function handlePinochleSetTrump(
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

function handlePinochlePlayCard(
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

function completePinochleRound(
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

function determinePinochleWinner(game: PinochleGame, biddingTeam?: TeamId) {
	const { scoreTeamA, scoreTeamB, setsTeamA, setsTeamB } = game;
	if (setsTeamA >= 2 && setsTeamB >= 2) return biddingTeam;
	if (setsTeamA >= 2) return "B";
	if (setsTeamB >= 2) return "A";
	if (scoreTeamA >= 350 && scoreTeamB >= 350) return biddingTeam;
	if (scoreTeamA >= 350) return "A";
	if (scoreTeamB >= 350) return "B";
	return null;
}

function rotateDealer(game: PinochleGame) {
	game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
	game.dealerId = game.players[game.dealerIndex].id;
}

function findNextActiveBidder(game: PinochleGame, currentSeat: number) {
	for (let i = 1; i <= game.players.length; i++) {
		const idx = (currentSeat + i) % game.players.length;
		if (!game.players[idx].passedBid) return idx;
	}
	return game.activePlayerIndex ?? 0;
}

function normalizePinochleBid(raw: number): number {
	let bid = Math.max(50, Math.floor(raw || 0));
	if (bid <= 60) return bid;
	if (bid < 100) return 60 + Math.floor((bid - 60) / 5) * 5;
	return 100 + Math.floor((bid - 100) / 10) * 10;
}

function nextPinochleBid(current: number): number {
	const increment = current >= 100 ? 10 : current >= 60 ? 5 : 1;
	const candidate = current + increment;
	return normalizePinochleBid(candidate);
}

function sortPinochleHand(hand: PinochleCard[], trumpSuit?: Suit | null): PinochleCard[] {
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

function getMarriageSuits(hand: PinochleCard[]): Suit[] {
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

function calculatePinochleMeld(
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

function countMeldTypes(hand: PinochleCard[], trumpSuit: Suit): MeldCount {
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

function scoreMeld(meldObject: MeldCount): number {
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

function determineMeldCards(
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

function getAllowedPinochleCards(
	playerHand: PinochleCard[],
	trick: PinochleTrickState,
	trumpSuit: Suit | null | undefined
): PinochleCard[] {
	if (!trumpSuit) return playerHand;
	if (trick.cards.length === 0) return playerHand;
	const leadingCards = trick.cards.map((entry) => entry.card);
	return DeterminePlayableCards(playerHand, leadingCards, trumpSuit);
}

function findCardIndex(hand: Card[], payload: any): number {
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

function determineTrickWinner(
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

function insertTimestamp(): string {
  return `${formatTimestamp(Date.now())}`;
}

function initializePlayerStatsObject(game: Game, player: Player): void {
  if (!game.stats.players[player.username]) {
    game.stats.players[player.username] = {
      id: '',
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
        leftAt: '',
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
