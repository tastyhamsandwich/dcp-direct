import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWebSocket } from '@hooks/useWebSocket';
import { GameState, Player } from '@game/gameLogic';

// Define our game context interface
interface IGameContext {
  state: GameState;
  currentPlayer: Player | null;
  dispatch: React.Dispatch<any>;
  sendAction: (actionType: string, data?: any) => void;
  isConnected: boolean;
}

const GameContext = createContext<IGameContext | null>(null);

// Initial state for our game
const initialState: GameState = {
  id: '',
  players: [],
  deck: [],
  currentPlayerId: null,
  phase: 'waiting', // waiting, playing, roundEnd, gameOver
  roundNumber: 0,
  message: 'Waiting for players...',
  lastUpdate: Date.now()
};

// Our reducer to handle game state updates
function gameReducer(state: GameState, action: any): GameState {
  switch (action.type) {
    case 'JOIN_GAME':
      return {
        ...state,
        id: action.payload.gameId,
        players: action.payload.players
      };
    case 'GAME_UPDATE':
      return {
        ...state,
        ...action.payload
      };
    case 'PLAYER_ACTION':
      // Send to server, don't update local state directly
      return state;
    case 'NEW_MESSAGE':
      return {
        ...state,
        message: action.payload
      };
    case 'START_ROUND':
      return {
        ...state,
        phase: 'playing',
        roundNumber: state.roundNumber + 1,
        message: 'Round started!'
      };
    default:
      return state;
  }
}

// Provider component that wraps our application
export function GameProvider({ children, gameId = '', currentUserId = '' }: { 
  children: React.ReactNode;
  gameId?: string;
  currentUserId?: string;
}) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const { socket, isConnected } = useWebSocket(`ws://localhost:3001/game/${gameId || state.id}`);
  
  // Find current player in the game
  const currentPlayer = state.players.find(p => p.id === currentUserId) || null;
  
  useEffect(() => {
    if (!socket) return;
    
    // Listen for game updates from the server
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'game_update':
            dispatch({ type: 'GAME_UPDATE', payload: data.game });
            break;
          case 'message':
            dispatch({ type: 'NEW_MESSAGE', payload: data.message });
            break;
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    return () => {
      socket.close();
    };
  }, [socket]);
  
  // Function to send player actions to the server
  const sendAction = (actionType: string, data: any = {}) => {
    if (!socket || !isConnected) return;
    
    socket.send(JSON.stringify({
      type: 'player_action',
      action: {
        type: actionType,
        data,
        gameId: state.id,
        playerId: currentUserId
      }
    }));
  };
  
  return (
    <GameContext.Provider value={{ 
      state, 
      currentPlayer,
      dispatch, 
      sendAction, 
      isConnected 
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
