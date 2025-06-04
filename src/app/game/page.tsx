"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@contexts/authContext";
import Lobby from "@comps/game/lobby/Lobby";
import { User, ListEntry } from "@game/types";
import { io, type Socket } from "socket.io-client";
import { SeatSelector } from "@comps/game/SeatSelector";
import DraggableChat from "@comps/game/Chat";

export default function GameLobby() {
	const { user, loading } = useAuth();
	const [gamesList, setGamesList] = useState<ListEntry[]>([]);
	const [isConnected, setIsConnected] = useState(false);
	const socketRef = useRef<Socket | null>(null);
	const router = useRouter();

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!loading && !user) {
			router.push("/login");
		}
	}, [user, loading, router]);

	useEffect(() => {
		if (!user) return;

		// Initialize WebSocket connection to the socket.io server running on port 3001
		//const socketInstance = io("http://randomencounter.ddns.net:3001", {
		if (socketRef.current === null) {
      socketRef.current = io("http://172.28.229.234:3001", {
        transports: ["websocket"],
        withCredentials: true,
      });
    }
    
    const socketInstance = io("172.28.229.234:3001", {
      transports: ["websocket"],
      withCredentials: true,
    });
		socketRef.current = socketInstance;

    const socket = socketRef.current;

		socketInstance.on("connect", () => {
			setIsConnected(true);
			console.log("Connected to server");

			// Register with server upon connection
			socketInstance.emit("register", { profile: user });
		});

		socketInstance.on("registration_success", (data) => {
			console.log("Registration successful:", data);

			// Request games list upon successful registration
			socketInstance.emit("get_games_list");
		});

		socketInstance.on("disconnect", () => {
			setIsConnected(false);
			console.log("Disconnected from server");
		});

		socketInstance.on("games_list", (games) => {
			console.log("Games list received:", games);
			setGamesList(games || []);
		});

		socketInstance.on("game_created", ({ gameId }) => {
			console.log("Game created, redirecting to:", gameId);
			router.push(`/game/${gameId}`);
		});

		socketInstance.on("error", (error) => {
			console.error("Socket error:", error.message);
			alert(`Error: ${error.message}`);
		});

		return () => {
			socketInstance.disconnect();
		};
	}, [user, router]);

	const handleCreateGame = (gameData) => {
		if (!socketRef || !isConnected || !user) return;

		console.log("Creating game with settings:", gameData);
		socketRef.current?.emit("create_game", {
			tableName: gameData.name,
			creator: gameData.player,
			maxPlayers: gameData.maxPlayers,
			blinds: {
				small: gameData.smallBlind,
				big: gameData.smallBlind * 2,
			},
			gameVariant: gameData.gameVariant || "TexasHoldEm", // Include the selected game variant
		});
	};

	const handleJoinGame = (gameId) => {
		if (!gameId || !user || !socketRef.current) return;

		/*socket.emit('get_seat_info', { gameId });

    socketInstance.on('seat_info', (seatInfo) => {
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
		router.push(`/game/${gameId}`);
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
          Poker Game Lobby
        </h1>
        <div className="flex w-full">
          <Lobby
            games={gamesList}
            profile={user}
            socket={socketRef.current}
            onJoinGame={handleJoinGame}
            onCreateGame={handleCreateGame}
          />
          <div>
            <DraggableChat socket={socketRef.current} scope="lobby" />
          </div>
        </div>
      </div>
    </div>
  );
}
