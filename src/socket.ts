import { Server, Namespace } from "socket.io";
//import {	User,	TGamePhase,	ListEntry,	Action,	TGamePhaseCommon,	TGamePhaseHoldEm,	TableSeat,  HandRank,  GameType,  Suit,  Rank } from "@types/game";
import { Player, Game } from "@game/classes";
import { v4 as uuidv4 } from "uuid";
import { PinochleDeck } from "@game/pinochle";
import { formatTimestamp, getSocketIdByUsername } from "./socket/common";
import {
	checkRoundStatus,
	handleShowdown,
	initializePlayerStatsObject,
} from "./socket/pokerHelpers";
import {
	buildPinochlePlayerState,
	buildPinochleState,
	handlePinochleBid,
	handlePinochleBidPass,
	handlePinochleJoin,
	handlePinochlePlayCard,
	handlePinochleReady,
	handlePinochleSetTrump,
	startPinochleRound,
} from "./socket/pinochleHelpers";

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

