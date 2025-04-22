'use client';

import React, { useEffect, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@contexts/authContext';
import { io, Socket } from 'socket.io-client';
import { GameState, GameVariant } from '@game/types';
import Card from '@components/game/Card';
import Deck from '@components/game/Deck';
import Player from '@components/game/Player';
import Table from '@components/game/Table';
import Actions from '@components/game/Actions';
import WinnerDisplay from '@components/game/WinnerDisplay';
import DealerVariantSelector from '@components/game/DealerVariantSelector';
import { Playwrite_ES } from 'next/font/google';

// Define winner info interface
interface WinnerInfo {
  playerId: string;
  playerName: string;
  amount: number;
  potType: string;
  hand?: string;
  cards?: string[];
}

// Define action types
type GameAction =
  | { type: 'SET_SOCKET'; payload: Socket | null }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'ADD_CHAT_MESSAGE'; payload: any }
  | { type: 'ADD_SYSTEM_MESSAGE'; payload: any }
  | { type: 'SET_MESSAGE'; payload: string }
  | { type: 'CLEAR_MESSAGE' }
  | { type: 'SET_WINNERS'; payload: { winners: WinnerInfo[], showdown: boolean } }
  | { type: 'CLEAR_WINNERS' }
  | { type: 'SET_VARIANT_SELECTION_ACTIVE'; payload: boolean }
  | { type: 'SET_SELECTION_TIMEOUT'; payload: number };

// Define state interface
interface GamePageState {
  gameState: GameState | null;
  chatMessages: any[];
  isConnected: boolean;
  socket: Socket | null;
  message: string;
  winners: WinnerInfo[] | null;
  showdown: boolean;
  variantSelectionActive: boolean;
  variantSelectionTimeout: number;
}

// Initial state
const initialState: GamePageState = {
  gameState: null,
  chatMessages: [],
  isConnected: false,
  socket: null,
  message: '',
  winners: null,
  showdown: false,
  variantSelectionActive: false,
  variantSelectionTimeout: 15000
};

// Reducer function
function gameReducer(state: GamePageState, action: GameAction): GamePageState {
  switch (action.type) {
    case 'SET_SOCKET':
      return { ...state, socket: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };
    case 'ADD_CHAT_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'ADD_SYSTEM_MESSAGE':
      return { ...state, chatMessages: [...state.chatMessages, action.payload] };
    case 'SET_MESSAGE':
      return { ...state, message: action.payload };
    case 'CLEAR_MESSAGE':
      return { ...state, message: '' };
    case 'SET_WINNERS':
      return { 
        ...state, 
        winners: action.payload.winners, 
        showdown: action.payload.showdown 
      };
    case 'CLEAR_WINNERS':
      return { ...state, winners: null, showdown: false };
    case 'SET_VARIANT_SELECTION_ACTIVE':
      return { ...state, variantSelectionActive: action.payload };
    case 'SET_SELECTION_TIMEOUT':
      return { ...state, variantSelectionTimeout: action.payload };
    default:
      return state;
  }
}

export default function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
  const [isWinnerOpen, setIsWinnerOpen] = useState<boolean>(false);
  const [allowedActions, setAllowedActions] = useState<string[]>([]);
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { 
    gameState, 
    chatMessages, 
    isConnected, 
    socket, 
    message, 
    winners, 
    showdown, 
    variantSelectionActive, 
    variantSelectionTimeout 
  } = state;
  
  // Function to handle variant selection
  const handleSelectVariant = (variant: GameVariant) => {
    if (!socket || !isConnected || !unwrappedParams.gameId) return;
    
    socket.emit('select_variant', {
      gameId: unwrappedParams.gameId,
      variant
    });
  };
  
  const unwrappedParams = React.use(params);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  // Setup Socket.io connection
  useEffect(() => {
    if (!unwrappedParams.gameId || !user || !profile) return;
    
    // Initialize WebSocket connection to the socket.io server
    const socketInstance = io('localhost:3001'/*'http://randomencounter.ddns.net:3001'*/, {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    
    dispatch({ type: 'SET_SOCKET', payload: socketInstance });
    
    socketInstance.on('connect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: true });
      console.log('Connected to game server');
      
      // Register with server upon connection
      socketInstance.emit('register', { profile });
      
      // Join the game
      socketInstance.emit('join_game', { 
        gameId: unwrappedParams.gameId,
        profile 
      });
    });
    
    socketInstance.on('game_state', (data) => {
      console.log('Game state received:', data);
      dispatch({ type: 'SET_GAME_STATE', payload: data.game });
      setIsMyTurn(data.game.activePlayerId === socketInstance.id)
    });
    
    socketInstance.on('player_joined', (data) => {
      console.log('Player joined:', data);
      dispatch({ type: 'SET_GAME_STATE', payload: data.game });
    });
    
    socketInstance.on('player_left', (data) => {
      console.log('Player left:', data);
      if (data.game) {
        dispatch({ type: 'SET_GAME_STATE', payload: data.game });
      }
    });
    
    socketInstance.on('player_ready_changed', (data) => {
      console.log('Player ready status changed:', data);
      dispatch({ type: 'SET_GAME_STATE', payload: data.game });
    });
    
    socketInstance.on('game_starting', (data) => {
      console.log('Game starting:', data);
      dispatch({ type: 'SET_GAME_STATE', payload: data.game });
      if (data.message) {
        dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: data.message });
      }
    });
    
    socketInstance.on('round_starting', (data) => {
      console.log('Round starting:', data);
      dispatch({ type: 'SET_GAME_STATE', payload: data.game });
      if (data.message) {
        dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: data.message });
      }
    });
    
    socketInstance.on('game_update', (data) => {
      console.log('Game update received:', data);
      dispatch({ type: 'SET_GAME_STATE', payload: data.game });
      setIsMyTurn(data.game.activePlayerId === socketInstance.id);
      // Reset allowed actions unless this is the active player
      if (data.game.activePlayerId !== socketInstance.id) {
        setAllowedActions([]);
      }
      // Show message if provided
      if (data.message) {
        dispatch({ type: 'ADD_SYSTEM_MESSAGE', payload: data.message });
      }
    });
    
    socketInstance.on('round_ended', (data) => {
      console.log('Round ended:', data);
      dispatch({ type: 'SET_GAME_STATE', payload: data.game });
      setIsMyTurn(false);
      // Display message to user if provided
      if (data.message) {
        dispatch({ 
          type: 'ADD_SYSTEM_MESSAGE', 
          payload: {
            sender: 'SYSTEM:', 
            message: data.message, 
            timestamp: new Date().toISOString() 
          }
        });
      }
    });
    
    socketInstance.on('round_winners', (data) => {
      console.log('Round winners received:', data);
      dispatch({ 
        type: 'SET_WINNERS', 
        payload: { 
          winners: data.winners, 
          showdown: data.showdown 
        }
      });
      setIsWinnerOpen(true);
    });
    
    socketInstance.on('chat_message', (data) => {
      console.log('Chat message received:', data);
      dispatch({ type: 'ADD_CHAT_MESSAGE', payload: data });
    });
    
    socketInstance.on('error', (error) => {
      console.error('Socket error:', error.message);
      alert(`Error: ${error.message}`);
    });
    
    socketInstance.on('disconnect', () => {
      dispatch({ type: 'SET_CONNECTED', payload: false });
      console.log('Disconnected from game server');
    });

    socketInstance.on('your_turn', (data) => {
      console.log('Your turn!', data);
      setIsMyTurn(true);
      setAllowedActions(data.allowedActions || []);
    });
    
    // Handler for when variant selection begins
    socketInstance.on('variant_selection_started', (data) => {
      console.log('Variant selection started:', data);
      dispatch({ type: 'SET_VARIANT_SELECTION_ACTIVE', payload: true });
      if (data.timeoutMs) {
        dispatch({ type: 'SET_SELECTION_TIMEOUT', payload: data.timeoutMs });
      }
      if (data.message) {
        dispatch({ 
          type: 'ADD_SYSTEM_MESSAGE', 
          payload: { 
            sender: 'SYSTEM:', 
            message: `${data.message || 'The dealer is selecting the game variant.'}`, 
            timestamp: new Date().toISOString() 
          }
        });
      }
    });
    
    // Handler for when variant selection is complete
    socketInstance.on('variant_selected', (data) => {
      console.log('Variant selected:', data);
      dispatch({ type: 'SET_VARIANT_SELECTION_ACTIVE', payload: false });
      dispatch({ 
        type: 'ADD_SYSTEM_MESSAGE', 
        payload: { 
          sender: 'SYSTEM:', 
          message: `The dealer selected ${data.selectedVariant}${data.defaulted ? ' (default)' : ''}.`, 
          timestamp: new Date().toISOString() 
        }
      });
    });
    
    return () => {
      socketInstance.disconnect();
    };
  }, [unwrappedParams.gameId, user, profile, router]);
  
  const handlePlayerAction = (actionType: string, amount: number = 0) => {
    if (!socket || !isConnected || !unwrappedParams.gameId) return;
    
    socket.emit('player_action', {
      gameId: unwrappedParams.gameId,
      action: { type: actionType, amount }
    });
  };
  
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!socket || !isConnected || !unwrappedParams.gameId || !message.trim()) return;
    
    socket.emit('chat_message', {
      gameId: unwrappedParams.gameId,
      message: message.trim()
    });
    
    dispatch({ type: 'CLEAR_MESSAGE' });
  };
  
  // Show loading state
  if (loading) {
    return <div className="text-center p-10 text-gray-200">Loading...</div>;
  }
  
  // Show error if not authenticated
  if (!user || !profile) {
    return <div className="text-center p-10 text-gray-200">You must be logged in to play.</div>;
  }
  
  // Handler for closing the winner display
  const handleCloseWinnerDisplay = () => {
    setIsWinnerOpen(false);
    // Delay clearing winner data to allow animation to complete
    setTimeout(() => {
      dispatch({ type: 'CLEAR_WINNERS' });
    }, 300);
  };
  
  const handleVariantSelected = () => {
    // This just updates our local state when variant selection is complete
    dispatch({ type: 'SET_VARIANT_SELECTION_ACTIVE', payload: false });
    dispatch({ 
      type: 'ADD_SYSTEM_MESSAGE', 
      payload: { 
        sender: 'SYSTEM:', 
        message: 'Variant selection complete, the game will continue shortly.', 
        timestamp: new Date().toISOString() 
      }
    });
  };

  return (
    <div className="container mx-auto p-4 bg-gray-900 text-gray-200 min-h-screen">
      {/* Dealer's Variant Selector */}
      <DealerVariantSelector
        isVisible={variantSelectionActive && gameState?.gameVariant === 'DealersChoice'}
        dealerId={gameState?.dealerId}
        currentPlayerId={socket?.id}
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
            ? '✅ Connected to game server' 
            : '❌ Disconnected from game server'}
        </p>
      </div>
      
      <h1 className="text-2xl font-bold mb-4 text-gray-100">
        Game Room: {gameState?.name || unwrappedParams.gameId}
      </h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Game Table</h2>
          
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
                  <span className="ml-2 text-gray-200">{gameState.currentBet}</span>
                </div>
                <div className="bg-gray-700 p-3 rounded col-span-2">
                  <span className="text-gray-400">Game Variant:</span> 
                  <span className="ml-2 text-gray-200">
                    {gameState.gameVariant === 'DealersChoice' 
                      ? (gameState.currentSelectedVariant 
                          ? `Dealer's Choice (${gameState.currentSelectedVariant})` 
                          : "Dealer's Choice (waiting for dealer)")
                      : gameState.gameVariant}
                  </span>
                </div>
              </div>
              
              <div className="poker-game-container mt-6 mb-6">
                <Table 
                  gameState={{
                    players: gameState.players.map(player => ({
                      id: player.id,
                      name: player.username,
                      chips: player.chips,
                      cards: player.cards.map(card => ({
                        rank: card.rank,
                        suit: card.suit
                      })),
                      bet: player.currentBet,
                      folded: player.folded || false,
                      canCheck: gameState.currentBet === 0,
                      currentBet: gameState.currentBet,
                      minRaise: gameState.currentBet - player.currentBet,
                      previousAction: player.previousAction
                    })),
                    communityCards: gameState.communityCards.map(card => ({
                      rank: card.rank,
                      suit: card.suit
                    })),
                    pot: gameState.pot,
                    currentTurn: gameState.activePlayerId,
                    dealerIndex: gameState.dealerIndex,
                    smallBlindIndex: gameState.smallBlindIndex,
                    bigBlindIndex: gameState.bigBlindIndex,
                    roundActive: gameState.roundActive,
                  }}
                  currentPlayerId={socket!.id}
                  onAction={handlePlayerAction}
                />
                <div className="deck-container absolute bottom-4 right-4">
                  <Deck scaleFactor={1} />
                </div>
              </div>
              
              <h3 className="font-medium mt-6 mb-3 text-gray-300">Players:</h3>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gameState.players.map((player, index) => (
                  <li 
                    key={player.id} 
                    className={`p-3 rounded ${player.id === socket?.id ? 'bg-gray-600 border border-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-200">
                        {player.username}
                      </span>
                      <div className="flex gap-2">
                        {gameState.status === 'waiting' && player.ready && 
                          <span className="bg-green-700 text-xs px-2 py-1 rounded-full text-white">Ready</span>
                        }
                        {player.id === gameState.activePlayerId && 
                          <span className="bg-blue-700 text-xs px-2 py-1 rounded-full text-white">Active</span>
                        }
                      </div>
                    </div>
                    <div className="text-sm text-gray-300">Chips: {player.chips}</div>
                    <div className="text-sm text-gray-300 flex gap-2 mt-2">
                      {player.cards.length > 0 ? (
                        player.id === socket?.id ? 
                          player.cards.map((card, idx) => (
                            <Card
                              scaleFactor={1} 
                              key={idx} 
                              rank={card.rank} 
                              suit={card.suit}
                            />
                          )) : 
                          Array(player.cards.length).fill(0).map((_, idx) => (
                            <Card
                              scaleFactor={0.5} 
                              key={idx} 
                              rank="2" 
                              suit="hearts" 
                              faceDown={true}
                            />
                          ))
                      ) : (
                        <span>No cards</span>
                      )}
                    </div>
                    {player.currentBet > 0 && 
                      <div className="text-sm text-gray-300">Bet: {player.currentBet}</div>
                    }
                    {player.previousAction !== 'none' && 
                      <div className="text-sm text-gray-400">Action: {player.previousAction}</div>
                    }
                  </li>
                ))}
              </ul>
              
              {gameState.communityCards.length > 0 && (
                <div className="mt-6 bg-gray-700 p-3 rounded">
                  <h3 className="font-medium mb-2 text-gray-300">Community Cards:</h3>
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
              {gameState.status === 'waiting' && (
                <div className="mt-6">
                  <Actions
                    roundStatus="waiting"
                    canCheck={false}
                    gameCurrentBet={0}
                    playerCurrentBet={0}
                    minRaise={0}
                    playerChips={gameState.players.find(p => p.id === socket?.id)?.chips || 0}
                    onAction={handlePlayerAction}
                    isActive={true}
                    allowedActions={[]}
                    isPlayerReady={gameState.players.find(p => p.id === socket?.id)?.ready || false}
                  />
                </div>
              )}
              
              {/* Only show game actions for the active player during gameplay */}
              {gameState.status === 'playing' && gameState.activePlayerId === socket?.id && (
                <div className="mt-6">
                  <Actions
                    roundStatus="playing"
                    canCheck={gameState.currentBet === (gameState.players.find(p => p.id === socket?.id)?.currentBet || 0)}
                    gameCurrentBet={gameState.currentBet}
                    playerCurrentBet={gameState.players.find(p=> p.id === socket?.id)?.currentBet || 0}
                    minRaise={gameState.currentBet > 0 ? (gameState.currentBet - gameState.players.find(p => p.id === socket.id)!.currentBet) : 5}
                    playerChips={gameState.players.find(p => p.id === socket?.id)?.chips || 0}
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
              <div className="animate-pulse text-gray-400">Loading game data...</div>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-1 bg-gray-800 p-4 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-100">Chat</h2>
          
          <div className="h-64 overflow-y-auto border border-gray-700 rounded p-2 mb-4 bg-gray-700">
            {chatMessages.length === 0 ? (
              <p className="text-gray-400 text-center italic p-4">No messages yet</p>
            ) : (
              <div className="space-y-2 p-1">
                {chatMessages.map((msg, i) => (
                  <div key={i} className="bg-gray-800 p-2 rounded">
                    <span className="font-medium text-blue-400">{msg.sender}: </span>
                    <span className="text-gray-200">{msg.message}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <form onSubmit={handleSendMessage} className="flex">
            <input
              type="text"
              value={message}
              onChange={(e) => dispatch({ type: 'SET_MESSAGE', payload: e.target.value })}
              placeholder="Type a message..."
              className="flex-1 border border-gray-600 bg-gray-700 text-gray-200 rounded-l px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />
            <button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-r"
            >
              Send
            </button>
          </form>
        </div>
      </div>
      
      <div className="mt-6">
        <button
          onClick={() => router.push('/game')}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}