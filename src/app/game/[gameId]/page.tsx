"use client";

import React, { useEffect, useReducer, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@contexts/authContext";
import { io, Socket } from "socket.io-client";
import { GameState, GameVariant, WinnerInfo } from "@game/types";
import Card from "@components/game/Card";
import DraggableChat from '@comps/game/Chat';
import Table from "@components/game/Table";
import Actions from "@components/game/Actions";
import WinnerDisplay from "@components/game/WinnerDisplay";
import DealerVariantSelector from "@components/game/DealerVariantSelector";
import { SeatSelector } from "@components/game/SeatSelector";
import { Playwrite_ES } from "next/font/google";

// Define action types
export type GameAction =
	| { type: "SET_SOCKET"; payload: Socket | null }
	| { type: "SET_CONNECTED"; payload: boolean }
	| { type: "SET_GAME_STATE"; payload: GameState }
	| { type: "ADD_CHAT_MESSAGE"; payload: any }
	| { type: "ADD_SYSTEM_MESSAGE"; payload: any }
	| { type: "SET_MESSAGE"; payload: string }
	| { type: "CLEAR_MESSAGE" }
	| {
			type: "SET_WINNERS";
			payload: { winners: WinnerInfo[]; showdown: boolean };
	  }
	| { type: "CLEAR_WINNERS" }
	| { type: "SET_VARIANT_SELECTION_ACTIVE"; payload: boolean }
	| { type: "SET_SELECTION_TIMEOUT"; payload: number };

// Define state interface
interface GamePageState {
	gameState: GameState | null;
	chatMessages: any[];
	isConnected: boolean;
	socket: Socket | null;
	message: string;
	winners: WinnerInfo[] | null;
	showdown: boolean;
	isShowdownPhase: boolean; // Flag to track if game is in showdown phase
	variantSelectionActive: boolean;
	variantSelectionTimeout: number;
}

// Initial state
const initialState: GamePageState = {
	gameState: null,
	chatMessages: [],
	isConnected: false,
	socket: null,
	message: "",
	winners: null,
	showdown: false,
	isShowdownPhase: false,
	variantSelectionActive: false,
	variantSelectionTimeout: 15000,
};

// Reducer function
function gameReducer(state: GamePageState, action: GameAction): GamePageState {
	switch (action.type) {
		case "SET_CONNECTED":
			return { ...state, isConnected: action.payload };
		case "SET_GAME_STATE":
			// Update isShowdownPhase when the game enters the showdown phase
			return {
				...state,
				gameState: action.payload,
				isShowdownPhase: action.payload?.phase === "showdown",
			};
		case "ADD_CHAT_MESSAGE":
			return {
				...state,
				chatMessages: [...state.chatMessages, action.payload],
			};
		case "ADD_SYSTEM_MESSAGE":
			return {
				...state,
				chatMessages: [...state.chatMessages, action.payload],
			};
		case "SET_MESSAGE":
			return { ...state, message: action.payload };
		case "CLEAR_MESSAGE":
			return { ...state, message: "" };
		case "SET_WINNERS":
			return {
				...state,
				winners: action.payload.winners,
				showdown: action.payload.showdown,
			};
		case "CLEAR_WINNERS":
			return { ...state, winners: null, showdown: false };
		case "SET_VARIANT_SELECTION_ACTIVE":
			return { ...state, variantSelectionActive: action.payload };
		case "SET_SELECTION_TIMEOUT":
			return { ...state, variantSelectionTimeout: action.payload };
		default:
			return state;
	}
}

export default function GamePage({
	params,
}: {
	params: Promise<{ gameId: string }>;
}) {
	const { user, loading } = useAuth();
	const router = useRouter();
	const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
	const [isWinnerOpen, setIsWinnerOpen] = useState<boolean>(false);
	const [allowedActions, setAllowedActions] = useState<string[]>([]);
	const [state, dispatch] = useReducer(gameReducer, initialState);
  const [isPlayerReady, setIsPlayerReady] = useState<boolean>(false);
  const socketRef = useRef<Socket | null>(null);
	/*const [showSeatSelector, setShowSeatSelector] = useState<boolean>(false);
  const [occupiedSeats, setOccupiedSeats] = useState<Array<{
    seatNumber: number;
    occupied: boolean;
    playerName: string | null;
  }>>([]);*/

	const {
		gameState,
		chatMessages,
		isConnected,
		socket,
		message,
		winners,
		showdown,
		isShowdownPhase,
		variantSelectionActive,
		variantSelectionTimeout,
	} = state;

	// Function to handle variant selection
	const handleSelectVariant = (variant: GameVariant) => {
		if (!socketRef || !isConnected || !unwrappedParams.gameId) return;

		socketRef.current?.emit("select_variant", {
			gameId: unwrappedParams.gameId,
			variant,
		});
	};

	const unwrappedParams = React.use(params);

  useEffect(() => {
    if (!gameState || !socketRef.current) return;

    const currentPlayer = gameState.players.find((params) => params.id === socketRef.current?.id);
    setIsPlayerReady(currentPlayer ? !!currentPlayer.ready : false);
  }, [gameState, socketRef.current]);

	// Redirect to login if not authenticated
	useEffect(() => {
		if (!loading && !user) {
			router.push("/login");
		}
	}, [user, loading, router]);

	// Setup Socket.io connection
	useEffect(() => {
		if (!unwrappedParams.gameId || !user) return;

		// Initialize WebSocket connection to the socket.io server
		//const socketRef.current = io("http://randomencounter.ddns.net:3001", {
		/*const socketRef.current = io("localhost:3001", {
			transports: ["websocket"],
			withCredentials: true,
		});*/

		socketRef.current = io(
      `${process.env.SOCKET_HOST}:${process.env.SOCKET_PORT}`,
      {
        transports: ["websocket"],
        withCredentials: true,
      }
    );

    socketRef.current.on(
      "player_ready_status",
      (data: { playerId: string; isReady: boolean }) => {
        if (data.playerId === socketRef.current?.id) {
          setIsPlayerReady(data.isReady);
          console.log(`Received player ready status update: ${data.isReady}`);
        }
      }
    );

		socketRef.current.on("connect", () => {
			dispatch({ type: "SET_CONNECTED", payload: true });
			console.log("Connected to game server");

			// Register with server upon connection
			socketRef.current?.emit("register", { profile: user });

			// Join the game
			socketRef.current?.emit("join_game", {
				gameId: unwrappedParams.gameId,
				user,
			});
		});

		// Add handler for seat selection request
		/*socketRef.current.on('select_seat', (data) => {
      console.log('Received seat selection request:', data);
      setOccupiedSeats(data.occupiedSeats);
      setShowSeatSelector(true);
    });*/

		socketRef.current.on("game_state", (data) => {
			console.log("Game state received:", data);
			dispatch({ type: "SET_GAME_STATE", payload: data.game });
			setIsMyTurn(data.game.activePlayerId === socketRef.current?.id);
		});

		socketRef.current.on("player_joined", (data) => {
			console.log("Player joined:", data);
			dispatch({ type: "SET_GAME_STATE", payload: data.game });
		});

		socketRef.current.on("player_left", (data) => {
			console.log("Player left:", data);
			if (data.game) {
				dispatch({ type: "SET_GAME_STATE", payload: data.game });
			}
		});

		socketRef.current.on("player_ready_changed", (data) => {
			console.log("Player ready status changed:", data);
			dispatch({ type: "SET_GAME_STATE", payload: data.game });
		});

		socketRef.current.on("game_starting", (data) => {
			console.log("Game starting:", data);
			dispatch({ type: "SET_GAME_STATE", payload: data.game });
			if (data.message) {
				dispatch({ type: "ADD_SYSTEM_MESSAGE", payload: data.message });
			}
		});

		socketRef.current.on("round_starting", (data) => {
			console.log("Round starting:", data);
			dispatch({ type: "SET_GAME_STATE", payload: data.game });
			if (data.message) {
				dispatch({ type: "ADD_SYSTEM_MESSAGE", payload: data.message });
			}
		});

		socketRef.current.on("game_update", (data) => {
			console.log("Game update received:", data);
			dispatch({ type: "SET_GAME_STATE", payload: data.game });
			setIsMyTurn(data.game.activePlayerId === socketRef.current?.id);
			// Reset allowed actions unless this is the active player
			if (data.game.activePlayerId !== socketRef.current?.id) {
				setAllowedActions([]);
			}
			// Show message if provided
			if (data.message) {
				dispatch({ type: "ADD_SYSTEM_MESSAGE", payload: data.message });
			}
		});

		socketRef.current.on("round_ended", (data) => {
			console.log("Round ended:", data);
			dispatch({ type: "SET_GAME_STATE", payload: data.game });
			setIsMyTurn(false);
			// Display message to user if provided
			if (data.message) {
				dispatch({
					type: "ADD_SYSTEM_MESSAGE",
					payload: {
						sender: "SYSTEM:",
						message: data.message,
						timestamp: new Date().toISOString(),
					},
				});
			}
		});

    socketRef.current.on("round_reset", (data) => {
      console.log("Resetting round:", data);
      dispatch({ type: "SET_GAME_STATE", payload: data.game });
      setIsMyTurn(false);
    });

		socketRef.current.on("round_winners", (data) => {
			console.log("Round winners received:", data);
			dispatch({
				type: "SET_WINNERS",
				payload: {
					winners: data.winners,
					showdown: data.showdown,
				},
			});
			setIsWinnerOpen(true);
		});

		socketRef.current.on("chat_message", (data) => {
			console.log("Chat message received:", data);
			dispatch({ type: "ADD_CHAT_MESSAGE", payload: data });
		});

		socketRef.current.on("error", (error) => {
			console.error("Socket error:", error.message);
			alert(`Error: ${error.message}`);
		});

		socketRef.current.on("disconnect", () => {
			dispatch({ type: "SET_CONNECTED", payload: false });
			console.log("Disconnected from game server");
		});

		socketRef.current.on("your_turn", (data) => {
			console.log("Your turn!", data);
			setIsMyTurn(true);
			setAllowedActions(data.allowedActions || []);
		});

		// Handler for when variant selection begins
		socketRef.current.on("variant_selection_started", (data) => {
			console.log("Variant selection started:", data);
			dispatch({ type: "SET_VARIANT_SELECTION_ACTIVE", payload: true });
			if (data.timeoutMs) {
				dispatch({ type: "SET_SELECTION_TIMEOUT", payload: data.timeoutMs });
			}
			if (data.message) {
				dispatch({
					type: "ADD_SYSTEM_MESSAGE",
					payload: {
						sender: "SYSTEM:",
						message: `${
							data.message || "The dealer is selecting the game variant."
						}`,
						timestamp: new Date().toISOString(),
					},
				});
			}
		});

		// Handler for when variant selection is complete
		socketRef.current.on("variant_selected", (data) => {
			console.log("Variant selected:", data);
			dispatch({ type: "SET_VARIANT_SELECTION_ACTIVE", payload: false });
			dispatch({
				type: "ADD_SYSTEM_MESSAGE",
				payload: {
					sender: "SYSTEM:",
					message: `The dealer selected ${data.selectedVariant}${
						data.defaulted ? " (default)" : ""
					}.`,
					timestamp: new Date().toISOString(),
				},
			});
		});

		return () => {
			socketRef.current?.disconnect();
      socketRef.current?.off("player_ready_status");
      socketRef.current?.off("game_state");
      socketRef.current?.off("your_turn");
      socketRef.current?.off("disconnect");
      socketRef.current?.off("variant_selected");
      socketRef.current?.off("round_ended");
      socketRef.current?.off("variant_Selection_started");
      socketRef.current?.off("error");
      socketRef.current?.off("chat_message");
      socketRef.current?.off("game_update");
      socketRef.current?.off("game_starting");
      socketRef.current?.off("player_left");
      socketRef.current?.off("player_joined");
      socketRef.current?.off("round_starting");
      socketRef.current?.off("round_winners");
		};
	}, [unwrappedParams.gameId, user, router]);

	/*const handleSeatSelect = (seatNumber: number) => {
    if (!socket || !isConnected || !unwrappedParams.gameId) return;
    
    // Join the game with selected seat
    socketRef.current?.emit('join_game', { 
      gameId: unwrappedParams.gameId,
      profile,
      seatNumber
    });
    
    setShowSeatSelector(false);
  };*/

	const handlePlayerAction = (actionType: string, amount: number = 0) => {
		if (!socketRef.current || !isConnected || !unwrappedParams.gameId) return;

		if (actionType === "player_ready") {
			socketRef.current?.emit("player_ready", {
        gameId: unwrappedParams.gameId,
      });
		} else {
			socketRef.current?.emit("player_action", {
        gameId: unwrappedParams.gameId,
        action: { type: actionType, amount },
      });
		}
	};

	const handleSendMessage = (e: React.FormEvent) => {
		e.preventDefault();

		if (!socketRef.current || !isConnected || !unwrappedParams.gameId || !message.trim())
			return;

		socketRef.current?.emit("chat_message", {
      gameId: unwrappedParams.gameId,
      message: message.trim(),
    });

		dispatch({ type: "CLEAR_MESSAGE" });
	};

	// Show loading state
	if (loading) {
		return <div className="text-center p-10 text-gray-200">Loading...</div>;
	}

	// Show error if not authenticated
	if (!user) {
		return (
			<div className="text-center p-10 text-gray-200">
				You must be logged in to play.
			</div>
		);
	}

	// Handler for closing the winner display
	const handleCloseWinnerDisplay = () => {
		setIsWinnerOpen(false);
		// Delay clearing winner data to allow animation to complete
		setTimeout(() => {
			dispatch({ type: "CLEAR_WINNERS" });
		}, 300);
	};

	const handleVariantSelected = () => {
		// This just updates our local state when variant selection is complete
		dispatch({ type: "SET_VARIANT_SELECTION_ACTIVE", payload: false });
		dispatch({
			type: "ADD_SYSTEM_MESSAGE",
			payload: {
				sender: "SYSTEM:",
				message: "Variant selection complete, the game will continue shortly.",
				timestamp: new Date().toISOString(),
			},
		});
	};

	return (
    <div className="container mx-auto p-4 bg-gray-900 text-gray-200 min-h-screen">
      {/* Add SeatSelector component 
      <SeatSelector
        isOpen={showSeatSelector}
        onClose={() => setShowSeatSelector(false)}
        onSeatSelect={handleSeatSelect}
        maxPlayers={gameState?.maxPlayers || 9}
        occupiedSeats={occupiedSeats}
      />
      */}

      {/* Dealer's Variant Selector */}
      <DealerVariantSelector
        isVisible={
          variantSelectionActive && gameState?.gameVariant === "DealersChoice"
        }
        dealerId={gameState?.dealerId}
        currentPlayerId={socketRef.current?.id}
        gameId={unwrappedParams.gameId}
        onVariantSelected={handleVariantSelected}
        timeoutMs={variantSelectionTimeout}
      />

      {/* Winner display modal */}
      {winners && (
        <WinnerDisplay
          winners={winners}
          showdown={showdown}
          isOpen={isWinnerOpen}
          onClose={handleCloseWinnerDisplay}
        />
      )}

      <div className="bg-gray-800 border-l-4 border-blue-700 p-4 mb-4 rounded">
        <p className="text-gray-200">
          {isConnected
            ? "✅ Connected to game server"
            : "❌ Disconnected from game server"}
        </p>
      </div>

      <h1 className="text-2xl font-bold mb-4 text-gray-100">
        Game Room: {gameState?.name || unwrappedParams.gameId}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">
            Game Table
          </h2>

          {gameState ? (
            <div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-700 p-3 rounded">
                  <span className="text-gray-400">Status:</span>
                  <span className="ml-2 text-gray-200">{gameState.status}</span>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <span className="text-gray-400">Phase:</span>
                  <span className="ml-2 text-gray-200">{gameState.phase}</span>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <span className="text-gray-400">Pot:</span>
                  <span className="ml-2 text-gray-200">{gameState.pot}</span>
                </div>
                <div className="bg-gray-700 p-3 rounded">
                  <span className="text-gray-400">Current Bet:</span>
                  <span className="ml-2 text-gray-200">
                    {gameState.currentBet}
                  </span>
                </div>
                <div className="bg-gray-700 p-3 rounded col-span-2">
                  <span className="text-gray-400">Game Variant:</span>
                  <span className="ml-2 text-gray-200">
                    {gameState.gameVariant === "DealersChoice"
                      ? gameState.currentSelectedVariant
                        ? `Dealer's Choice (${gameState.currentSelectedVariant})`
                        : "Dealer's Choice (waiting for dealer)"
                      : gameState.gameVariant}
                  </span>
                </div>
              </div>

              <div className="poker-game-container mt-6 mb-6">
                <Table
                  players={gameState.players.map((player) => ({
                    id: player.id,
                    name: player.username,
                    chips: player.chips,
                    cards: player.cards,
                    folded: player.folded,
                    currentBet: player.currentBet,
                    previousAction: player.previousAction,
                  }))}
                  communityCards={gameState.communityCards}
                  pot={gameState.pot}
                  dealerIndex={gameState.dealerIndex}
                  smallBlindIndex={gameState.smallBlindIndex ?? -1}
                  bigBlindIndex={gameState.bigBlindIndex ?? -1}
                  activePlayerIndex={gameState.activePlayerIndex}
                  currentPlayerId={socketRef.current?.id || ""}
                  winners={winners || []}
                />
              </div>

              <h3 className="font-medium mt-6 mb-3 text-gray-300">Players:</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gameState.players.map((player, index) => (
                  <li
                    key={player.id}
                    className={`p-3 rounded ${
                      player.id === socket?.id
                        ? "bg-gray-600 border border-blue-600"
                        : "bg-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-200">
                        {player.username}
                      </span>
                      <div className="flex gap-2">
                        {gameState.status === "waiting" && player.ready && (
                          <span className="bg-green-700 text-xs px-2 py-1 rounded-full text-white">
                            Ready
                          </span>
                        )}
                        {player.id === gameState.activePlayerId && (
                          <span className="bg-blue-700 text-xs px-2 py-1 rounded-full text-white">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">
                      Chips: {player.chips}
                    </div>
                    <div className="text-sm text-gray-300 flex gap-2 mt-2">
                      {player.cards.length > 0 ? (
                        // Show all cards face up if it's the current player or during showdown
                        player.id === socketRef.current?.id || isShowdownPhase ? (
                          player.cards.map((card, idx) => (
                            <Card
                              scaleFactor={1}
                              key={idx}
                              rank={card.rank}
                              suit={card.suit}
                            />
                          ))
                        ) : (
                          Array(player.cards.length)
                            .fill(0)
                            .map((_, idx) => (
                              <Card
                                scaleFactor={1}
                                key={idx}
                                rank="2"
                                suit="hearts"
                                faceDown={true}
                              />
                            ))
                        )
                      ) : (
                        <span>No cards</span>
                      )}
                    </div>
                    {player.currentBet > 0 && (
                      <div className="text-sm text-gray-300">
                        Bet: {player.currentBet}
                      </div>
                    )}
                    {player.previousAction !== "none" && (
                      <div className="text-sm text-gray-400">
                        Action: {player.previousAction}
                      </div>
                    )}
                  </li>
                ))}
              </ul>

              {gameState.communityCards.length > 0 && (
                <div className="mt-6 bg-gray-700 p-3 rounded">
                  <h3 className="font-medium mb-2 text-gray-300">
                    Community Cards:
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {gameState.communityCards.map((card, idx) => (
                      <Card
                        scaleFactor={1}
                        key={idx}
                        rank={card.rank}
                        suit={card.suit}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Only show the "Ready" button before the game starts */}
              {gameState.status === "waiting" && (
                <div className="mt-6">
                  <Actions
                    gameId={unwrappedParams.gameId}
                    socket={socketRef.current}
                    roundStatus="waiting"
                    canCheck={false}
                    gameCurrentBet={0}
                    playerCurrentBet={0}
                    minRaise={0}
                    playerChips={
                      gameState.players.find(
                        (p) => p.id === socketRef.current?.id
                      )?.chips || 0
                    }
                    gamePhase={gameState.phase}
                    onAction={handlePlayerAction}
                    isActive={true}
                    allowedActions={[]}
                    isPlayerReady={
                      gameState.players.find(
                        (p) => p.id === socketRef.current?.id
                      )?.ready || false
                    }
                  />
                </div>
              )}

              {/* Only show game actions for the active player during gameplay */}
              {gameState.status === "playing" &&
                gameState.activePlayerId === socketRef.current?.id && (
                  <div className="mt-6">
                    <Actions
                      gameId={unwrappedParams.gameId}
                      socket={socketRef.current}
                      roundStatus="playing"
                      canCheck={
                        gameState.currentBet ===
                        (gameState.players.find(
                          (p) => p.id === socketRef.current?.id
                        )?.currentBet || 0)
                      }
                      gameCurrentBet={gameState.currentBet}
                      playerCurrentBet={
                        gameState.players.find(
                          (p) => p.id === socketRef.current?.id
                        )?.currentBet || 0
                      }
                      minRaise={
                        gameState.currentBet > 0
                          ? gameState.currentBet -
                            gameState.players.find(
                              (p) => p.id === socketRef.current?.id
                            )!.currentBet
                          : 5
                      }
                      playerChips={
                        gameState.players.find(
                          (p) => p.id === socketRef.current?.id
                        )?.chips || 0
                      }
                      gamePhase={gameState.phase}
                      onAction={handlePlayerAction}
                      isActive={true}
                      allowedActions={allowedActions}
                      isPlayerReady={true}
                    />
                  </div>
                )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse text-gray-400">
                Loading game data...
              </div>
            </div>
          )}
        </div>

        <DraggableChat socket={socketRef.current} scope="game" />
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push("/game")}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
        >
          Back to Lobby
        </button>
      </div>

      {/* Debug Section: Only show in development */}
      {process.env.NODE_ENV !== "production" && gameState && (
        <div className="mt-10 p-4 bg-gray-950 text-green-300 rounded overflow-x-auto">
          <h2 className="text-lg font-bold mb-2">[DEBUG] Game State</h2>
          <pre className="text-xs whitespace-pre-wrap break-all max-h-96 overflow-y-auto border border-green-700 rounded bg-gray-900 p-2 mb-4">
            {JSON.stringify(gameState, null, 2)}
          </pre>
          <h3 className="text-md font-semibold mb-1">Players</h3>
          {gameState.players.map((player, idx) => (
            <div
              key={player.id || idx}
              className="mb-2 p-2 bg-gray-800 rounded border border-green-700"
            >
              <pre className="text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(player, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
