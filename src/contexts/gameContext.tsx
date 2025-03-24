import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useWebSocket } from '@hooks/useWebSocket';
import { Deck, GameState, Player } from '@game/pokerLogic';

// Define our game context interface
interface IGameContext {
  state: GameState;
  currentPlayer: Player | null;
  sendAction: (actionType: string, data?: any) => void;
  isConnected: boolean;
}

const GameContext = createContext<IGameContext | null>(null);

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
    socket.on('game_update', (data: { game: GameState }) => {
      // TODO game update
    });
            
    socket.on('chat_message', (message) => {
      // TODO chat message
    });
    
    socket.on('private_message', (message) => {
      // TODO private message
    });


    return () => {
      socket.close();
    };
  }, [socket]);
  
  // Function to send player actions to the server
  const sendAction = (actionType: string, amount?: number) => {
    if (!socket || !isConnected) return;
    
    socket.emit('player_action', state.id, {
        type: actionType,
        amount: amount
    });
      }
    }
  
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
