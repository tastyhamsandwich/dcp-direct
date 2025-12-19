"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@contexts/authContext";
import Lobby from "@comps/game/lobby/Lobby";
import { io, type Socket } from "socket.io-client";
import DraggableChat from "@comps/game/Chat";
import { ResolveSocketUrl } from "@lib/socketUrl";

export default function GameLobby() {
	const { user, loading } = useAuth();
	const [gamesList, setGamesList] = useState<ListEntry[]>([]);
	const [filteredGames, setFilteredGames] = useState<ListEntry[]>([]);
	const [gameFilter, setGameFilter] = useState<GameListFilter>("Both");
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef<Socket | null>(null);
	const lastCreatedGameTypeRef = useRef<GameType>("Poker");
	const gameFilterRef = useRef<GameListFilter>("Both");
	const router = useRouter();

	const filterGamesByType = (games: ListEntry[], filter: GameListFilter) => {
		if (!games || games.length === 0) {
			return [];
		}

		if (filter === "Both") {
			return games;
		}

		const normalizedFilter = filter.toLowerCase();
		return games.filter(
			(game) => (game.gameType || "Poker").toLowerCase() === normalizedFilter
		);
	};

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!loading && !user) {
			router.push("/login");
		}
	}, [user, loading, router]);

	useEffect(() => {
		if (!user) {
			if (socketRef.current) {
				socketRef.current.disconnect();
				socketRef.current = null;
			}
			setIsConnected(false);
			return;
		}

		if (socketRef.current) {
			return;
		}

		const socketInstance = io(ResolveSocketUrl(), {
			transports: ["websocket"],
			withCredentials: true,
		});
		socketRef.current = socketInstance;

		socketInstance.on("connect", () => {
			setIsConnected(true);
			console.log("Connected to server");

			// Register with server upon connection
			socketInstance.emit("COM-register", { profile: user });
		});

		socketInstance.on("COM-registration_success", (data) => {
			console.log("Registration successful:", data);

			// Request games list upon successful registration
			socketInstance.emit("COM-get_games_list", { gameType: gameFilterRef.current });
		});

		socketInstance.on("disconnect", () => {
			setIsConnected(false);
			console.log("Disconnected from server");
		});

		socketInstance.on("COM-games_list", (games) => {
			console.log("Games list received:", games);
			const normalizedGames: ListEntry[] = (games || []).map((game, index) => ({
				...game,
				index: game.index ?? index,
				gameType: game.gameType || "Poker",
			}));

			setGamesList(normalizedGames);
			setFilteredGames(filterGamesByType(normalizedGames, gameFilterRef.current));
		});

		socketInstance.on("COM-game_created", ({ gameId, gameType }) => {
			console.log("Game created, redirecting to:", gameId);
			const typeSegment =
				(gameType || lastCreatedGameTypeRef.current || "Poker").toLowerCase() ===
				"pinochle"
					? "pinochle"
					: "poker";
			router.push(`/game/${typeSegment}/${gameId}`);
		});

		socketInstance.on("COM-error", (error) => {
			console.error("Socket error:", error.message);
			alert(`Error: ${error.message}`);
		});

		return () => {
			setIsConnected(false);
			socketRef.current = null;
			socketInstance.disconnect();
		};
	}, [user, router]);

	useEffect(() => {
		gameFilterRef.current = gameFilter;
		setFilteredGames(filterGamesByType(gamesList, gameFilter));
	}, [gameFilter, gamesList]);

	useEffect(() => {
		if (socketRef.current && isConnected) {
			socketRef.current.emit("COM-get_games_list", { gameType: gameFilter });
		}
	}, [gameFilter, isConnected]);

	const handleCreateGame = (gameData) => {
		if (!socketRef.current || !isConnected || !user) return;

		const selectedGameType: GameType =
			(gameData?.gameType || "").toLowerCase() === "pinochle"
				? "Pinochle"
				: "Poker";
		lastCreatedGameTypeRef.current = selectedGameType;

		console.log("Creating game with settings:", gameData);

		const payload =
			selectedGameType === "Pinochle"
				? {
						gameType: selectedGameType,
						tableName: gameData.name,
						creator: gameData.player,
						wagerPerGame: Math.max(1, Number(gameData.wagerPerGame) || 0),
				  }
				: {
						gameType: selectedGameType,
						tableName: gameData.name,
						creator: gameData.player,
						maxPlayers: gameData.maxPlayers,
						blinds: {
							small: gameData.smallBlind,
							big: gameData.smallBlind * 2,
						},
						gameVariant: gameData.gameVariant || "TexasHoldEm",
				  };

		const eventName =
			selectedGameType === "Pinochle" ? "PIN-create_pinochle_game" : "POK-create_poker_game";
		socketRef.current?.emit(eventName, payload);
	};

	const handleJoinGame = (gameId: string, gameType?: GameType) => {
		if (!gameId || !user || !socketRef.current) return;

		const listGameType = gamesList.find((game) => game.id === gameId)?.gameType;
		const resolvedGameType: GameType =
			(gameType || listGameType || "Poker").toLowerCase() === "pinochle"
				? "Pinochle"
				: "Poker";
		const typeSegment = resolvedGameType.toLowerCase();

		/*socket.emit('POK-get_seat_info', { gameId });

    socketInstance.on('POK-seat_info', (seatInfo) => {
      console.log('Seat info received:', seatInfo);
      const occupiedSeats = seatInfo.seats.map((seat, index) => ({
        seatNumber: index,
        occupied: seat.occupied,
        playerName: seat.playerName || null
      }));
      
      // Open the seat selector dialog
      setSeatSelectorOpen(true);
      setOccupiedSeats(occupiedSeats);
    })*/
		router.push(`/game/${typeSegment}/${gameId}`);
	};

	// Show loading state
	if (loading) {
		return (
			<div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
				<div className="animate-pulse">Loading...</div>
			</div>
		);
	}

	// Show error if not authenticated
	if (!user) {
		return (
			<div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
				<div className="bg-gray-800 p-8 rounded-lg shadow-lg">
					<h2 className="text-xl font-bold mb-4">Authentication Required</h2>
					<p className="mb-4">
						You must be logged in to access the game lobby.
					</p>
					<button
						onClick={() => router.push("/login")}
						className="w-full bg-blue-700 hover:bg-blue-800 text-white font-medium py-2 rounded"
					>
						Go to Login
					</button>
				</div>
			</div>
		);
	}

	return (
    <div className="min-h-screen bg-gray-900 text-gray-200 mt-10 pt-10">
      <div className="empty pt-10"></div>
      <div className="container mx-auto p-4 mt-10">
        <div className="bg-gray-800 border-l-4 border-blue-700 p-4 mb-6 rounded">
          <p className="text-gray-200">
            {isConnected
              ? "✅ Connected to game server"
              : "❌ Disconnected from game server"}
          </p>
        </div>

        <h1 className="text-3xl font-bold mb-6 text-gray-100">
          Game Lobby
        </h1>
        <div className="flex w-full">
          <Lobby
            games={filteredGames}
            profile={user}
            socket={socketRef.current}
            onJoinGame={handleJoinGame}
            onCreateGame={handleCreateGame}
            gameFilter={gameFilter}
            onGameFilterChange={setGameFilter}
          />
          <div>
            <DraggableChat socket={socketRef.current} scope="lobby" />
          </div>
        </div>
      </div>
    </div>
  );
}
